'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requirePlatformAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', user: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized', user: null }
  return { error: null, user }
}

export async function togglePlatformAdmin(userId: string, value: boolean) {
  const { error: authError, user } = await requirePlatformAdmin()
  if (authError || !user) return { error: authError || 'Unauthorized' }

  if (userId === user.id && !value) {
    return { error: 'Cannot remove your own admin status' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ is_platform_admin: value, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function deleteUser(userId: string) {
  const { error: authError, user } = await requirePlatformAdmin()
  if (authError || !user) return { error: authError || 'Unauthorized' }

  if (userId === user.id) {
    return { error: 'Cannot delete your own account' }
  }

  const adminClient = createAdminClient()

  // Find user's org_id and check if they're the owner
  const { data: profile } = await adminClient
    .from('profiles')
    .select('org_id, role')
    .eq('id', userId)
    .single()

  // Delete the user's organization if they are the owner
  if (profile?.org_id && profile.role === 'owner') {
    await adminClient.from('organizations').delete().eq('id', profile.org_id)
  }

  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function deactivateUser(userId: string) {
  const { error: authError, user } = await requirePlatformAdmin()
  if (authError || !user) return { error: authError || 'Unauthorized' }

  if (userId === user.id) {
    return { error: 'Cannot deactivate your own account' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: '876600h', // ~100 years
  })
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function activateUser(userId: string) {
  const { error: authError } = await requirePlatformAdmin()
  if (authError) return { error: authError }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  })
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function createAdmin(email: string, password: string, fullName: string) {
  const { error: authError } = await requirePlatformAdmin()
  if (authError) return { error: authError }

  if (!email || !password) return { error: 'Email and password are required' }
  if (password.length < 6) return { error: 'Password must be at least 6 characters' }

  const adminClient = createAdminClient()

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (error) return { error: error.message }

  // Set the user as platform admin in profiles
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({
      is_platform_admin: true,
      full_name: fullName || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.user.id)

  if (profileError) return { error: profileError.message }

  revalidatePath('/admin/users')
  return { success: true }
}
