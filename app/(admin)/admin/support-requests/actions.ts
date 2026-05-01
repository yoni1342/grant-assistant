'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sanitizeError } from '@/lib/errors'

const ALLOWED_STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed'])

async function requirePlatformAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' as const }
  return { error: null }
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
