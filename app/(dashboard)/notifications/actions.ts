'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sanitizeError } from '@/lib/errors'

export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return { error: 'No org found' }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('org_id', profile.org_id)
    .eq('is_read', false)

  if (error) return { error: sanitizeError(error, 'Unable to mark notifications as read. Please try again.') }

  revalidatePath('/notifications')
  return { success: true }
}
