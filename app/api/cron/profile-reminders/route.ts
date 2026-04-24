import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceRoleClient } from '@supabase/supabase-js'
import { sendCompleteProfileEmail } from '@/lib/email/service'

const CRON_SECRET = process.env.CRON_SECRET

// Reminder schedule: day 3, day 7, day 14 after registration
const REMINDER_DAYS = [3, 7, 14]

function getServiceClient() {
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(request: NextRequest) {
  // Verify cron secret — supports both CRON_SECRET and Vercel's built-in cron auth
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const now = new Date()

  // Get all approved organizations with their creation date
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name, created_at, status')
    .eq('status', 'approved')

  if (orgsError) {
    console.error('[profile-reminders] Failed to fetch orgs:', orgsError)
    return NextResponse.json({ error: orgsError.message }, { status: 500 })
  }

  let sent = 0
  let skipped = 0

  for (const org of orgs || []) {
    const daysSinceRegistration = Math.floor(
      (now.getTime() - new Date(org.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    // Check if this org is due for a reminder
    const dueReminder = REMINDER_DAYS.find(
      (day) => daysSinceRegistration >= day && daysSinceRegistration < day + 1
    )
    if (!dueReminder) {
      continue
    }

    // Check what data is missing
    const { data: narrativeDocs } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('category', 'narrative')

    const { data: budgetDocs } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('category', 'budget')

    const hasNarratives = (narrativeDocs?.length ?? 0) > 0
    const hasBudget = (budgetDocs?.length ?? 0) > 0

    // If they have both, skip
    if (hasNarratives && hasBudget) {
      skipped++
      continue
    }

    // Check if a reminder was already sent for this day
    const { data: existingReminder } = await supabase
      .from('profile_reminder_log')
      .select('id')
      .eq('org_id', org.id)
      .eq('reminder_day', dueReminder)
      .maybeSingle()

    if (existingReminder) {
      skipped++
      continue
    }

    // Get the org owner's profile (first user in the org)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('org_id', org.id)
      .limit(1)
      .single()

    if (!profile?.email) {
      skipped++
      continue
    }

    // Send the email
    try {
      await sendCompleteProfileEmail({
        toEmail: profile.email,
        fullName: profile.full_name || 'there',
        organizationName: org.name,
        missingNarratives: !hasNarratives,
        missingBudget: !hasBudget,
        daysSinceRegistration,
      })

      // Log that we sent this reminder
      await supabase.from('profile_reminder_log').insert({
        org_id: org.id,
        reminder_day: dueReminder,
        sent_to: profile.email,
      })

      sent++
      console.log(`[profile-reminders] Sent day-${dueReminder} reminder to ${profile.email} for org ${org.name}`)
    } catch (err) {
      console.error(`[profile-reminders] Failed to send to ${profile.email}:`, err)
    }
  }

  console.log(`[profile-reminders] Done. Sent: ${sent}, Skipped: ${skipped}`)
  return NextResponse.json({ sent, skipped })
}
