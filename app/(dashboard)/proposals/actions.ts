'use server'

import { createClient, getUserOrgId } from '@/lib/supabase/server'
import { sanitizeError } from '@/lib/errors'
import { revalidatePath } from 'next/cache'

export async function getProposals() {
  const supabase = await createClient()
  const { orgId, error: orgError } = await getUserOrgId(supabase)
  if (!orgId) {
    return { error: orgError || 'Not authenticated', data: [] }
  }

  const { data, error } = await supabase
    .from('proposals')
    .select(`
      *,
      grant:grants_full (
        id,
        title,
        funder_name,
        deadline,
        eligibility
      )
    `)
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })

  if (error) {
    return { error: sanitizeError(error, 'Unable to load proposals. Please try again.'), data: [] }
  }

  return { data: data || [], error: null }
}

export async function getProposal(proposalId: string) {
  const supabase = await createClient()
  const { orgId, error: orgError } = await getUserOrgId(supabase)
  if (!orgId) {
    return { error: orgError || 'Not authenticated', data: null }
  }

  // Fetch proposal scoped to org
  const { data: proposal, error: proposalError } = await supabase
    .from('proposals')
    .select(`
      *,
      grant:grants_full (
        id,
        title,
        funder_name,
        deadline,
        description,
        amount
      )
    `)
    .eq('id', proposalId)
    .eq('org_id', orgId)
    .single()

  if (proposalError) {
    return { error: sanitizeError(proposalError, 'Unable to load proposal. Please try again.'), data: null }
  }

  // Fetch proposal sections (scoped via proposal_sections RLS through proposals)
  const { data: rawSections, error: sectionsError } = await supabase
    .from('proposal_sections')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: false })

  if (sectionsError) {
    return { error: sanitizeError(sectionsError, 'Unable to load proposal. Please try again.'), data: null }
  }

  // Deduplicate by sort_order, keeping the latest entry
  const sections = rawSections
    ? Object.values(
        rawSections.reduce((acc: Record<number, typeof rawSections[0]>, s) => {
          if (!acc[s.sort_order]) acc[s.sort_order] = s;
          return acc;
        }, {})
      ).sort((a, b) => a.sort_order - b.sort_order)
    : []

  return {
    data: {
      proposal,
      sections,
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
    return { error: sanitizeError(workflowError, 'Unable to start this workflow. Please try again.') }
  }

  // Trigger n8n workflow
  const n8nUrl = process.env.N8N_WEBHOOK_URL
  console.log('[proposal-gen] N8N_WEBHOOK_URL:', n8nUrl)
  console.log('[proposal-gen] grantId:', grantId, 'org_id:', profile.org_id)

  if (n8nUrl) {
    const fullUrl = `${n8nUrl}/generate-proposal`
    const payload = {
      grantId: grantId,
      org_id: profile.org_id,
      workflow_id: workflow.id,
    }
    console.log('[proposal-gen] Calling:', fullUrl)
    console.log('[proposal-gen] Payload:', JSON.stringify(payload))

    try {
      const resp = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
        },
        body: JSON.stringify(payload),
      })
      console.log('[proposal-gen] n8n response status:', resp.status)
      const text = await resp.text()
      console.log('[proposal-gen] n8n response body:', text.substring(0, 500))
    } catch (err) {
      console.error('[proposal-gen] n8n webhook failed:', err)
    }
  } else {
    console.log('[proposal-gen] N8N_WEBHOOK_URL not set, skipping')
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
    return { error: sanitizeError(workflowError, 'Unable to start this workflow. Please try again.') }
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
    return { error: sanitizeError(workflowError, 'Unable to start this workflow. Please try again.') }
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

    if (error) return { error: sanitizeError(error, 'Unable to save changes. Please try again.') }
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

    if (error) return { error: sanitizeError(error, 'Unable to save changes. Please try again.') }
  }

  revalidatePath(`/proposals/${proposalId}`)
  return { success: true, error: null }
}

export async function deleteProposals(proposalIds: string[]) {
  const supabase = await createClient()
  const { orgId, error: orgError } = await getUserOrgId(supabase)
  if (!orgId) {
    return { error: orgError || 'Not authenticated' }
  }

  // Delete proposal sections first (child records)
  const { error: sectionsError } = await supabase
    .from('proposal_sections')
    .delete()
    .in('proposal_id', proposalIds)

  if (sectionsError) {
    return { error: sanitizeError(sectionsError, 'Unable to delete proposal. Please try again.') }
  }

  // Delete the proposals (scoped to org)
  const { error } = await supabase
    .from('proposals')
    .delete()
    .in('id', proposalIds)
    .eq('org_id', orgId)

  if (error) {
    return { error: sanitizeError(error, 'Unable to delete proposal. Please try again.') }
  }

  revalidatePath('/proposals')
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
    .from('grants_full')
    .select('funder_name, org_id')
    .eq('id', grantId)
    .single()

  if (grantError || !grant || !grant.org_id) {
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
    return { error: sanitizeError(error, 'Unable to load funder details. Please try again.'), data: null }
  }

  return { data, error: null }
}
