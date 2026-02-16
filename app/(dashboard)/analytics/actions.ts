'use server'

import { createClient } from '@/lib/supabase/server'
import { calculateAvgTimeToSubmission } from '@/lib/utils/analytics'

export async function getAnalytics() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  // Get user's org_id from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return { error: 'User profile or organization not found', data: null }
  }

  // Win rate: count submissions and awards
  const { count: submissionsCount, error: submissionsError } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id)

  if (submissionsError) {
    return { error: submissionsError.message, data: null }
  }

  const { count: awardsCount, error: awardsCountError } = await supabase
    .from('awards')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id)

  if (awardsCountError) {
    return { error: awardsCountError.message, data: null }
  }

  const totalSubmissions = submissionsCount || 0
  const totalAwards = awardsCount || 0
  const winRate = totalAwards > 0 && totalSubmissions > 0
    ? Math.round((totalAwards / totalSubmissions) * 100)
    : 0

  // Pipeline value: sum of amounts for grants in active stages
  const { data: pipelineGrants, error: pipelineError } = await supabase
    .from('grants')
    .select('amount')
    .eq('org_id', profile.org_id)
    .in('stage', ['discovery', 'screening', 'drafting', 'submission'])

  if (pipelineError) {
    return { error: pipelineError.message, data: null }
  }

  const pipelineValue = (pipelineGrants || []).reduce(
    (sum, grant) => sum + (grant.amount || 0),
    0
  )

  // Total award amount: sum of all award amounts
  const { data: awards, error: awardsError } = await supabase
    .from('awards')
    .select('amount')
    .eq('org_id', profile.org_id)

  if (awardsError) {
    return { error: awardsError.message, data: null }
  }

  const totalAwardAmount = (awards || []).reduce(
    (sum, award) => sum + (award.amount || 0),
    0
  )

  // Avg time to submission: fetch grants with submissions
  const { data: grantsWithSubmissions, error: grantsError } = await supabase
    .from('grants')
    .select(`
      created_at,
      submissions (
        submitted_at
      )
    `)
    .eq('org_id', profile.org_id)

  if (grantsError) {
    return { error: grantsError.message, data: null }
  }

  const avgTimeToSubmission = calculateAvgTimeToSubmission(grantsWithSubmissions || [])

  return {
    data: {
      winRate,
      pipelineValue,
      totalSubmissions,
      totalAwards,
      totalAwardAmount,
      avgTimeToSubmission,
    },
    error: null,
  }
}

export async function getSuccessRateByFunder() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: [] }
  }

  // Get user's org_id from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return { error: 'User profile or organization not found', data: [] }
  }

  // Fetch awards with grant funder_name
  const { data: awards, error: awardsError } = await supabase
    .from('awards')
    .select(`
      id,
      grant:grants (
        funder_name
      )
    `)
    .eq('org_id', profile.org_id)

  if (awardsError) {
    return { error: awardsError.message, data: [] }
  }

  // Fetch submissions with grant funder_name
  const { data: submissions, error: submissionsError } = await supabase
    .from('submissions')
    .select(`
      id,
      grant:grants (
        funder_name
      )
    `)
    .eq('org_id', profile.org_id)

  if (submissionsError) {
    return { error: submissionsError.message, data: [] }
  }

  // Group by funder_name
  const funderMap = new Map<string, { awards: number; submissions: number }>()

  for (const award of awards || []) {
    const grant = award.grant as any
    const funderName = grant?.funder_name || 'Unknown'
    const current = funderMap.get(funderName) || { awards: 0, submissions: 0 }
    funderMap.set(funderName, { ...current, awards: current.awards + 1 })
  }

  for (const submission of submissions || []) {
    const grant = submission.grant as any
    const funderName = grant?.funder_name || 'Unknown'
    const current = funderMap.get(funderName) || { awards: 0, submissions: 0 }
    funderMap.set(funderName, { ...current, submissions: current.submissions + 1 })
  }

  // Convert to array and calculate success rate
  const result = Array.from(funderMap.entries()).map(([funderName, stats]) => ({
    funderName,
    awards: stats.awards,
    submissions: stats.submissions,
    successRate: stats.submissions > 0
      ? Math.round((stats.awards / stats.submissions) * 100)
      : 0,
  }))

  return { data: result, error: null }
}
