'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approveOrganization(orgId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Authorization check
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('organizations')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      rejection_reason: null,
    })
    .eq('id', orgId)

  if (error) return { error: error.message }

  // Trigger grant fetch workflow for the newly approved org
  if (process.env.N8N_WEBHOOK_URL) {
    const adminClient = createAdminClient()

    await adminClient.from('grant_fetch_status').upsert({
      org_id: orgId,
      status: 'searching',
      stage_message: 'Starting grant search...',
    }, { onConflict: 'org_id' })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}`
    fetch(`${process.env.N8N_WEBHOOK_URL}/fetch-grants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        org_id: orgId,
        callback_url: `${appUrl}/api/grant-fetch-status`,
        is_new_org: true,
      }),
    }).catch((err) => {
      console.error('n8n fetch-grants webhook failed:', err)
    })
  }

  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function rejectOrganization(orgId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Authorization check
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('organizations')
    .update({
      status: 'rejected',
      rejection_reason: reason || null,
    })
    .eq('id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function deleteOrganization(orgId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' }

  const adminClient = createAdminClient()

  // Find all users belonging to this org
  const { data: members } = await adminClient
    .from('profiles')
    .select('id')
    .eq('org_id', orgId)

  // Delete the organization (cascading deletes should handle related data)
  const { error } = await adminClient
    .from('organizations')
    .delete()
    .eq('id', orgId)

  if (error) {
    console.error('Delete organization error:', error.message)
    return { error: 'Unable to delete this organization. It may have related data that prevents removal. Please try again later.' }
  }

  // Delete all member auth accounts
  if (members) {
    for (const member of members) {
      const { error: userError } = await adminClient.auth.admin.deleteUser(member.id)
      if (userError) {
        console.error(`Failed to delete user ${member.id}:`, userError.message)
      }
    }
  }

  revalidatePath('/admin/organizations')
  revalidatePath('/admin/users')
  return { success: true }
}

export async function suspendOrganization(orgId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('organizations')
    .update({ status: 'suspended' })
    .eq('id', orgId)

  if (error) {
    console.error('Suspend organization error:', error.message)
    return { error: 'Unable to suspend this organization. Please try again later.' }
  }

  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function unsuspendOrganization(orgId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('organizations')
    .update({ status: 'approved' })
    .eq('id', orgId)

  if (error) {
    console.error('Unsuspend organization error:', error.message)
    return { error: 'Unable to unsuspend this organization. Please try again later.' }
  }

  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function getAdminDocumentUrl(filePath: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', url: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized', url: null }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.storage
    .from('documents')
    .createSignedUrl(filePath, 3600)

  if (error) return { error: error.message, url: null }

  return { url: data.signedUrl, error: null }
}
