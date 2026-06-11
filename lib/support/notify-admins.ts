import type { SupabaseClient } from '@supabase/supabase-js'
import { sendAdminSupportNotificationEmail } from '@/lib/email/service'
import { shortTicketRef } from './ticket'

interface NotifyAdminsParams {
  /** Service-role client (bypasses RLS for the cross-user inserts/reads). */
  admin: SupabaseClient
  requestId: string
  kind: 'new_request' | 'customer_reply'
  subject: string
  /** First chunk of the message body, shown in the alert. */
  preview: string
  submitterName: string
  submitterEmail: string
  organizationName?: string | null
  /** App origin, e.g. https://fundory.ai — used to build the admin deep link. */
  appOrigin: string
}

/**
 * Fan a support-thread alert out to EVERY platform admin: a row in
 * admin_notifications (in-app feed) plus an email to their real inbox.
 * Best-effort — callers should not block the user-facing response on this.
 */
export async function notifyAdminsOfSupportActivity({
  admin,
  requestId,
  kind,
  subject,
  preview,
  submitterName,
  submitterEmail,
  organizationName,
  appOrigin,
}: NotifyAdminsParams): Promise<void> {
  const { data: admins, error } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .eq('is_platform_admin', true)

  if (error || !admins?.length) {
    if (error) console.error('[notifyAdmins] could not load admins:', error)
    return
  }

  const ticketRef = shortTicketRef(requestId)
  const adminUrl = `${appOrigin}/admin/support-requests?id=${requestId}`
  const title =
    kind === 'customer_reply'
      ? `Customer reply · ${ticketRef}`
      : `New support request · ${ticketRef}`
  const trimmedPreview = preview.length > 280 ? preview.slice(0, 277) + '…' : preview

  // In-app feed: one row per admin.
  const rows = admins.map((a) => ({
    admin_id: a.id,
    type: 'support',
    title,
    body: trimmedPreview,
    link: `/admin/support-requests?id=${requestId}`,
    request_id: requestId,
  }))
  const { error: notifErr } = await admin.from('admin_notifications').insert(rows)
  if (notifErr) console.error('[notifyAdmins] admin_notifications insert failed:', notifErr)

  // Email each admin's real inbox.
  await Promise.all(
    admins
      .filter((a) => !!a.email)
      .map((a) =>
        sendAdminSupportNotificationEmail({
          toEmail: a.email as string,
          fullName: a.full_name?.trim() || 'there',
          ticketRef,
          subject,
          preview: trimmedPreview,
          submitterName,
          submitterEmail,
          organizationName: organizationName ?? null,
          kind,
          adminUrl,
        }).catch((e) =>
          console.error(`[notifyAdmins] email to ${a.email} failed:`, e),
        ),
      ),
  )
}
