'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
    const { error } = await supabase
      .from('grants')
      .update({ stage: targetStage })
      .eq('id', grantId)
      .eq('org_id', profile.org_id)

    if (error) return { error: error.message }
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

  // Clear screening data when moving from screening to drafting
  if (targetStage === 'drafting' && grant.stage === 'screening') {
    await supabase
      .from('grants')
      .update({
        screening_score: null,
        screening_notes: null,
        eligibility: null,
        recommendations: null,
        concerns: null,
      })
      .eq('id', grantId)
      .eq('org_id', profile.org_id)
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
