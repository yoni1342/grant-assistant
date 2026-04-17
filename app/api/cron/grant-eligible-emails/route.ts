import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceRoleClient } from '@supabase/supabase-js'
import { sendGrantEligibleEmail } from '@/lib/email/service'

const CRON_SECRET = process.env.CRON_SECRET

function getServiceClient() {
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()

  // Find screening_completed notifications that haven't been emailed yet
  // Only look at notifications from the last 24 hours to avoid processing old ones
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, org_id, grant_id, title, message, created_at')
    .eq('type', 'screening_completed')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[grant-eligible-emails] Failed to fetch notifications:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!notifications?.length) {
    return NextResponse.json({ sent: 0, skipped: 0 })
  }

  // Check which ones have already been emailed
  const notifIds = notifications.map(n => n.id)
  const { data: alreadySent } = await supabase
    .from('grant_email_log')
    .select('notification_id')
    .in('notification_id', notifIds)

  const sentSet = new Set((alreadySent || []).map(r => r.notification_id))
  const pending = notifications.filter(n => !sentSet.has(n.id))

  if (!pending.length) {
    return NextResponse.json({ sent: 0, skipped: notifications.length })
  }

  let sent = 0
  let skipped = 0

  for (const notif of pending) {
    if (!notif.grant_id) {
      skipped++
      continue
    }

    // Get grant details
    const { data: grant } = await supabase
      .from('grants')
      .select('id, title, funder_name, amount, deadline, screening_score, stage')
      .eq('id', notif.grant_id)
      .single()

    if (!grant || (grant.stage !== 'pending_approval' && grant.stage !== 'screening')) {
      skipped++
      continue
    }

    // Get org details
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', notif.org_id)
      .single()

    if (!org) {
      skipped++
      continue
    }

    // Get the org owner's email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('org_id', notif.org_id)
      .limit(1)
      .single()

    if (!profile?.email) {
      skipped++
      continue
    }

    // Check if org is missing narrative/budget data
    const { data: narrativeDocs } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', notif.org_id)
      .eq('category', 'narrative')

    const { data: budgetDocs } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', notif.org_id)
      .eq('category', 'budget')

    const hasNarratives = (narrativeDocs?.length ?? 0) > 0
    const hasBudget = (budgetDocs?.length ?? 0) > 0

    try {
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
        missingNarratives: !hasNarratives,
        missingBudget: !hasBudget,
      })

      // Log so we don't send again
      await supabase.from('grant_email_log').insert({
        notification_id: notif.id,
        org_id: notif.org_id,
        grant_id: notif.grant_id,
        sent_to: profile.email,
      })

      sent++
      console.log(`[grant-eligible-emails] Sent email to ${profile.email} for grant "${grant.title}"`)
    } catch (err) {
      console.error(`[grant-eligible-emails] Failed to send to ${profile.email}:`, err)
    }
  }

  console.log(`[grant-eligible-emails] Done. Sent: ${sent}, Skipped: ${skipped}`)
  return NextResponse.json({ sent, skipped })
}
