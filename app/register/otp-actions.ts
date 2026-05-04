'use server'

/**
 * Self-serve signup OTP flow.
 *
 *   Step 1 (account)  → requestSignupOtp({ email, password, fullName })
 *                        ↳ creates the Supabase user with email_confirm=false
 *                          (so the password is stored securely in auth, not
 *                          here), generates a 6-digit code, stores its hash
 *                          in email_otps, and emails the user.
 *   Step 2 (verify)   → verifySignupOtp({ email, code })
 *                        ↳ validates the code, marks the user confirmed via
 *                          admin.updateUserById, sets profiles.signup_step =
 *                          'plan', returns success. Client then calls
 *                          supabase.auth.signInWithPassword directly to get
 *                          a session (it still has the password in memory).
 *   Resend            → resendSignupOtp({ email })
 */
import { createHash, randomInt } from 'node:crypto'
import { createClient as createServiceRoleClient } from '@supabase/supabase-js'
import { sendSignupOtpEmail } from '@/lib/email/service'

const OTP_EXPIRY_MINUTES = 10
const MAX_ATTEMPTS = 6
const RESEND_COOLDOWN_SECONDS = 30

function getServiceClient() {
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

function hashCode(code: string): string {
  // SHA-256 with a per-deployment pepper. The codes only live ~10 min and are
  // limited to 6 attempts, so sha256 is enough — bcrypt would be overkill.
  const pepper = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  return createHash('sha256').update(code + ':' + pepper).digest('hex')
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

interface RequestArgs {
  email: string
  password: string
  fullName: string
}

interface ActionResult<T = undefined> {
  success?: boolean
  error?: string
  data?: T
}

export async function requestSignupOtp(
  args: RequestArgs,
): Promise<ActionResult<{ expiresInMinutes: number }>> {
  const email = normalizeEmail(args.email)
  const password = args.password
  const fullName = args.fullName.trim()

  if (!email || !password || !fullName) {
    return { error: 'Email, password and full name are all required.' }
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid email address.' }
  }

  const sb = getServiceClient()

  // Look up an existing user. If they're confirmed and linked to an org, the
  // email is taken; if they're unconfirmed (orphan from an abandoned attempt)
  // we re-use the row by resetting the password and re-issuing an OTP.
  const { data: { users } } = await sb.auth.admin.listUsers()
  const existing = users?.find((u) => u.email?.toLowerCase() === email)

  let userId: string
  if (existing) {
    if (existing.email_confirmed_at) {
      const { data: profile } = await sb
        .from('profiles')
        .select('org_id, agency_id')
        .eq('id', existing.id)
        .maybeSingle()
      if (profile?.org_id || profile?.agency_id) {
        return { error: 'An account with this email already exists. Please sign in.' }
      }
      // Confirmed but unlinked — recycle.
    }
    // Reset password on the existing row and reset their signup_step.
    const { error: updErr } = await sb.auth.admin.updateUserById(existing.id, {
      password,
      user_metadata: { full_name: fullName },
    })
    if (updErr) {
      console.error('[requestSignupOtp] updateUserById failed:', updErr.message)
      return { error: 'Could not start signup. Please try again.' }
    }
    userId = existing.id
  } else {
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name: fullName },
    })
    if (createErr || !created.user) {
      console.error('[requestSignupOtp] createUser failed:', createErr?.message)
      return { error: 'Could not start signup. Please try again.' }
    }
    userId = created.user.id
  }

  // Make sure the profiles row exists. Keep an existing signup_step if it's
  // already past verify_email — the user might be resuming on a new device
  // and we don't want to wipe their saved wizard progress.
  const { data: existingProfile } = await sb
    .from('profiles')
    .select('signup_step')
    .eq('id', userId)
    .maybeSingle()
  const preservedStep = existingProfile?.signup_step
  const advancedSteps = ['org_details', 'profile_mode', 'pay']
  const nextSignupStep = advancedSteps.includes(preservedStep ?? '')
    ? preservedStep
    : 'verify_email'
  const { error: profileErr } = await sb
    .from('profiles')
    .upsert({
      id: userId,
      email,
      full_name: fullName,
      signup_step: nextSignupStep,
    }, { onConflict: 'id' })
  if (profileErr) {
    console.error('[requestSignupOtp] profile upsert failed:', profileErr.message)
    // Non-fatal — the trigger may already have created the profile.
  }

  // Replace any active OTP for this email.
  await sb
    .from('email_otps')
    .update({ consumed_at: new Date().toISOString() })
    .is('consumed_at', null)
    .eq('email', email)

  const code = generateCode()
  const codeHash = hashCode(code)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()

  const { error: otpErr } = await sb.from('email_otps').insert({
    email,
    user_id: userId,
    code_hash: codeHash,
    expires_at: expiresAt,
  })
  if (otpErr) {
    console.error('[requestSignupOtp] otp insert failed:', otpErr.message)
    return { error: 'Could not send verification code. Please try again.' }
  }

  try {
    await sendSignupOtpEmail({
      toEmail: email,
      fullName,
      code,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    })
  } catch (err) {
    console.error('[requestSignupOtp] email send failed:', err)
    return { error: 'Could not deliver verification code. Please try again.' }
  }

  return { success: true, data: { expiresInMinutes: OTP_EXPIRY_MINUTES } }
}

