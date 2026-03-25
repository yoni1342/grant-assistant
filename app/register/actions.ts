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

export async function registerOrganization(data: {
  fullName: string
  email: string
  password: string
  org: OrgData
  questionnaire?: QuestionnaireData | null
  plan?: string
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
      return { error: `Registration failed: ${userError.message}` }
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
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const serviceClient = getServiceClient()

  // Insert organization
  const { data: org, error: orgError } = await serviceClient
    .from('organizations')
    .insert({ name: data.org.name, ein: data.org.ein, mission: data.org.mission, sector: data.org.sector, address: data.org.address, phone: data.org.phone, email: data.org.email, website: data.org.website, founding_year: data.org.founding_year, geographic_focus: data.org.geographic_focus, plan: data.plan || 'free' })
    .select('id')
    .single()

  if (orgError || !org) {
    return { error: orgError?.message || 'Failed to create organization' }
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
    await serviceClient.from('organizations').delete().eq('id', org.id)
    return { error: profileError.message }
  }

  // Process questionnaire if provided
  if (data.questionnaire) {
    await processQuestionnaire(serviceClient, org.id, data.questionnaire)
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
