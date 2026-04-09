'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sanitizeError } from '@/lib/errors'

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

  if (error) return { error: sanitizeError(error, 'Something went wrong. Please try again.') }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function deleteUser(userId: string) {
  const { error: authError, user } = await requirePlatformAdmin()
  if (authError || !user) return { error: authError || 'Unauthorized' }

  if (userId === user.id) {
    return { error: 'You cannot delete your own account.' }
  }

  const adminClient = createAdminClient()

  // Find user's org_id and check if they're the owner
  const { data: profile } = await adminClient
    .from('profiles')
    .select('org_id, role')
    .eq('id', userId)
    .single()

  const orgId = profile?.org_id

  // If user has an org, delete all org-related data first (order matters for FK constraints)
  if (orgId) {
    // 1. Delete storage files: documents
    const { data: docs } = await adminClient
      .from('documents')
      .select('file_path')
      .eq('org_id', orgId)
    if (docs && docs.length > 0) {
      const filePaths = docs.map(d => d.file_path).filter(Boolean) as string[]
      if (filePaths.length > 0) {
        await adminClient.storage.from('documents').remove(filePaths)
      }
    }

    // 2. Delete storage files: avatars for all org members
    const { data: orgProfiles } = await adminClient
      .from('profiles')
      .select('id, avatar_url')
      .eq('org_id', orgId)
    if (orgProfiles) {
      const avatarPaths = orgProfiles
        .map(p => p.avatar_url)
        .filter((url): url is string => !!url && !url.startsWith('http'))
      if (avatarPaths.length > 0) {
        await adminClient.storage.from('avatars').remove(avatarPaths)
      }
    }

    // 3. Delete child records that reference grants (proposal_sections → proposals → grants)
    const { data: proposals } = await adminClient
      .from('proposals')
      .select('id')
      .eq('org_id', orgId)
    if (proposals && proposals.length > 0) {
      const proposalIds = proposals.map(p => p.id)
      await adminClient.from('proposal_sections').delete().in('proposal_id', proposalIds)
    }

    // 4. Delete all org-scoped tables (order: children before parents)
    const orgTables = [
      'activity_log',
      'notifications',
      'workflow_executions',
      'submission_checklists',
      'submissions',
      'reports',
      'awards',
      'proposals',
      'documents',
      'grants',
      'funders',
      'search_results',
      'grant_fetch_status',
    ] as const

    for (const table of orgTables) {
      const { error: delErr } = await adminClient.from(table).delete().eq('org_id', orgId)
      if (delErr) {
        console.error(`Delete ${table} for org ${orgId} error:`, delErr.message)
      }
    }

    // 5. Clear org_id on all member profiles before deleting the org
    await adminClient.from('profiles').update({ org_id: null }).eq('org_id', orgId)

    // 6. Delete the organization
    const { error: orgError } = await adminClient.from('organizations').delete().eq('id', orgId)
    if (orgError) {
      console.error('[admin] Delete org error:', orgError.message)
      return { error: 'Failed to delete organization. Please try again.' }
    }
  }

  // Delete the profile row (if not already cascaded by auth delete)
  await adminClient.from('profiles').delete().eq('id', userId)

  // Finally, delete the auth user
  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) {
    console.error('Delete user error:', error.message)
    return { error: 'Unable to delete this user. Please try again later or contact support if the issue persists.' }
  }

  revalidatePath('/admin/users')
  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function deactivateUser(userId: string) {
  const { error: authError, user } = await requirePlatformAdmin()
  if (authError || !user) return { error: authError || 'Unauthorized' }

  if (userId === user.id) {
    return { error: 'You cannot deactivate your own account.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: '876600h', // ~100 years
  })
  if (error) {
    console.error('Deactivate user error:', error.message)
    return { error: 'Unable to deactivate this user. Please try again later or contact support if the issue persists.' }
  }

  // Automatically suspend the user's organization
  const { data: profile } = await adminClient
    .from('profiles')
    .select('org_id')
    .eq('id', userId)
    .single()

  if (profile?.org_id) {
    const { error: orgError } = await adminClient
      .from('organizations')
      .update({ status: 'suspended' })
      .eq('id', profile.org_id)
    if (orgError) {
      console.error('Auto-suspend org error:', orgError.message)
    }
  }

  revalidatePath('/admin/users')
  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function activateUser(userId: string) {
  const { error: authError } = await requirePlatformAdmin()
  if (authError) return { error: authError }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  })
  if (error) {
    console.error('Activate user error:', error.message)
    return { error: 'Unable to activate this user. Please try again later or contact support if the issue persists.' }
  }

  // Automatically unsuspend the user's organization if it was suspended
  const { data: profile } = await adminClient
    .from('profiles')
    .select('org_id')
    .eq('id', userId)
    .single()

  if (profile?.org_id) {
    const { error: orgError } = await adminClient
      .from('organizations')
      .update({ status: 'approved' })
      .eq('id', profile.org_id)
      .eq('status', 'suspended')
    if (orgError) {
      console.error('Auto-unsuspend org error:', orgError.message)
    }
  }

  revalidatePath('/admin/users')
  revalidatePath('/admin/organizations')
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

  if (error) return { error: sanitizeError(error, 'Failed to create user. Please try again.') }

  // Set the user as platform admin in profiles
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({
      is_platform_admin: true,
      full_name: fullName || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.user.id)

  if (profileError) return { error: sanitizeError(profileError, 'Failed to set up user profile. Please try again.') }

  revalidatePath('/admin/users')
  return { success: true }
}
