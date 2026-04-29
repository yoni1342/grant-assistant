'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceRoleClient } from '@supabase/supabase-js'
import { sendWelcomeEmail } from '@/lib/email/service'

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
  geographic_focus?: string[]
}

interface QuestionnaireData {
  annualBudget: number | null
  staffCount: number | null
  orgDescription: string
  executiveSummary: string
  missionNarrative: string
  impactNarrative: string
  methodsNarrative: string
  budgetNarrative: string
}

function getServiceClient() {
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function processQuestionnaire(
  serviceClient: ReturnType<typeof getServiceClient>,
  orgId: string,
  q: QuestionnaireData
) {
  // Update organization with additional fields
  await serviceClient.from('organizations').update({
    annual_budget: q.annualBudget,
    staff_count: q.staffCount,
    description: q.orgDescription || null,
    executive_summary: q.executiveSummary || null,
  }).eq('id', orgId)

  // Insert budget as a document record
  if (q.annualBudget || q.budgetNarrative) {
    await serviceClient.from('documents').insert({
      org_id: orgId,
      title: 'Organization Budget',
      name: 'Organization Budget',
      category: 'budget',
      extracted_text: q.budgetNarrative || null,
      extraction_status: 'completed',
      metadata: {
        total_amount: q.annualBudget,
        is_template: true,
        source: 'questionnaire',
      },
    })
  }

  // Insert narrative records as documents for non-empty entries
  const narrativeEntries = [
    { title: 'Mission', content: q.missionNarrative, ai_category: 'mission' },
    { title: 'Impact', content: q.impactNarrative, ai_category: 'impact' },
    { title: 'Methods & Approach', content: q.methodsNarrative, ai_category: 'methods' },
    { title: 'Budget Narrative', content: q.budgetNarrative, ai_category: 'budget_narrative' },
  ].filter(n => n.content.trim())

  if (narrativeEntries.length > 0) {
    await serviceClient.from('documents').insert(
      narrativeEntries.map(n => ({
        org_id: orgId,
        title: n.title,
        name: n.title,
        category: 'narrative',
        ai_category: n.ai_category,
        extracted_text: n.content,
        extraction_status: 'completed',
        metadata: { source: 'questionnaire' },
      }))
    )
  }
}

export async function checkEmailAvailable(email: string): Promise<{ available: boolean; error?: string }> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed) return { available: false, error: 'Email is required' }

  const serviceClient = getServiceClient()
  const { data: { users }, error } = await serviceClient.auth.admin.listUsers()
  if (error) {
    console.error('[checkEmailAvailable] listUsers error:', error.message)
    return { available: true }
  }

  const existingUser = users?.find((u: { email?: string }) => u.email?.toLowerCase() === trimmed)
  if (!existingUser) return { available: true }

  // If the user exists but has no org/agency, treat as orphan and allow re-use
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('org_id, agency_id')
    .eq('id', existingUser.id)
    .maybeSingle()

  if (profile?.org_id || profile?.agency_id) {
    return { available: false, error: 'An account with this email already exists. Please sign in instead.' }
  }

  return { available: true }
}

interface PrebuiltNarrative {
  ai_category: string
  title: string
  content: string
  source_url?: string | null
}

async function savePrebuiltNarratives(
  serviceClient: ReturnType<typeof getServiceClient>,
  orgId: string,
  narratives: PrebuiltNarrative[]
) {
  const rows = narratives
    .filter(n => n.content.trim())
    .map(n => ({
      org_id: orgId,
      title: n.title,
      name: n.title,
      category: 'narrative' as const,
      ai_category: n.ai_category,
      extracted_text: n.content,
      extraction_status: 'completed' as const,
      metadata: {
        source: 'website_auto',
        source_url: n.source_url || null,
        generated_at: new Date().toISOString(),
      },
    }))
  if (rows.length === 0) return
  const { error } = await serviceClient.from('documents').insert(rows)
  if (error) {
    console.error('[register] savePrebuiltNarratives error:', error.message)
  }
}

