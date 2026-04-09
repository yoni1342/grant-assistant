import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceRoleClient } from '@supabase/supabase-js'

const CRON_SECRET = process.env.CRON_SECRET

function getServiceClient() {
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * Moves grants with past deadlines to the "closed" stage.
 * Only affects grants in pre-submission stages (discovery, screening, pending_approval).
 * Grants in drafting are left alone — teams may still be working on them.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const now = new Date().toISOString()

  // Find grants with past deadlines that are still in early pipeline stages
  const { data: expired, error: fetchError } = await supabase
    .from('grants')
    .select('id, title, org_id, stage, deadline')
    .in('stage', ['discovery', 'screening', 'pending_approval'])
    .not('deadline', 'is', null)
    .lt('deadline', now)

  if (fetchError) {
    console.error('[close-expired-grants] Failed to fetch expired grants:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch grants' }, { status: 500 })
  }

  if (!expired?.length) {
    return NextResponse.json({ closed: 0 })
  }

  const ids = expired.map((g) => g.id)

  const { error: updateError } = await supabase
    .from('grants')
    .update({ stage: 'closed' })
    .in('id', ids)

  if (updateError) {
    console.error('[close-expired-grants] Failed to update grants:', updateError)
    return NextResponse.json({ error: 'Failed to close grants' }, { status: 500 })
  }

  // Create notifications for affected orgs
  const orgGrants = new Map<string, typeof expired>()
  for (const g of expired) {
    const list = orgGrants.get(g.org_id) || []
    list.push(g)
    orgGrants.set(g.org_id, list)
  }

  const notifications = []
  for (const [orgId, grants] of orgGrants) {
    if (grants.length === 1) {
      notifications.push({
        org_id: orgId,
        grant_id: grants[0].id,
        type: 'grant_closed',
        title: 'Grant deadline passed',
        message: `"${grants[0].title}" was moved to Closed because its deadline has passed.`,
      })
    } else {
      notifications.push({
        org_id: orgId,
        type: 'grant_closed',
        title: `${grants.length} grants moved to Closed`,
        message: `${grants.length} grants were moved to Closed because their deadlines have passed.`,
      })
    }
  }

  if (notifications.length > 0) {
    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (notifError) {
      console.error('[close-expired-grants] Failed to create notifications:', notifError)
      // Don't fail the whole request — grants are already closed
    }
  }

  console.log(`[close-expired-grants] Closed ${ids.length} grant(s) across ${orgGrants.size} org(s)`)
  return NextResponse.json({ closed: ids.length, orgs: orgGrants.size })
}
