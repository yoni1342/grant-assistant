'use server'

import { createClient, createAdminClient, getUserOrgId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sanitizeError } from '@/lib/errors'

export interface CentralSearchGrant {
  id: string
  title: string
  funder_name: string | null
  organization: string | null
  amount: string | null
  deadline: string | null
  description: string | null
  source: string | null
  source_id: string | null
  source_url: string | null
  metadata: Record<string, unknown> | null
}

// Search the central grant catalog directly instead of triggering an
// n8n workflow per query. Filters out grants whose deadline has passed.
// `query` is matched against title / funder_name / description.
export async function searchCentralGrants(
  query: string,
  limit = 100,
): Promise<{ grants: CentralSearchGrant[]; error?: string }> {
  const adminDb = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  let q = adminDb
    .from('central_grants')
    .select(
      'id, title, funder_name, organization, amount, deadline, description, source, source_id, source_url, metadata',
    )
    .or(`deadline.is.null,deadline.gte.${today}`)
    .order('last_seen_at', { ascending: false })
    .limit(limit)

  const trimmed = query?.trim()
  if (trimmed) {
    // ilike on each searchable column. Postgres `or` filter syntax.
    const escaped = trimmed.replace(/[%,]/g, ' ')
    q = q.or(
      `title.ilike.%${escaped}%,funder_name.ilike.%${escaped}%,description.ilike.%${escaped}%`,
    )
  }

  const { data, error } = await q
  if (error) {
    return { grants: [], error: sanitizeError(error, 'Search failed. Please try again.') }
  }
  return { grants: (data ?? []) as CentralSearchGrant[] }
}

export async function getPipelineGrantTitles(): Promise<string[]> {
  const supabase = await createClient()
  const { orgId } = await getUserOrgId(supabase)
  if (!orgId) return []

  const adminDb = createAdminClient()
  const { data } = await adminDb
    .from('grants_full')
    .select('title')
    .eq('org_id', orgId)

  return data?.map((g) => g.title).filter((t): t is string => !!t) ?? []
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
    return { error: sanitizeError(workflowError, 'Unable to start eligibility screening. Please try again.') }
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