export async function registerOrganization(data: {
  fullName: string
  email: string
  password: string
  org: OrgData
  questionnaire?: QuestionnaireData | null
  plan?: string
  prebuiltNarratives?: PrebuiltNarrative[] | null
}) {
  const serviceClient = getServiceClient()

  // 1. Create user with email confirmed
  const { data: userData, error: userError } = await serviceClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.fullName },
  })

  if (userError) {
    // If user already exists, check if they have an org — if not, clean up and retry
    if (userError.message?.includes('already been registered')) {
      const { data: { users } } = await serviceClient.auth.admin.listUsers()
      const existingUser = users?.find((u: { email?: string }) => u.email === data.email)
      if (existingUser) {
        const { data: profile } = await serviceClient
          .from('profiles')
          .select('org_id')
          .eq('id', existingUser.id)
          .single()

        if (profile?.org_id) {
          return { error: 'An account with this email already exists. Please sign in instead.' }
        }

        // Orphaned user with no org — delete and recreate
        await serviceClient.auth.admin.deleteUser(existingUser.id)
        const { data: retryData, error: retryError } = await serviceClient.auth.admin.createUser({
          email: data.email,
          password: data.password,
          email_confirm: true,
          user_metadata: { full_name: data.fullName },
        })
        if (retryError || !retryData.user) {
          return { error: 'Failed to create account. Please try again.' }
        }
        // Continue with the retried user below
        Object.assign(userData as Record<string, unknown>, { user: retryData.user })
      } else {
        return { error: 'An account with this email already exists. Please sign in instead.' }
      }
    } else {
      console.error('[register] Registration error:', userError.message)
      return { error: 'Registration failed. Please try again.' }
    }
  }
  if (!userData.user) return { error: 'Failed to create account. Please try again.' }

  const userId = userData.user.id

  // 2. Insert organization (status defaults to 'pending')
  const { data: org, error: orgError } = await serviceClient
    .from('organizations')
    .insert({ name: data.org.name, ein: data.org.ein, mission: data.org.mission, sector: data.org.sector, address: data.org.address, phone: data.org.phone, email: data.org.email, website: data.org.website, founding_year: data.org.founding_year, geographic_focus: data.org.geographic_focus, plan: data.plan || 'free' })
    .select('id')
    .single()

  if (orgError || !org) {
    await serviceClient.auth.admin.deleteUser(userId)
    return { error: 'Failed to create organization. Please try again.' }
  }

  // 3. Update profile with org_id + role
  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({ org_id: org.id, role: 'owner', full_name: data.fullName, email: data.email })
    .eq('id', userId)

  if (profileError) {
    await serviceClient.from('organizations').delete().eq('id', org.id)
    await serviceClient.auth.admin.deleteUser(userId)
    return { error: 'Failed to set up your profile. Please try again.' }
  }

  // 4. Process questionnaire if provided
  if (data.questionnaire) {
    await processQuestionnaire(serviceClient, org.id, data.questionnaire)
  }

  // 4b. Save AI-generated narratives that the user reviewed before submitting
  if (data.prebuiltNarratives && data.prebuiltNarratives.length > 0) {
    await savePrebuiltNarratives(serviceClient, org.id, data.prebuiltNarratives)
  }

  // 5. Send welcome email (fire-and-forget)
  try {
    await sendWelcomeEmail({
      toEmail: data.email,
      fullName: data.fullName,
      organizationName: data.org.name,
    })
  } catch (error) {
    console.error('[registerOrganization] Failed to send welcome email:', error)
    // Don't fail registration if email fails
  }

  return { success: true, orgId: org.id, userId }
}

