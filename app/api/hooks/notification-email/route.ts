import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceRoleClient } from '@supabase/supabase-js'
import { sendProposalReadyEmail } from '@/lib/email/service'

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

  // Eligibility events (screening_completed, stage_changed_pending_approval) are
  // now batched into a 30-minute digest by /api/cron/grant-eligible-emails,
  // so we deliberately do NOT fire an email here. The notification still lives
  // in the DB and the cron will pick it up.
  if (
    record.type === 'screening_completed' ||
    record.type === 'stage_changed_pending_approval'
  ) {
    return NextResponse.json({
      skipped: true,
      reason: 'deferred to grant-eligible digest cron',
    })
  }

  // Only proposal-generated still fires a direct email here.
  if (record.type !== 'proposal_generated') {
    return NextResponse.json({ skipped: true, reason: 'unhandled notification type' })
  }

  if (!record.grant_id) {
    return NextResponse.json({ skipped: true, reason: 'no grant_id' })
  }

  const supabase = getServiceClient()

  // Dedup by notification id.
  const dedupId = record.id
  const { data: existing } = await supabase
    .from('grant_email_log')
    .select('id')
    .eq('notification_id', dedupId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ skipped: true, reason: 'already sent' })
  }

  const { data: grant } = await supabase
    .from('grants_full')
    .select('id, title, org_id')
    .eq('id', record.grant_id)
    .single()

  if (!grant) {
    return NextResponse.json({ skipped: true, reason: 'grant not found' })
  }

  const orgId = record.org_id || grant.org_id
  if (!orgId) {
    return NextResponse.json({ skipped: true, reason: 'missing org_id' })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .single()

  if (!org) {
    return NextResponse.json({ skipped: true, reason: 'org not found' })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('org_id', orgId)
    .limit(1)
    .single()

  if (!profile?.email) {
    return NextResponse.json({ skipped: true, reason: 'no profile email' })
  }

  try {
    if (!grant.id) {
      return NextResponse.json({ skipped: true, reason: 'grant id missing' })
    }
    const { data: proposal } = await supabase
      .from('proposals')
      .select('id')
      .eq('grant_id', grant.id)
      .eq('org_id', orgId)
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
      grantTitle: grant.title ?? 'Untitled Grant',
    })

    await supabase.from('grant_email_log').insert({
      notification_id: dedupId,
      org_id: orgId,
      grant_id: record.grant_id,
      sent_to: profile.email,
    })

    console.log(
      `[notification-email] Sent proposal ready email to ${profile.email} for "${grant.title}"`,
    )
    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('[notification-email] Failed:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
