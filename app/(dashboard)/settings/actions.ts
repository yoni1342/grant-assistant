'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceRoleClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

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

  if (profileError) return { error: profileError.message }

  // Update auth email if changed
  if (email !== user.email) {
    const { error: authError } = await supabase.auth.updateUser({ email })
    if (authError) return { error: authError.message }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File
  if (!file || !file.name) return { error: 'No file provided' }

  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Invalid file type. Only PNG, JPEG, and WebP are allowed.' }
  }
  if (file.size > 2 * 1024 * 1024) {
    return { error: 'File too large. Maximum size is 2MB.' }
  }

  const ext = file.name.split('.').pop()
  const filePath = `${user.id}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { contentType: file.type, upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  // Append cache-bust to force re-fetch
  const avatarUrl = `${publicUrl}?t=${Date.now()}`

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  revalidatePath('/settings')
  return { success: true, url: avatarUrl }
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
  if (updateError) return { error: updateError.message }

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

  const { error } = await supabase
    .from('organizations')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', profile.org_id)

  if (error) return { error: error.message }

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

  if (error) return { error: error.message }

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

  const { error } = await supabase
    .from('profiles')
    .update({ org_id: null, role: null, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('org_id', profile.org_id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function inviteMember(email: string, role: string) {
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

  // Use service-role client for admin invite
  const serviceClient = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email)
  if (inviteError) return { error: inviteError.message }

  // Create profile for invited user
  if (inviteData.user) {
    await serviceClient.from('profiles').upsert({
      id: inviteData.user.id,
      email,
      org_id: profile.org_id,
      role,
    })
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

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}
