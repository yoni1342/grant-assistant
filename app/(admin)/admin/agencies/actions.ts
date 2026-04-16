'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sanitizeError } from '@/lib/errors'

export async function deleteAgency(agencyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' }

  const adminClient = createAdminClient()

  // Unlink all orgs from this agency
  await adminClient
    .from('organizations')
    .update({ agency_id: null })
    .eq('agency_id', agencyId)

  // Unlink all profiles from this agency
  await adminClient
    .from('profiles')
    .update({ agency_id: null })
    .eq('agency_id', agencyId)

  // Delete the agency
  const { error } = await adminClient
    .from('agencies')
    .delete()
    .eq('id', agencyId)

  if (error) return { error: sanitizeError(error, 'Failed to delete agency.') }

  revalidatePath('/admin/agencies')
  revalidatePath('/admin/organizations')
  return { success: true }
}

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' }
  return { user }
}

export async function suspendAgency(agencyId: string) {
  const auth = await verifyAdmin()
  if ('error' in auth && auth.error) return { error: auth.error }

  const adminClient = createAdminClient()

  // Suspend the agency
  const { error } = await adminClient
    .from('agencies')
    .update({ subscription_status: 'suspended' })
    .eq('id', agencyId)

  if (error) return { error: sanitizeError(error, 'Failed to suspend agency.') }

  // Suspend all orgs under this agency
  await adminClient
    .from('organizations')
    .update({ status: 'suspended' })
    .eq('agency_id', agencyId)

  revalidatePath('/admin/agencies')
  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function unsuspendAgency(agencyId: string) {
  const auth = await verifyAdmin()
  if ('error' in auth && auth.error) return { error: auth.error }

  const adminClient = createAdminClient()

  // Reactivate the agency
  const { error } = await adminClient
    .from('agencies')
    .update({ subscription_status: 'active' })
    .eq('id', agencyId)

  if (error) return { error: sanitizeError(error, 'Failed to unsuspend agency.') }

  // Reactivate all orgs under this agency
  await adminClient
    .from('organizations')
    .update({ status: 'approved' })
    .eq('agency_id', agencyId)

  revalidatePath('/admin/agencies')
  revalidatePath('/admin/organizations')
  return { success: true }
}
