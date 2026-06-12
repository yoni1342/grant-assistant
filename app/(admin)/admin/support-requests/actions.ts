'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sanitizeError } from '@/lib/errors'
import { sendSupportReplyEmail } from '@/lib/email/service'
import { shortTicketRef } from '@/lib/support/ticket'

const ALLOWED_STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed'])
const REPLY_MAX = 5000

async function requirePlatformAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const, userId: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' as const, userId: null }
  return { error: null, userId: user.id }
}

export async function updateSupportRequestStatus(id: string, status: string) {
  const auth = await requirePlatformAdmin()
  if (auth.error) return { error: auth.error }

  if (!ALLOWED_STATUSES.has(status)) {
    return { error: 'Invalid status' }
  }

  const admin = createAdminClient()
  const patch: Record<string, unknown> = { status }
  patch.resolved_at = status === 'resolved' ? new Date().toISOString() : null

  const { error } = await admin
    .from('support_requests')
    .update(patch)
    .eq('id', id)

  if (error) return { error: sanitizeError(error, 'Could not update status') }

  revalidatePath('/admin/support-requests')
  return { success: true }
}

/**
 * Send an admin reply to the customer (via SES from support@fundory.ai) and log
 * it to the thread. The customer's reply threads back via the SES inbound rule.
 */
export async function replyToSupportRequest(id: string, replyText: string) {
  const auth = await requirePlatformAdmin()
  if (auth.error) return { error: auth.error }

  const text = (replyText || '').trim()
  if (!text) return { error: 'Reply cannot be empty' }
  if (text.length > REPLY_MAX) return { error: `Reply is too long (max ${REPLY_MAX} chars)` }

  const admin = createAdminClient()
  const { data: reqRow, error: reqErr } = await admin
    .from('support_requests')
    .select('id, submitter_name, submitter_email, subject')
    .eq('id', id)
    .single()

  if (reqErr || !reqRow) return { error: 'Request not found' }
  if (!reqRow.submitter_email) return { error: 'No email address on file for this request' }

  try {
    await sendSupportReplyEmail({
      toEmail: reqRow.submitter_email as string,
      fullName: (reqRow.submitter_name as string)?.trim() || 'there',
      ticketRef: shortTicketRef(reqRow.id as string),
      subject: (reqRow.subject as string) || 'your request',
      replyText: text,
    })
  } catch (e) {
    console.error('[replyToSupportRequest] send failed:', e)
    return { error: 'Could not send the email. Please try again.' }
  }

  const { error: msgErr } = await admin.from('support_messages').insert({
    request_id: id,
    direction: 'outbound',
    from_email: process.env.AWS_SES_REPLY_TO_EMAIL || 'support@fundory.ai',
    to_email: reqRow.submitter_email,
    body_text: text,
    sent_by: auth.userId,
  })
  if (msgErr) {
    // Email already went out; log but don't fail the admin's action.
    console.error('[replyToSupportRequest] thread log failed:', msgErr)
  }

  await admin
    .from('support_requests')
    .update({ status: 'in_progress', last_message_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/admin/support-requests')
  return { success: true }
}
