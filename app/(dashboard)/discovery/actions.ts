'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function triggerGrantDiscovery(query: string) {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get user's org_id from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return { error: 'User profile or organization not found' }
  }

  // Insert workflow_executions record
  const { data: workflow, error: workflowError } = await supabase
    .from('workflow_executions')
    .insert({
      org_id: profile.org_id,
      workflow_name: 'grant-discovery',
      status: 'running',
      webhook_url: '/webhook/discover-grants',
    })
    .select()
    .single()

  if (workflowError) {
    return { error: workflowError.message }
  }

  // Fire-and-forget: trigger n8n workflow
  if (process.env.N8N_WEBHOOK_URL) {
    fetch(`${process.env.N8N_WEBHOOK_URL}/discover-grants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        query,
        org_id: profile.org_id,
        workflow_id: workflow.id,
      }),
    }).catch((err) => {
      console.error('n8n discover-grants webhook failed:', err)
    })
  }

  revalidatePath('/discovery')
  return { success: true, workflowId: workflow.id }
}

export async function triggerEligibilityScreening(grantId: string) {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get user's org_id from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return { error: 'User profile or organization not found' }
  }

  // Insert workflow_executions record
  const { data: workflow, error: workflowError } = await supabase
    .from('workflow_executions')
    .insert({
      org_id: profile.org_id,
      grant_id: grantId,
      workflow_name: 'eligibility-screening',
      status: 'running',
      webhook_url: '/webhook/screen-grant',
    })
    .select()
    .single()

  if (workflowError) {
    return { error: workflowError.message }
  }

  // Fire-and-forget: trigger n8n workflow
  if (process.env.N8N_WEBHOOK_URL) {
    fetch(`${process.env.N8N_WEBHOOK_URL}/screen-grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        grant_id: grantId,
        org_id: profile.org_id,
        workflow_id: workflow.id,
      }),
    }).catch((err) => {
      console.error('n8n screen-grant webhook failed:', err)
    })
  }

  revalidatePath('/discovery')
  return { success: true, workflowId: workflow.id }
}
