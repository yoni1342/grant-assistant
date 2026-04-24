'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendGrantEligibleEmail } from '@/lib/email/service'
import { extractGrantEligibleFields } from '@/lib/email/grant-data'
import { sanitizeError } from '@/lib/errors'
import { canAutoFetchGrants } from '@/lib/stripe/config'
import { beginProposalGenerationOrBlock } from '@/lib/workflow/proposal-concurrency'

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

  // Free tier is manual-only — Discovery search is the only way in, and the
  // 1-grant-per-day cap is enforced in /api/webhook/route.ts + DB trigger.
  const { data: org } = await adminClient
    .from('organizations')
    .select('plan, is_tester')
    .eq('id', orgId)
    .single()

  if (!canAutoFetchGrants(org)) {
    return
  }

  // Stamp last_grant_fetch_at so org_fetch_schedule.run_state flips to
  // 'running' immediately — this is the single source of truth the pipeline
  // banner and admin Fetch Queue both read from.
  await adminClient
    .from('organizations')
    .update({ last_grant_fetch_at: new Date().toISOString() })
    .eq('id', orgId)

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
      .from('grants_full')
      .select(
        'title, funder_name, amount, deadline, screening_score, description, screening_notes, screening_result, concerns, recommendations, categories, source_url',
      )
      .eq('id', grantId)
      .eq('org_id', profile.org_id)
      .single()

    const { error } = await supabase
      .from('grants')
      .update({ stage: targetStage })
      .eq('id', grantId)
      .eq('org_id', profile.org_id)

    if (error) return { error: sanitizeError(error, 'Unable to move this grant. Please try again.') }

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
          grantTitle: grant.title ?? 'Untitled Grant',
          funderName: grant.funder_name,
          amount: grant.amount,
          deadline: grant.deadline,
          screeningScore: grant.screening_score,
          ...extractGrantEligibleFields(grant),
          missingNarratives: (narrativeDocs?.length ?? 0) === 0,
          missingBudget: (budgetDocs?.length ?? 0) === 0,
        })
          .then(() =>
            // Log so the 30-min digest cron doesn't also email this grant.
            adminClient.from('grant_email_log').insert({
              notification_id: `manual:${grantId}`,
              org_id: profile.org_id,
              grant_id: grantId,
              sent_to: userProfile.email!,
            }),
          )
          .catch((err) => {
            console.error('[triggerStageWorkflow] Failed to send grant eligible email:', err)
          })
      }
    }

    revalidatePath('/pipeline')
    return { success: true }
  }

  // Fetch grant data to send to workflow — grants_full includes
  // title/funder_name/etc. that n8n workflows still expect in the payload.
  const { data: grant } = await supabase
    .from('grants_full')
    .select('*')
    .eq('id', grantId)
    .eq('org_id', profile.org_id)
    .single()

  if (!grant) {
    return { error: 'Grant not found' }
  }

  // Persist the stage change immediately so the UI is consistent on refresh.
  // The workflow may later transition the grant further (e.g. screening → pending_approval),
  // but until it does the grant should stay on the stage the user dropped it on.
  const { error: stageUpdateError } = await supabase
    .from('grants')
    .update({ stage: targetStage })
    .eq('id', grantId)
    .eq('org_id', profile.org_id)

  if (stageUpdateError) {
    return { error: sanitizeError(stageUpdateError, 'Unable to move this grant. Please try again.') }
  }

  // Insert workflow execution record. For proposal generation, gate on the
  // per-org concurrency cap; other stage workflows (screen-grant) still use
  // a direct insert since they're throttled by the screening queue upstream.
  let workflowId: string
  if (webhookPath === 'generate-proposal') {
    const claim = await beginProposalGenerationOrBlock(supabase, profile.org_id, grantId)
    if (claim.blocked) {
      return { error: claim.error }
    }
    workflowId = claim.workflowId
  } else {
    const { data: workflow, error: workflowError } = await supabase
      .from('workflow_executions')
      .insert({
        org_id: profile.org_id,
        grant_id: grantId,
        workflow_name: webhookPath,
        status: 'running',
        webhook_url: `/webhook/${webhookPath}`,
      })
      .select('id')
      .single()

    if (workflowError || !workflow) {
      return { error: sanitizeError(workflowError, 'Unable to start the workflow. Please try again.') }
    }
    workflowId = workflow.id
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
        workflow_id: workflowId,
        grantData: grant,
      }),
    }).catch((err) => {
      console.error(`n8n ${webhookPath} webhook failed:`, err)
    })
  }

  revalidatePath('/pipeline')
  return { success: true, workflowId }
}
