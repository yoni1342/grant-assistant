'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendGrantEligibleEmail } from '@/lib/email/service'

const STAGE_WORKFLOWS: Record<string, string> = {
  screening: 'screen-grant',
  drafting: 'generate-proposal',
}

export async function triggerFetchGrants(orgId: string) {
  const n8nUrl = process.env.N8N_WEBHOOK_URL
  if (!n8nUrl) {
    console.error('[auto-fetch-grants] N8N_WEBHOOK_URL not configured')
    return
  }

  const adminClient = createAdminClient()

  // Insert a fetch status row so the banner shows immediately
  await adminClient
    .from('grant_fetch_status')
    .upsert(
      {
        org_id: orgId,
        status: 'searching',
        stage_message: 'Automatically fetching grants for your organization…',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id' },
    )

  // Fire-and-forget: trigger the n8n fetch-grants workflow
  fetch(`${n8nUrl}/fetch-grants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
    },
    body: JSON.stringify({ org_id: orgId }),
  }).catch((err) => {
    console.error('[auto-fetch-grants] Webhook failed:', err)
  })
}

export async function triggerStageWorkflow(grantId: string, targetStage: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return { error: 'User profile or organization not found' }
  }

  const webhookPath = STAGE_WORKFLOWS[targetStage]

  if (!webhookPath) {
    // No workflow for this stage transition — just update the stage directly
    const adminClient = createAdminClient()

    const { data: grant } = await adminClient
      .from('grants')
      .select('title, funder_name, amount, deadline, screening_score')
      .eq('id', grantId)
      .eq('org_id', profile.org_id)
      .single()

    const { error } = await supabase
      .from('grants')
      .update({ stage: targetStage })
      .eq('id', grantId)
      .eq('org_id', profile.org_id)

    if (error) return { error: error.message }

    // Send email when grant moves to pending_approval
    if (targetStage === 'pending_approval' && grant) {
      const { data: org } = await adminClient
        .from('organizations')
        .select('name')
        .eq('id', profile.org_id)
        .single()

      const { data: userProfile } = await adminClient
        .from('profiles')
        .select('full_name, email')
        .eq('org_id', profile.org_id)
        .limit(1)
        .single()

      if (userProfile?.email && org) {
        const { data: narrativeDocs } = await adminClient
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', profile.org_id)
          .eq('category', 'narrative')

        const { data: budgetDocs } = await adminClient
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', profile.org_id)
          .eq('category', 'budget')

        sendGrantEligibleEmail({
          toEmail: userProfile.email,
          fullName: userProfile.full_name || 'there',
          organizationName: org.name,
          grantId,
          grantTitle: grant.title,
          funderName: grant.funder_name,
          amount: grant.amount,
          deadline: grant.deadline,
          screeningScore: grant.screening_score,
          missingNarratives: (narrativeDocs?.length ?? 0) === 0,
          missingBudget: (budgetDocs?.length ?? 0) === 0,
        }).catch((err) => {
          console.error('[triggerStageWorkflow] Failed to send grant eligible email:', err)
        })
      }
    }

    revalidatePath('/pipeline')
    return { success: true }
  }

  // Fetch grant data to send to workflow
  const { data: grant } = await supabase
    .from('grants')
    .select('*')
    .eq('id', grantId)
    .eq('org_id', profile.org_id)
    .single()

  if (!grant) {
    return { error: 'Grant not found' }
  }

  // Insert workflow execution record
  const { data: workflow, error: workflowError } = await supabase
    .from('workflow_executions')
    .insert({
      org_id: profile.org_id,
      grant_id: grantId,
      workflow_name: webhookPath,
      status: 'running',
      webhook_url: `/webhook/${webhookPath}`,
    })
    .select()
    .single()

  if (workflowError) {
    return { error: workflowError.message }
  }

  // Clear screening data when moving to drafting from screening or pending_approval
  if (targetStage === 'drafting' && (grant.stage === 'screening' || grant.stage === 'pending_approval')) {
    // Don't clear screening data — keep it for reference in drafting report
  }

  // Fire-and-forget: trigger n8n workflow (notifications are created by the n8n workflows directly)
  const n8nUrl = process.env.N8N_WEBHOOK_URL
  if (n8nUrl) {
    fetch(`${n8nUrl}/${webhookPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        grant_id: grantId,
        grantId: grantId,
        grant_name: grant.title,
        org_id: profile.org_id,
        workflow_id: workflow.id,
        grantData: grant,
      }),
    }).catch((err) => {
      console.error(`n8n ${webhookPath} webhook failed:`, err)
    })
  }

  revalidatePath('/pipeline')
  return { success: true, workflowId: workflow.id }
}
