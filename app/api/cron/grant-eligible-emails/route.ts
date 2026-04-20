import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceRoleClient } from '@supabase/supabase-js'
import { sendGrantDigestEmail, sendGrantEligibleEmail } from '@/lib/email/service'
import { extractGrantEligibleFields } from '@/lib/email/grant-data'
import type { GrantDigestItem } from '@/lib/email/types'

const CRON_SECRET = process.env.CRON_SECRET

// Notification types that represent "this grant is eligible for review."
// Both resolve into the same digest entry per grant.
const ELIGIBILITY_TYPES = [
  'screening_completed',
  'stage_changed_pending_approval',
] as const

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

  // Pull eligibility notifications from the last 24h — the cron runs every
  // 30 min, so this is a wide safety net in case of temporary failures.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, org_id, grant_id, type, created_at')
    .in('type', ELIGIBILITY_TYPES as unknown as string[])
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[grant-eligible-digest] Failed to fetch notifications:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!notifications?.length) {
    return NextResponse.json({ digests: 0, grants: 0 })
  }

  // Skip any notification we've already covered in a previous email.
  const notifIds = notifications.map((n) => n.id)
  const { data: alreadySent } = await supabase
    .from('grant_email_log')
    .select('notification_id')
    .in('notification_id', notifIds)

  const sentSet = new Set((alreadySent || []).map((r) => r.notification_id))
  const pendingAll = notifications.filter((n) => !sentSet.has(n.id))

  if (!pendingAll.length) {
    return NextResponse.json({ digests: 0, grants: 0, skipped: notifications.length })
  }

  // Also skip notifications whose grant was already emailed via a different
  // path (manual pipeline drag, earlier digest entry keyed by a sibling type).
  const candidateGrantIds = Array.from(
    new Set(
      pendingAll
        .map((n) => n.grant_id)
        .filter((v): v is string => typeof v === 'string' && v.length > 0),
    ),
  )

  let grantsAlreadyEmailed = new Set<string>()
  if (candidateGrantIds.length) {
    const { data: priorByGrant } = await supabase
      .from('grant_email_log')
      .select('grant_id')
      .in('grant_id', candidateGrantIds)
      .gte('created_at', since)
    grantsAlreadyEmailed = new Set(
      (priorByGrant || []).map((r) => r.grant_id as string),
    )
  }

  // Deduplicate to one entry per grant_id (keep the earliest notification per grant).
  const perGrant = new Map<
    string,
    { notification_id: string; org_id: string; grant_id: string }
  >()
  for (const n of pendingAll) {
    if (!n.grant_id || !n.org_id) continue
    if (grantsAlreadyEmailed.has(n.grant_id)) continue
    if (!perGrant.has(n.grant_id)) {
      perGrant.set(n.grant_id, {
        notification_id: n.id,
        org_id: n.org_id,
        grant_id: n.grant_id,
      })
    }
  }

  if (!perGrant.size) {
    return NextResponse.json({ digests: 0, grants: 0, skipped: notifications.length })
  }

  // Group by org.
  const byOrg = new Map<
    string,
    Array<{ notification_id: string; grant_id: string }>
  >()
  for (const entry of perGrant.values()) {
    const bucket = byOrg.get(entry.org_id) ?? []
    bucket.push({ notification_id: entry.notification_id, grant_id: entry.grant_id })
    byOrg.set(entry.org_id, bucket)
  }

  // Load all grant rows in one query.
  const allGrantIds = Array.from(perGrant.keys())
  const { data: grants } = await supabase
    .from('grants')
    .select(
      'id, org_id, title, funder_name, amount, deadline, stage, screening_score, description, screening_notes, eligibility, concerns, recommendations, categories, source_url',
    )
    .in('id', allGrantIds)

  const grantsById = new Map((grants || []).map((g) => [g.id as string, g]))

  let digestsSent = 0
  let grantsCovered = 0
  let skipped = 0

  for (const [orgId, entries] of byOrg.entries()) {
    // Resolve org + owner once per digest.
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', orgId)
      .single()
    if (!org) {
      skipped += entries.length
      continue
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('org_id', orgId)
      .limit(1)
      .single()
    if (!profile?.email) {
      skipped += entries.length
      continue
    }

    // Check org profile completeness once per digest (used only for 1-grant email).
    const { data: narrativeDocs } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('category', 'narrative')
    const { data: budgetDocs } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('category', 'budget')
    const missingNarratives = (narrativeDocs?.length ?? 0) === 0
    const missingBudget = (budgetDocs?.length ?? 0) === 0

    // Keep only entries whose grant is still in an eligible stage.
    const items = entries
      .map((e) => ({ entry: e, grant: grantsById.get(e.grant_id) }))
      .filter(
        (x): x is { entry: typeof entries[number]; grant: NonNullable<ReturnType<typeof grantsById.get>> } =>
          !!x.grant &&
          (x.grant.stage === 'screening' || x.grant.stage === 'pending_approval'),
      )

    if (!items.length) {
      skipped += entries.length
      continue
    }

    try {
      if (items.length === 1) {
        // Single grant — use the rich grant-eligible email.
        const grant = items[0].grant
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
          ...extractGrantEligibleFields(grant),
          missingNarratives,
          missingBudget,
        })
      } else {
        // Multiple grants — digest.
        const digestItems: GrantDigestItem[] = items.map(({ grant }) => ({
          grantId: grant.id,
          title: grant.title,
          funderName: grant.funder_name,
          amount: grant.amount,
          deadline: grant.deadline,
          description: grant.description,
          screeningScore: grant.screening_score,
        }))
        await sendGrantDigestEmail({
          toEmail: profile.email,
          fullName: profile.full_name || 'there',
          organizationName: org.name,
          grants: digestItems,
        })
      }

      // Log every notification covered so the next cron run skips them.
      const rows = items.map(({ entry, grant }) => ({
        notification_id: entry.notification_id,
        org_id: orgId,
        grant_id: grant.id,
        sent_to: profile.email!,
      }))
      await supabase.from('grant_email_log').insert(rows)

      digestsSent++
      grantsCovered += items.length
      console.log(
        `[grant-eligible-digest] Sent ${items.length === 1 ? 'single-grant' : 'digest'} email to ${profile.email} covering ${items.length} grant(s).`,
      )
    } catch (err) {
      console.error(
        `[grant-eligible-digest] Failed to send to ${profile.email}:`,
        err,
      )
    }
  }

  console.log(
    `[grant-eligible-digest] Done. Digests: ${digestsSent}, Grants: ${grantsCovered}, Skipped: ${skipped}`,
  )
  return NextResponse.json({
    digests: digestsSent,
    grants: grantsCovered,
    skipped,
  })
}
