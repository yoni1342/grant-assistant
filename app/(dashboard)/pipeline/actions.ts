'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const STAGE_WORKFLOWS: Record<string, string> = {
  screening: 'screen-grant',
  drafting: 'generate-proposal',
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

  // Fire-and-forget: trigger n8n workflow
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
        org_id: profile.org_id,
        workflow_id: workflow.id,
      }),
    }).catch((err) => {
      console.error(`n8n ${webhookPath} webhook failed:`, err)
    })
  }

  revalidatePath('/pipeline')
  return { success: true, workflowId: workflow.id }
}