export async function registerOrganizationForExistingUser(data: {
  org: OrgData
  questionnaire?: QuestionnaireData | null
  plan?: string
  prebuiltNarratives?: PrebuiltNarrative[] | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const serviceClient = getServiceClient()

  // Check if user already has an organization
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.org_id) {
    return { error: 'You already have an organization. Each user can only have one organization.' }
  }

  // Insert organization
  const { data: org, error: orgError } = await serviceClient
    .from('organizations')
    .insert({ name: data.org.name, ein: data.org.ein, mission: data.org.mission, sector: data.org.sector, address: data.org.address, phone: data.org.phone, email: data.org.email, website: data.org.website, founding_year: data.org.founding_year, geographic_focus: data.org.geographic_focus, plan: data.plan || 'free' })
    .select('id')
    .single()

  if (orgError || !org) {
    if (orgError) console.error('[register] Org creation error:', orgError.message)
    return { error: 'Failed to create organization. Please try again.' }
  }

  // Upsert profile with org_id + role (handles OAuth users who may not have a profile yet)
  const { error: profileError } = await serviceClient
    .from('profiles')
    .upsert({
      id: user.id,
      org_id: org.id,
      role: 'owner',
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      email: user.email || null,
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('[register] Profile setup error:', profileError.message)
    await serviceClient.from('organizations').delete().eq('id', org.id)
    return { error: 'Failed to set up your profile. Please try again.' }
  }

  // Process questionnaire if provided
  if (data.questionnaire) {
    await processQuestionnaire(serviceClient, org.id, data.questionnaire)
  }

  // Save AI-generated narratives that the user reviewed before submitting
  if (data.prebuiltNarratives && data.prebuiltNarratives.length > 0) {
    await savePrebuiltNarratives(serviceClient, org.id, data.prebuiltNarratives)
  }

  // Send welcome email (fire-and-forget)
  try {
    // Get user's profile info
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    if (profile) {
      await sendWelcomeEmail({
        toEmail: profile.email,
        fullName: profile.full_name,
        organizationName: data.org.name,
      })
    }
  } catch (error) {
    console.error('[registerOrganizationForExistingUser] Failed to send welcome email:', error)
    // Don't fail registration if email fails
  }

  return { success: true, orgId: org.id, userId: user.id }
}

export async function registerAgency(data: {
  fullName: string
  email: string
  password: string
  agencyName: string
}) {
  const serviceClient = getServiceClient()

  // 1. Create user
  const { data: userData, error: userError } = await serviceClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.fullName },
  })

  if (userError) {
    if (userError.message?.includes('already been registered')) {
      return { error: 'An account with this email already exists. Please sign in instead.' }
    }
    console.error('[register-agency] Registration error:', userError.message)
    return { error: 'Registration failed. Please try again.' }
  }
  if (!userData.user) return { error: 'Failed to create account. Please try again.' }

  const userId = userData.user.id

  // 2. Create agency record
  const { data: agency, error: agencyError } = await serviceClient
    .from('agencies')
    .insert({ name: data.agencyName, owner_user_id: userId })
    .select('id')
    .single()

  if (agencyError || !agency) {
    await serviceClient.auth.admin.deleteUser(userId)
    return { error: 'Failed to create agency. Please try again.' }
  }

  // 3. Create a placeholder org for the agency owner (needed for auth flow)
  const { data: org, error: orgError } = await serviceClient
    .from('organizations')
    .insert({
      name: `${data.agencyName} (Agency)`,
      plan: 'agency',
      agency_id: agency.id,
      status: 'approved',
    })
    .select('id')
    .single()

  if (orgError || !org) {
    await serviceClient.from('agencies').delete().eq('id', agency.id)
    await serviceClient.auth.admin.deleteUser(userId)
    return { error: 'Failed to set up agency. Please try again.' }
  }

  // 4. Update profile with org_id, agency_id, and role
  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({ org_id: org.id, agency_id: agency.id, role: 'owner', full_name: data.fullName, email: data.email })
    .eq('id', userId)

  if (profileError) {
    await serviceClient.from('organizations').delete().eq('id', org.id)
    await serviceClient.from('agencies').delete().eq('id', agency.id)
    await serviceClient.auth.admin.deleteUser(userId)
    return { error: 'Failed to set up your profile. Please try again.' }
  }

  // 5. Send welcome email
  try {
    await sendWelcomeEmail({
      toEmail: data.email,
      fullName: data.fullName,
      organizationName: data.agencyName,
    })
  } catch (error) {
    console.error('[registerAgency] Failed to send welcome email:', error)
  }

  return { success: true, agencyId: agency.id, userId }
}

