'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceRoleClient } from '@supabase/supabase-js'

interface OrgData {
  name: string
  ein?: string
  mission?: string
  sector?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  founding_year?: number | null
}

export async function registerOrganization(data: {
  fullName: string
  email: string
  password: string
  org: OrgData
}) {
  const serviceClient = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 1. Create user with email confirmed
  const { data: userData, error: userError } = await serviceClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.fullName },
  })

  if (userError) return { error: userError.message }
  if (!userData.user) return { error: 'Failed to create user' }

  const userId = userData.user.id

  // 2. Insert organization (status defaults to 'pending')
  const { data: org, error: orgError } = await serviceClient
    .from('organizations')
    .insert({ name: data.org.name, ein: data.org.ein, mission: data.org.mission, sector: data.org.sector, address: data.org.address, phone: data.org.phone, email: data.org.email, website: data.org.website, founding_year: data.org.founding_year })
    .select('id')
    .single()

  if (orgError || !org) {
    // Cleanup: delete user
    await serviceClient.auth.admin.deleteUser(userId)
    return { error: orgError?.message || 'Failed to create organization' }
  }

  // 3. Update profile with org_id + role
  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({ org_id: org.id, role: 'owner', full_name: data.fullName, email: data.email })
    .eq('id', userId)

  if (profileError) {
    // Cleanup: delete org and user
    await serviceClient.from('organizations').delete().eq('id', org.id)
    await serviceClient.auth.admin.deleteUser(userId)
    return { error: profileError.message }
  }

  return { success: true }
}

export async function registerOrganizationForExistingUser(orgData: OrgData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const serviceClient = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Insert organization
  const { data: org, error: orgError } = await serviceClient
    .from('organizations')
    .insert({ name: orgData.name, ein: orgData.ein, mission: orgData.mission, sector: orgData.sector, address: orgData.address, phone: orgData.phone, email: orgData.email, website: orgData.website, founding_year: orgData.founding_year })
    .select('id')
    .single()

  if (orgError || !org) {
    return { error: orgError?.message || 'Failed to create organization' }
  }

  // Update profile with org_id + role
  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({ org_id: org.id, role: 'owner' })
    .eq('id', user.id)

  if (profileError) {
    await serviceClient.from('organizations').delete().eq('id', org.id)
    return { error: profileError.message }
  }

  return { success: true }
}