interface VerifyArgs {
  email: string
  code: string
}

export async function verifySignupOtp(
  args: VerifyArgs,
): Promise<ActionResult> {
  const email = normalizeEmail(args.email)
  const code = args.code.trim()
  if (!email || !code) {
    return { error: 'Email and code are required.' }
  }
  if (!/^\d{6}$/.test(code)) {
    return { error: 'The code must be 6 digits.' }
  }

  const sb = getServiceClient()
  const { data: otp, error: lookupErr } = await sb
    .from('email_otps')
    .select('id, code_hash, attempts, expires_at, user_id, consumed_at')
    .eq('email', email)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lookupErr) {
    console.error('[verifySignupOtp] lookup error:', lookupErr.message)
    return { error: 'Could not verify code. Please try again.' }
  }
  if (!otp) {
    return { error: 'No active verification code. Please request a new one.' }
  }
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    return { error: 'This code has expired. Please request a new one.' }
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    return { error: 'Too many attempts. Please request a new code.' }
  }

  const submittedHash = hashCode(code)
  if (submittedHash !== otp.code_hash) {
    await sb
      .from('email_otps')
      .update({ attempts: otp.attempts + 1 })
      .eq('id', otp.id)
    return { error: 'That code is incorrect. Please try again.' }
  }

  // Mark OTP consumed
  await sb
    .from('email_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', otp.id)

  // Confirm the auth user so they can sign in with their password
  if (otp.user_id) {
    const { error: confirmErr } = await sb.auth.admin.updateUserById(otp.user_id, {
      email_confirm: true,
    })
    if (confirmErr) {
      console.error('[verifySignupOtp] confirm failed:', confirmErr.message)
      return { error: 'Could not finish verification. Please try signing in.' }
    }
    // Advance the wizard — but if the user already had progress past 'plan'
    // from an earlier device, preserve it so they resume where they stopped.
    const { data: profileRow } = await sb
      .from('profiles')
      .select('signup_step')
      .eq('id', otp.user_id)
      .maybeSingle()
    const advanced = ['org_details', 'profile_mode', 'pay']
    if (!advanced.includes(profileRow?.signup_step ?? '')) {
      await sb
        .from('profiles')
        .update({ signup_step: 'plan' })
        .eq('id', otp.user_id)
    }
  }

  return { success: true }
}

export async function resendSignupOtp(args: { email: string }): Promise<ActionResult> {
  const email = normalizeEmail(args.email)
  if (!email) return { error: 'Email is required.' }

  const sb = getServiceClient()

  // Cooldown: don't allow more than one OTP per RESEND_COOLDOWN_SECONDS.
  const { data: latest } = await sb
    .from('email_otps')
    .select('created_at, user_id, attempts')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latest) {
    const elapsed = (Date.now() - new Date(latest.created_at).getTime()) / 1000
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      return { error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed)}s before requesting another code.` }
    }
  }

  // Re-fetch the user to get full_name + ensure they exist
  const { data: { users } } = await sb.auth.admin.listUsers()
  const user = users?.find((u) => u.email?.toLowerCase() === email)
  if (!user) {
    return { error: 'No pending signup found for this email. Please start over.' }
  }
  const fullName = (user.user_metadata?.full_name as string | undefined) ?? ''

  // Invalidate old OTPs
  await sb
    .from('email_otps')
    .update({ consumed_at: new Date().toISOString() })
    .is('consumed_at', null)
    .eq('email', email)

  const code = generateCode()
  const codeHash = hashCode(code)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()

  const { error: otpErr } = await sb.from('email_otps').insert({
    email,
    user_id: user.id,
    code_hash: codeHash,
    expires_at: expiresAt,
  })
  if (otpErr) {
    console.error('[resendSignupOtp] otp insert failed:', otpErr.message)
    return { error: 'Could not send verification code. Please try again.' }
  }

  try {
    await sendSignupOtpEmail({
      toEmail: email,
      fullName,
      code,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    })
  } catch (err) {
    console.error('[resendSignupOtp] email send failed:', err)
    return { error: 'Could not deliver verification code. Please try again.' }
  }

  return { success: true }
}