export async function registerAgencyForExistingUser(data: {
  agencyName: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const serviceClient = getServiceClient()

  // Check if user already owns an agency
  const { data: existingAgency } = await serviceClient
    .from('agencies')
    .select('id')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  if (existingAgency) {
    return { error: 'You already have an agency. Each user can only create one agency.' }
  }

  // 1. Create agency record
  const { data: agency, error: agencyError } = await serviceClient
    .from('agencies')
    .insert({ name: data.agencyName, owner_user_id: user.id })
    .select('id')
    .single()

  if (agencyError || !agency) {
    if (agencyError) console.error('[register-agency] Agency creation error:', agencyError.message)
    return { error: 'Failed to create agency. Please try again.' }
  }

  // 2. Create placeholder org
  const { data: org, error: orgError } = await serviceClient
    .from('organizations')
    .insert({
      name: `${data.agencyName} (Agency)`,
      plan: 'agency',
      agency_id: agency.id,
      status: 'approved',
    })
    .select('id')
    .single()

  if (orgError || !org) {
    await serviceClient.from('agencies').delete().eq('id', agency.id)
    return { error: 'Failed to set up agency' }
  }

  // 3. Update profile
  const { error: profileError } = await serviceClient
    .from('profiles')
    .upsert({
      id: user.id,
      org_id: org.id,
      agency_id: agency.id,
      role: 'owner',
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      email: user.email || null,
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('[register-agency] Profile setup error:', profileError.message)
    await serviceClient.from('organizations').delete().eq('id', org.id)
    await serviceClient.from('agencies').delete().eq('id', agency.id)
    return { error: 'Failed to set up your profile. Please try again.' }
  }

  // 4. Send welcome email
  try {
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()
    if (profile) {
      await sendWelcomeEmail({
        toEmail: profile.email,
        fullName: profile.full_name,
        organizationName: data.agencyName,
      })
    }
  } catch (error) {
    console.error('[registerAgencyForExistingUser] Failed to send welcome email:', error)
  }

  return { success: true, agencyId: agency.id, userId: user.id }
}

export async function uploadRegistrationDocuments(formData: FormData) {
  const serviceClient = getServiceClient()

  const orgId = formData.get('orgId') as string
  const userId = formData.get('userId') as string
  console.log('[uploadRegistrationDocuments] orgId:', orgId, 'userId:', userId)
  console.log('[uploadRegistrationDocuments] formData keys:', Array.from(formData.keys()))
  if (!orgId || !userId) {
    console.error('[uploadRegistrationDocuments] Missing orgId or userId')
    return { error: 'Missing orgId or userId' }
  }

  const narrativeFile = formData.get('narrativeFile') as File | null
  const additionalFiles = formData.getAll('additionalFiles') as File[]
  console.log('[uploadRegistrationDocuments] narrativeFile:', narrativeFile?.name, narrativeFile?.size)
  console.log('[uploadRegistrationDocuments] additionalFiles:', additionalFiles.length, additionalFiles.map(f => `${f.name}(${f.size})`))

  const allFiles: { file: File; category: string }[] = []
  if (narrativeFile && narrativeFile.size > 0) allFiles.push({ file: narrativeFile, category: 'narrative' })
  for (const f of additionalFiles) {
    if (f && f.size > 0) allFiles.push({ file: f, category: 'supporting' })
  }

  const errors: string[] = []
  console.log('[uploadRegistrationDocuments] allFiles count:', allFiles.length)

  for (const { file, category } of allFiles) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${userId}/${Date.now()}-${safeName}`
    console.log('[upload] Uploading:', file.name, 'size:', file.size, 'type:', file.type, 'path:', path)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log('[upload] Buffer size:', buffer.length)

    const { error: uploadError } = await serviceClient.storage
      .from('documents')
      .upload(path, buffer, { contentType: file.type, cacheControl: '3600', upsert: false })

    if (uploadError) {
      console.error('[upload] Storage error:', uploadError.message)
      errors.push(`Failed to upload ${file.name}: ${uploadError.message}`)
      continue
    }
    console.log('[upload] Storage upload success for:', file.name)

    const { data: docData, error: dbError } = await serviceClient
      .from('documents')
      .insert({
        org_id: orgId,
        title: file.name,
        name: file.name,
        file_path: path,
        file_type: file.type,
        file_size: file.size,
        category,
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('[upload] DB error:', dbError.message)
      errors.push(`Failed to save ${file.name}: ${dbError.message}`)
      continue
    }
    console.log('[upload] DB insert success:', docData.id)

    // Trigger n8n document processing webhook (awaited so all files get sent)
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        await fetch(`${process.env.N8N_WEBHOOK_URL}/process-document`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
          },
          body: JSON.stringify({
            document_id: docData.id,
            org_id: orgId,
            file_name: file.name,
            file_type: file.type,
            category,
          }),
        })
      } catch (err) {
        console.error('n8n document processing webhook failed:', err)
      }
    }
  }

  if (errors.length > 0) {
    return { error: errors.join('; ') }
  }

  return { success: true }
}
