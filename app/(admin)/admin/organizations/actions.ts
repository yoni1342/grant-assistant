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
