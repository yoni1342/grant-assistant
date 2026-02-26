'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getProposals() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: [] }
  }

  const { data, error } = await supabase
    .from('proposals')
    .select(`
      *,
      grant:grants (
        id,
        title,
        funder_name,
        deadline
      )
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    return { error: error.message, data: [] }
  }

  return { data: data || [], error: null }
}

export async function getProposal(proposalId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  // Fetch proposal
  const { data: proposal, error: proposalError } = await supabase
    .from('proposals')
    .select(`
      *,
      grant:grants (
        id,
        title,
        funder_name,
        deadline,
        description,
        amount
      )
    `)
    .eq('id', proposalId)
    .single()

  if (proposalError) {
    return { error: proposalError.message, data: null }
  }

  // Fetch proposal sections
  const { data: sections, error: sectionsError } = await supabase
    .from('proposal_sections')
    .select('*')
    .eq('proposal_id', proposalId)

  if (sectionsError) {
    return { error: sectionsError.message, data: null }
  }

  return {
    data: {
      proposal,
      sections: sections || [],
      grant: proposal.grant,
    },
    error: null,
  }
}

export async function triggerProposalGeneration(grantId: string) {
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
      workflow_name: 'generate-proposal',
      status: 'running',
      webhook_url: '/webhook/generate-proposal',
    })
    .select()
    .single()

  if (workflowError) {
    return { error: workflowError.message }
  }

  // Fire-and-forget: trigger n8n workflow
  if (process.env.N8N_WEBHOOK_URL) {
    fetch(`${process.env.N8N_WEBHOOK_URL}/generate-proposal`, {
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
      console.error('n8n generate-proposal webhook failed:', err)
    })
  }

  revalidatePath('/proposals')
  return { success: true, workflowId: workflow.id }
}

export async function triggerQualityReview(proposalId: string) {
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

  // Get the proposal to find its grant_id
  const { data: proposal, error: proposalError } = await supabase
    .from('proposals')
    .select('grant_id')
    .eq('id', proposalId)
    .single()

  if (proposalError || !proposal) {
    return { error: 'Proposal not found' }
  }

  // Insert workflow_executions record
  const { data: workflow, error: workflowError } = await supabase
    .from('workflow_executions')
    .insert({
      org_id: profile.org_id,
      grant_id: proposal.grant_id,
      workflow_name: 'review-proposal',
      status: 'running',
      webhook_url: '/webhook/review-proposal',
    })
    .select()
    .single()

  if (workflowError) {
    return { error: workflowError.message }
  }

  // Fire-and-forget: trigger n8n workflow
  if (process.env.N8N_WEBHOOK_URL) {
    fetch(`${process.env.N8N_WEBHOOK_URL}/review-proposal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        proposal_id: proposalId,
        workflow_id: workflow.id,
      }),
    }).catch((err) => {
      console.error('n8n review-proposal webhook failed:', err)
    })
  }

  revalidatePath('/proposals')
  return { success: true, workflowId: workflow.id }
}

export async function triggerFunderAnalysis(
  grantId: string,
  funderName: string,
  ein?: string
) {
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
      workflow_name: 'analyze-funder',
      status: 'running',
      webhook_url: '/webhook/analyze-funder',
    })
    .select()
    .single()

  if (workflowError) {
    return { error: workflowError.message }
  }

  // Fire-and-forget: trigger n8n workflow
  if (process.env.N8N_WEBHOOK_URL) {
    fetch(`${process.env.N8N_WEBHOOK_URL}/analyze-funder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        grant_id: grantId,
        funder_name: funderName,
        ein: ein || null,
        workflow_id: workflow.id,
      }),
    }).catch((err) => {
      console.error('n8n analyze-funder webhook failed:', err)
    })
  }

  revalidatePath('/proposals')
  return { success: true, workflowId: workflow.id }
}


export async function updateProposalSections(
  proposalId: string,
  sections: {
    id: string
    title: string
    content: { chapter: string; sort_order: number }[] | null
    header1: { chapter: string; sort_order: number }[] | null
    header2: { chapter: string; sort_order: number }[] | null
    tabulation: { chapter: string; sort_order: number }[] | null
  }[],
  proposalTitle?: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Update proposal title if provided (from cover page edit)
  if (proposalTitle) {
    const { error } = await supabase
      .from('proposals')
      .update({ title: proposalTitle })
      .eq('id', proposalId)

    if (error) return { error: error.message }
  }

  for (const section of sections) {
    const { error } = await supabase
      .from('proposal_sections')
      .update({
        title: section.title,
        content: section.content,
        header1: section.header1,
        header2: section.header2,
        tabulation: section.tabulation,
      })
      .eq('id', section.id)
      .eq('proposal_id', proposalId)

    if (error) return { error: error.message }
  }

  revalidatePath(`/proposals/${proposalId}`)
  return { success: true, error: null }
}

export async function getFunder(grantId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  // Get the grant to find the funder_name
  const { data: grant, error: grantError } = await supabase
    .from('grants')
    .select('funder_name, org_id')
    .eq('id', grantId)
    .single()

  if (grantError || !grant) {
    return { error: 'Grant not found', data: null }
  }

  // Get funder for this org, optionally filtered by the grant's funder_name
  const query = supabase
    .from('funders')
    .select('*')
    .eq('org_id', grant.org_id)

  if (grant.funder_name) {
    query.eq('name', grant.funder_name)
  }

  const { data, error } = await query.single()

  if (error) {
    // Not found is not an error - funder might not exist yet
    if (error.code === 'PGRST116') {
      return { data: null, error: null }
    }
    return { error: error.message, data: null }
  }

  return { data, error: null }
}
