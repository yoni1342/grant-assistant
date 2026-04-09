import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceRoleClient } from '@supabase/supabase-js'
import { sendGrantEligibleEmail, sendProposalReadyEmail } from '@/lib/email/service'

const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET

function getServiceClient() {
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = request.headers.get('x-webhook-secret')
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Supabase webhook payload: { type: 'INSERT', table: 'notifications', record: {...}, ... }
  const record = body.record
  if (!record) {
    return NextResponse.json({ error: 'No record in payload' }, { status: 400 })
  }

  // Only process screening_completed and proposal_generated notifications
  if (record.type !== 'screening_completed' && record.type !== 'proposal_generated') {
    return NextResponse.json({ skipped: true, reason: 'unhandled notification type' })
  }

  if (!record.grant_id) {
    return NextResponse.json({ skipped: true, reason: 'no grant_id' })
  }

  const supabase = getServiceClient()

  // Check if already emailed
  const { data: existing } = await supabase
    .from('grant_email_log')
    .select('id')
    .eq('notification_id', record.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ skipped: true, reason: 'already sent' })
  }

  // Get grant details
  const { data: grant } = await supabase
    .from('grants')
    .select('id, title, funder_name, amount, deadline, screening_score, stage')
    .eq('id', record.grant_id)
    .single()

  if (!grant) {
    return NextResponse.json({ skipped: true, reason: 'grant not found' })
  }

  // Get org
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', record.org_id)
    .single()

  if (!org) {
    return NextResponse.json({ skipped: true, reason: 'org not found' })
  }

  // Get org owner
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('org_id', record.org_id)
    .limit(1)
    .single()

  if (!profile?.email) {
    return NextResponse.json({ skipped: true, reason: 'no profile email' })
  }

  try {
    if (record.type === 'proposal_generated') {
      // Look up the proposal ID from the grant
      const { data: proposal } = await supabase
        .from('proposals')
        .select('id')
        .eq('grant_id', grant.id)
        .eq('org_id', record.org_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!proposal) {
        return NextResponse.json({ skipped: true, reason: 'proposal not found for grant' })
      }

      await sendProposalReadyEmail({
        toEmail: profile.email,
        fullName: profile.full_name || 'there',
        organizationName: org.name,
        proposalId: proposal.id,
        grantTitle: grant.title,
      })

      await supabase.from('grant_email_log').insert({
        notification_id: record.id,
        org_id: record.org_id,
        grant_id: record.grant_id,
        sent_to: profile.email,
      })

      console.log(`[notification-email] Sent proposal ready email to ${profile.email} for "${grant.title}"`)
      return NextResponse.json({ sent: true })
    }

    // screening_completed — only email if grant is pending_approval
    if (grant.stage !== 'pending_approval') {
      return NextResponse.json({ skipped: true, reason: 'grant not pending_approval' })
    }

    // Check missing data
    const { data: narrativeDocs } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', record.org_id)
      .eq('category', 'narrative')

    const { data: budgetDocs } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', record.org_id)
      .eq('category', 'budget')

    await sendGrantEligibleEmail({
      toEmail: profile.email,
      fullName: profile.full_name || 'there',
      organizationName: org.name,
      grantId: grant.id,
      grantTitle: grant.title,
      funderName: grant.funder_name,
      amount: grant.amount,
      deadline: grant.deadline,
      screeningScore: grant.screening_score,
      missingNarratives: (narrativeDocs?.length ?? 0) === 0,
      missingBudget: (budgetDocs?.length ?? 0) === 0,
    })

    await supabase.from('grant_email_log').insert({
      notification_id: record.id,
      org_id: record.org_id,
      grant_id: record.grant_id,
      sent_to: profile.email,
    })

    console.log(`[notification-email] Sent grant eligible email to ${profile.email} for "${grant.title}"`)
    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('[notification-email] Failed:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
