'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getReports(awardId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: [] }
  }

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('award_id', awardId)
    .order('due_date', { ascending: true })

  if (error) {
    return { error: error.message, data: [] }
  }

  return { data: data || [], error: null }
}

export async function getReport(reportId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  // Fetch report with award and grant joins
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select(`
      *,
      award:awards (
        id,
        amount,
        award_date,
        start_date,
        end_date,
        grant:grants (
          id,
          title,
          funder_name
        )
      )
    `)
    .eq('id', reportId)
    .single()

  if (reportError) {
    // Not found is not an error - report might not exist
    if (reportError.code === 'PGRST116') {
      return { data: null, error: null }
    }
    return { error: reportError.message, data: null }
  }

  return { data: report, error: null }
}

export async function createReport(data: {
  award_id: string
  grant_id: string
  report_type: 'interim' | 'final'
  title: string
  due_date: string
}) {
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

  // Insert report with status 'draft'
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .insert({
      org_id: profile.org_id,
      award_id: data.award_id,
      grant_id: data.grant_id,
      report_type: data.report_type,
      title: data.title,
      due_date: data.due_date,
      status: 'draft',
    })
    .select()
    .single()

  if (reportError) {
    return { error: reportError.message }
  }

  return { data: report, error: null }
}

export async function updateReport(
  reportId: string,
  data: {
    title?: string
    content?: string
    status?: string
  }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('reports')
    .update(data)
    .eq('id', reportId)

  if (error) {
    return { error: error.message }
  }

  // Skip revalidatePath when only content changes (autosave pattern)
  // Call revalidatePath when status changes
  if (data.status !== undefined) {
    revalidatePath(`/awards/reports/${reportId}`)
  }

  return { success: true, error: null }
}

export async function deleteReport(reportId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', reportId)

  if (error) {
    return { error: error.message }
  }

  return { success: true, error: null }
}

export async function triggerReportGeneration(awardId: string, reportId: string) {
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

  // Get the award to find its grant_id
  const { data: award, error: awardError } = await supabase
    .from('awards')
    .select('grant_id')
    .eq('id', awardId)
    .single()

  if (awardError || !award) {
    return { error: 'Award not found' }
  }

  // Insert workflow_executions record
  const { data: workflow, error: workflowError } = await supabase
    .from('workflow_executions')
    .insert({
      org_id: profile.org_id,
      grant_id: award.grant_id,
      workflow_name: 'report_generation',
      status: 'running',
      webhook_url: '/webhook/draft-report',
      metadata: {
        award_id: awardId,
        report_id: reportId,
      },
    })
    .select()
    .single()

  if (workflowError) {
    return { error: workflowError.message }
  }

  // Fire-and-forget: trigger n8n workflow
  if (process.env.N8N_WEBHOOK_URL) {
    fetch(`${process.env.N8N_WEBHOOK_URL}/draft-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        execution_id: workflow.id,
        award_id: awardId,
        report_id: reportId,
      }),
    }).catch((err) => {
      console.error('n8n draft-report webhook failed:', err)
    })
  }

  return { workflowId: workflow.id }
}
