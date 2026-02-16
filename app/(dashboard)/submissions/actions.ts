'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getSubmissionChecklist(grantId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const { data, error } = await supabase
    .from('submission_checklists')
    .select('*')
    .eq('grant_id', grantId)
    .single()

  if (error) {
    // Not found is not an error - checklist might not exist yet
    if (error.code === 'PGRST116') {
      return { data: null, error: null }
    }
    return { error: error.message, data: null }
  }

  return { data, error: null }
}

export async function generateChecklist(grantId: string) {
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
      workflow_name: 'generate-checklist',
      status: 'running',
      webhook_url: '/webhook/generate-checklist',
    })
    .select()
    .single()

  if (workflowError) {
    return { error: workflowError.message }
  }

  // Fire-and-forget: trigger n8n workflow
  if (process.env.N8N_WEBHOOK_URL) {
    fetch(`${process.env.N8N_WEBHOOK_URL}/generate-checklist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        grant_id: grantId,
        workflow_id: workflow.id,
      }),
    }).catch((err) => {
      console.error('n8n generate-checklist webhook failed:', err)
    })
  }

  return { success: true, workflowId: workflow.id }
}

export async function updateChecklistItem(
  checklistId: string,
  itemIndex: number,
  completed: boolean
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Fetch the current checklist
  const { data: checklist, error: fetchError } = await supabase
    .from('submission_checklists')
    .select('*')
    .eq('id', checklistId)
    .single()

  if (fetchError) {
    return { error: fetchError.message }
  }

  // Update the specific item in the items array
  const items = checklist.items as Array<{
    label: string
    completed: boolean
    completed_at?: string
  }>

  if (itemIndex < 0 || itemIndex >= items.length) {
    return { error: 'Invalid item index' }
  }

  items[itemIndex].completed = completed
  if (completed) {
    items[itemIndex].completed_at = new Date().toISOString()
  } else {
    delete items[itemIndex].completed_at
  }

  // Recalculate completion percentage
  const completedCount = items.filter((item) => item.completed).length
  const completion_percentage = Math.round((completedCount / items.length) * 100)

  // Update the checklist
  const { error: updateError } = await supabase
    .from('submission_checklists')
    .update({
      items,
      completion_percentage,
    })
    .eq('id', checklistId)

  if (updateError) {
    return { error: updateError.message }
  }

  // No revalidatePath - called from optimistic UI
  return { success: true, error: null }
}

export async function triggerAutoSubmission(grantId: string, portalUrl: string) {
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
      workflow_name: 'auto-submit',
      status: 'running',
      webhook_url: '/webhook/auto-submit',
    })
    .select()
    .single()

  if (workflowError) {
    return { error: workflowError.message }
  }

  // Fire-and-forget: trigger n8n workflow
  if (process.env.N8N_WEBHOOK_URL) {
    fetch(`${process.env.N8N_WEBHOOK_URL}/prepare-submission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        grant_id: grantId,
        portal_url: portalUrl,
        workflow_id: workflow.id,
      }),
    }).catch((err) => {
      console.error('n8n prepare-submission webhook failed:', err)
    })
  }

  return { success: true, workflowId: workflow.id }
}

export async function logManualSubmission(
  grantId: string,
  data: {
    confirmation_number: string
    submitted_at: string
    notes?: string
  }
) {
  const supabase = await createClient()

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

  const { error } = await supabase.from('submissions').insert({
    grant_id: grantId,
    org_id: profile.org_id,
    confirmation_number: data.confirmation_number,
    submitted_at: data.submitted_at,
    notes: data.notes || null,
    method: 'manual',
    status: 'completed',
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/submissions')
  return { success: true, error: null }
}

export async function getSubmissions(grantId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: [] }
  }

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('grant_id', grantId)
    .order('submitted_at', { ascending: false })

  if (error) {
    return { error: error.message, data: [] }
  }

  return { data: data || [], error: null }
}
