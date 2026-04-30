'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceRoleClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { sanitizeError } from '@/lib/errors'
import { sendInviteMemberEmail } from '@/lib/email/service'

// ─── Profile ────────────────────────────────────────────────────────────────

export async function updateProfile(name: string, email: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Update profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: name, email, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (profileError) return { error: sanitizeError(profileError, 'Unable to update your profile. Please try again.') }

  // Update auth email if changed
  if (email !== user.email) {
    const { error: authError } = await supabase.auth.updateUser({ email })
    if (authError) return { error: sanitizeError(authError, 'Unable to update your email. Please try again.') }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return { error: 'Not authenticated' }

  // Verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (signInError) return { error: 'Current password is incorrect' }

  // Update to new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (updateError) return { error: sanitizeError(updateError, 'Unable to change your password. Please try again.') }

  return { success: true }
}

// ─── Organization ───────────────────────────────────────────────────────────

export async function updateOrganization(data: {
  name: string
  description?: string
  mission?: string
  ein?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  founding_year?: number | null
  sector?: string
  geographic_focus?: string[] | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return { error: 'No organization found' }
  if (profile.role !== 'owner' && profile.role !== 'admin') {
    return { error: 'Insufficient permissions' }
  }

  const { error } = await supabase
    .from('organizations')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', profile.org_id)

  if (error) return { error: sanitizeError(error, 'Unable to update organization settings. Please try again.') }

  revalidatePath('/settings')
  return { success: true }
}

export async function updateMemberRole(memberId: string, role: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return { error: 'No organization found' }
  if (profile.role !== 'owner' && profile.role !== 'admin') {
    return { error: 'Insufficient permissions' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('org_id', profile.org_id)

  if (error) return { error: sanitizeError(error, 'Unable to update member role. Please try again.') }

  revalidatePath('/settings')
  return { success: true }
}

export async function removeMember(memberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return { error: 'No organization found' }
  if (profile.role !== 'owner' && profile.role !== 'admin') {
    return { error: 'Insufficient permissions' }
  }
  if (memberId === user.id) return { error: 'Cannot remove yourself' }

  // RLS prevents the regular client from updating another user's profile row,
  // so the update silently affects 0 rows. Use the service-role client and
  // verify a row was actually returned.
  const serviceClient = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: updated, error } = await serviceClient
    .from('profiles')
    .update({ org_id: null, role: null, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('org_id', profile.org_id)
    .select('id')

  if (error) return { error: sanitizeError(error, 'Unable to remove member. Please try again.') }
  if (!updated || updated.length === 0) {
    return { error: 'Member not found in your organization.' }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function inviteMember(email: string, role: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return { error: 'No organization found' }
  if (profile.role !== 'owner' && profile.role !== 'admin') {
    return { error: 'Insufficient permissions' }
  }

  // Look up org name for the email
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.org_id)
    .single()

  // Service-role client to mint the invite link & write the profile row
  const serviceClient = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fundory.ai'

  // Check if an auth user already exists for this email. The `invite` link
  // type fails when the user already exists, which happens when a previously
  // removed member is re-invited (we clear org_id but don't delete auth.users).
  // Fall back to a magic-link in that case and reuse the existing user id.
  const { data: existing } = await serviceClient
    .from('profiles')
    .select('id, org_id')
    .eq('email', email)
    .maybeSingle()

  // Block re-inviting someone who's currently a member of another org.
  if (existing?.org_id && existing.org_id !== profile.org_id) {
    return { error: 'This email already belongs to a member of another organization.' }
  }

  const linkType = existing ? 'magiclink' : 'invite'
  const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
    type: linkType,
    email,
    options: {
      redirectTo: `${appUrl}/auth/set-password`,
    },
  })
  if (linkError || !linkData?.properties?.action_link) {
    return { error: sanitizeError(linkError ?? new Error('No invite link'), 'Unable to send the invitation. Please try again.') }
  }

  // Attach (or re-attach) the user to this org.
  const userId = linkData.user?.id ?? existing?.id
  if (userId) {
    await serviceClient.from('profiles').upsert({
      id: userId,
      email,
      org_id: profile.org_id,
      role,
    })
  }

  // Send our branded invite email
  const inviterName = profile.full_name || profile.email || 'A teammate'
  const orgName = org?.name || 'your organization'
  try {
    await sendInviteMemberEmail({
      toEmail: email,
      fullName: '',
      inviterName,
      organizationName: orgName,
      inviteUrl: linkData.properties.action_link,
      role,
    })
  } catch (err) {
    console.error('[inviteMember] Failed to send invite email:', err)
    return { error: 'Invitation created but email failed to send. Please try again or share the link manually.' }
  }

  revalidatePath('/settings')
  return { success: true }
}

// ─── Integrations ───────────────────────────────────────────────────────────

export async function testWebhookConnection() {
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) return { error: 'Webhook URL not configured', connected: false, latency: 0 }

  const start = Date.now()
  try {
    const response = await fetch(webhookUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    })
    const latency = Date.now() - start
    return {
      connected: response.ok,
      latency,
      status: response.status,
      error: response.ok ? null : `HTTP ${response.status}`,
    }
  } catch (err) {
    const latency = Date.now() - start
    return {
      connected: false,
      latency,
      error: err instanceof Error ? err.message : 'Connection failed',
    }
  }
}

// ─── Preferences ────────────────────────────────────────────────────────────

export async function updatePreferences(prefs: {
  theme?: 'light' | 'dark' | 'system'
  timezone?: string
  date_format?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Merge with existing preferences
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', user.id)
    .single()

  const existing = (profile?.preferences as Record<string, unknown>) || {}
  const merged = { ...existing, ...prefs }

  const { error } = await supabase
    .from('profiles')
    .update({ preferences: merged, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { error: sanitizeError(error, 'Unable to save your preferences. Please try again.') }

  revalidatePath('/settings')
  return { success: true }
}
