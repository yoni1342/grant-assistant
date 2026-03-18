'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendOrganizationApprovedEmail, sendOrganizationRejectedEmail } from '@/lib/email/service'

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

  const approvedAt = new Date().toISOString()

  const { error } = await supabase
    .from('organizations')
    .update({
      status: 'approved',
      approved_at: approvedAt,
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

  // Send approval email
  try {
    // Fetch org and owner details for email
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('org_id', orgId)
      .eq('role', 'owner')
      .single()

    if (org && ownerProfile) {
      await sendOrganizationApprovedEmail({
        toEmail: ownerProfile.email,
        fullName: ownerProfile.full_name,
        organizationName: org.name,
        approvedAt,
      })
    }
  } catch (error) {
    console.error('[approveOrganization] Failed to send approval email:', error)
    // Don't fail approval if email fails
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

  const rejectedAt = new Date().toISOString()

  const { error } = await supabase
    .from('organizations')
    .update({
      status: 'rejected',
      rejection_reason: reason || null,
    })
    .eq('id', orgId)

  if (error) return { error: error.message }

  // Send rejection email
  try {
    // Fetch org and owner details for email
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('org_id', orgId)
      .eq('role', 'owner')
      .single()

    if (org && ownerProfile) {
      await sendOrganizationRejectedEmail({
        toEmail: ownerProfile.email,
        fullName: ownerProfile.full_name,
        organizationName: org.name,
        rejectionReason: reason,
        rejectedAt,
      })
    }
  } catch (error) {
    console.error('[rejectOrganization] Failed to send rejection email:', error)
    // Don't fail rejection if email fails
  }

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

  // Delete all associated data in dependency order, keeping user accounts.

  // 1. Delete proposal_sections (depends on proposals)
  const { data: proposals } = await adminClient
    .from('proposals')
    .select('id')
    .eq('org_id', orgId)

  if (proposals && proposals.length > 0) {
    const proposalIds = proposals.map((p) => p.id)
    await adminClient
      .from('proposal_sections')
      .delete()
      .in('proposal_id', proposalIds)
  }

  // 2. Delete reports (depends on awards)
  await adminClient.from('reports').delete().eq('org_id', orgId)

  // 3. Delete remaining org-owned tables (no child dependencies)
  await adminClient.from('proposals').delete().eq('org_id', orgId)
  await adminClient.from('awards').delete().eq('org_id', orgId)
  await adminClient.from('submissions').delete().eq('org_id', orgId)
  await adminClient.from('submission_checklists').delete().eq('org_id', orgId)
  await adminClient.from('workflow_executions').delete().eq('org_id', orgId)
  await adminClient.from('activity_log').delete().eq('org_id', orgId)
  await adminClient.from('notifications').delete().eq('org_id', orgId)
  await adminClient.from('documents').delete().eq('org_id', orgId)
  await adminClient.from('funders').delete().eq('org_id', orgId)
  await adminClient.from('search_results').delete().eq('org_id', orgId)
  await adminClient.from('grant_fetch_status').delete().eq('org_id', orgId)
  await adminClient.from('grants').delete().eq('org_id', orgId)

  // 4. Disassociate users from the org (keep their accounts)
  await adminClient
    .from('profiles')
    .update({ org_id: null })
    .eq('org_id', orgId)

  // 5. Delete the organization itself
  const { error } = await adminClient
    .from('organizations')
    .delete()
    .eq('id', orgId)

  if (error) {
    console.error('Delete organization error:', error.message)
    return { error: 'Unable to delete this organization. Please try again later.' }
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
