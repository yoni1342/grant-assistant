'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getAwards() {
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

  const { data, error } = await supabase
    .from('awards')
    .select(`
      *,
      grant:grants (
        id,
        title,
        funder_name,
        amount
      )
    `)
    .eq('org_id', profile.org_id)
    .order('award_date', { ascending: false })

  if (error) {
    return { error: error.message, data: [] }
  }

  return { data: data || [], error: null }
}

export async function getAward(awardId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  // Fetch award with grant data
  const { data: award, error: awardError } = await supabase
    .from('awards')
    .select(`
      *,
      grant:grants (
        id,
        title,
        funder_name,
        deadline,
        source_url
      )
    `)
    .eq('id', awardId)
    .single()

  if (awardError) {
    // Not found is not an error - award might not exist
    if (awardError.code === 'PGRST116') {
      return { data: null, error: null }
    }
    return { error: awardError.message, data: null }
  }

  // Fetch related reports
  const { data: reports, error: reportsError } = await supabase
    .from('reports')
    .select('*')
    .eq('award_id', awardId)
    .order('due_date', { ascending: true })

  if (reportsError) {
    return { error: reportsError.message, data: null }
  }

  return {
    data: {
      award,
      reports: reports || [],
      grant: award.grant,
    },
    error: null,
  }
}

export async function createAward(data: {
  grant_id: string
  amount: number
  award_date: string
  start_date: string
  end_date: string
  requirements?: string
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

  // Insert award record
  const { data: award, error: awardError } = await supabase
    .from('awards')
    .insert({
      org_id: profile.org_id,
      grant_id: data.grant_id,
      amount: data.amount,
      award_date: data.award_date,
      start_date: data.start_date,
      end_date: data.end_date,
      requirements: data.requirements || null,
    })
    .select()
    .single()

  if (awardError) {
    return { error: awardError.message }
  }

  // Update the grant's stage to 'awarded'
  const { error: grantError } = await supabase
    .from('grants')
    .update({ stage: 'awarded' })
    .eq('id', data.grant_id)

  if (grantError) {
    console.error('Failed to update grant stage:', grantError)
    // Don't fail the whole operation - award is created
  }

  // Fire-and-forget: trigger n8n to create reporting calendar
  if (process.env.N8N_WEBHOOK_URL) {
    fetch(`${process.env.N8N_WEBHOOK_URL}/record-award`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        award_id: award.id,
        grant_id: data.grant_id,
      }),
    }).catch((err) => {
      console.error('n8n record-award webhook failed:', err)
    })
  }

  revalidatePath('/awards')
  return { data: award, error: null }
}

export async function updateAward(
  awardId: string,
  data: {
    amount?: number
    award_date?: string
    start_date?: string
    end_date?: string
    requirements?: string
  }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('awards')
    .update(data)
    .eq('id', awardId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/awards/${awardId}`)
  return { success: true, error: null }
}

export async function deleteAward(awardId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('awards')
    .delete()
    .eq('id', awardId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/awards')
  return { success: true, error: null }
}
