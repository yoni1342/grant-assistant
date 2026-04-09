'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export async function completeAgencySetup(formData: { name: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) return { error: 'No agency found for your account.' }

  if (!formData.name.trim()) return { error: 'Agency name is required.' }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('agencies')
    .update({
      name: formData.name.trim(),
      setup_complete: true,
    })
    .eq('id', profile.agency_id)

  if (error) return { error: 'Failed to save agency details. Please try again.' }

  // Clear the profile cache so middleware picks up the new setup_complete value
  const cookieStore = await cookies()
  cookieStore.delete('x-profile-cache')

  revalidatePath('/agency')
  return { success: true }
}
