'use server'

import { createClient, createAdminClient, getUserOrgId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getNarratives() {
  const supabase = await createClient()
  const { orgId, error: orgError } = await getUserOrgId(supabase)
  if (!orgId) {
    return { error: orgError || 'Not authenticated', data: [] }
  }

  const adminDb = createAdminClient()
  const { data, error } = await adminDb
    .from('documents')
    .select('*')
    .eq('org_id', orgId)
    .eq('category', 'narrative')
    .order('updated_at', { ascending: false })

  if (error) {
    return { error: error.message, data: [] }
  }

  // Map to narrative shape for UI compatibility
  const narratives = (data || []).map(doc => ({
    id: doc.id,
    org_id: doc.org_id,
    title: doc.title || doc.name || 'Untitled',
    content: doc.extracted_text || '',
    category: doc.ai_category || null,
    tags: ((doc.metadata as Record<string, unknown>)?.tags as string[]) || null,
    embedding: doc.embedding,
    metadata: doc.metadata,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  }))

  return { data: narratives, error: null }
}

export async function createNarrative(formData: FormData) {
  const supabase = await createClient()

  // Extract fields
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const category = formData.get('category') as string | null
  const tagsString = formData.get('tags') as string

  if (!title || !content) {
    return { error: 'Title and content are required' }
  }

  // Parse tags: split by comma, trim, filter empty
  const tags = tagsString
    ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    : []

  const { orgId } = await getUserOrgId(supabase)
  if (!orgId) {
    return { error: 'Not authenticated' }
  }

  const adminDb = createAdminClient()

  // Insert as document
  const { data: doc, error } = await adminDb
    .from('documents')
    .insert({
      org_id: orgId,
      title,
      name: title,
      category: 'narrative',
      ai_category: category || null,
      extracted_text: content,
      extraction_status: 'completed',
      metadata: tags.length > 0 ? { tags } : null,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Map back to narrative shape
  const narrative = {
    id: doc.id,
    org_id: doc.org_id,
    title: doc.title || '',
    content: doc.extracted_text || '',
    category: doc.ai_category || null,
    tags: ((doc.metadata as Record<string, unknown>)?.tags as string[]) || null,
    embedding: doc.embedding,
    metadata: doc.metadata,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  }

  revalidatePath('/narratives')
  return { data: narrative, error: null }
}

export async function updateNarrative(narrativeId: string, formData: FormData) {
  const supabase = await createClient()

  // Extract fields
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const category = formData.get('category') as string | null
  const tagsString = formData.get('tags') as string

  if (!title || !content) {
    return { error: 'Title and content are required' }
  }

  // Parse tags
  const tags = tagsString
    ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    : []

  const adminDb = createAdminClient()

  // Get existing document to snapshot before overwriting
  const { data: existing } = await adminDb
    .from('documents')
    .select('metadata, extracted_text, title, ai_category, org_id, version')
    .eq('id', narrativeId)
    .single()

  const existingMeta = (existing?.metadata as Record<string, unknown>) || {}
  const existingTags = (existingMeta.tags as string[]) || []
  const currentVersion = (existing?.version as number) || 1

  // Save previous version snapshot
  if (existing?.extracted_text) {
    await adminDb.from('narrative_versions').insert({
      document_id: narrativeId,
      org_id: existing.org_id,
      title: existing.title || '',
      content: existing.extracted_text,
      category: existing.ai_category || null,
      tags: existingTags.length > 0 ? JSON.stringify(existingTags) : null,
      version_number: currentVersion,
    })
  }

  // Update document with incremented version
  const { data: doc, error } = await adminDb
    .from('documents')
    .update({
      title,
      name: title,
      ai_category: category || null,
      extracted_text: content,
      metadata: { ...existingMeta, tags: tags.length > 0 ? tags : undefined },
      version: currentVersion + 1,
    })
    .eq('id', narrativeId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  const narrative = {
    id: doc.id,
    org_id: doc.org_id,
    title: doc.title || '',
    content: doc.extracted_text || '',
    category: doc.ai_category || null,
    tags: ((doc.metadata as Record<string, unknown>)?.tags as string[]) || null,
    embedding: doc.embedding,
    metadata: doc.metadata,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  }

  revalidatePath('/narratives')
  return { data: narrative, error: null }
}

export async function getNarrative(narrativeId: string) {
  const supabase = await createClient()
  const { orgId, error: orgError } = await getUserOrgId(supabase)
  if (!orgId) {
    return { error: orgError || 'Not authenticated', data: null }
  }

  const adminDb = createAdminClient()
  const { data: doc, error } = await adminDb
    .from('documents')
    .select('*')
    .eq('id', narrativeId)
    .eq('org_id', orgId)
    .eq('category', 'narrative')
    .single()

  if (error || !doc) {
    return { error: error?.message || 'Not found', data: null }
  }

  const narrative = {
    id: doc.id,
    org_id: doc.org_id,
    title: doc.title || doc.name || 'Untitled',
    content: doc.extracted_text || '',
    category: doc.ai_category || null,
    tags: ((doc.metadata as Record<string, unknown>)?.tags as string[]) || null,
    embedding: doc.embedding,
    metadata: doc.metadata,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  }

  return { data: narrative, error: null }
}

export async function deleteNarratives(narrativeIds: string[]) {
  const supabase = await createClient()
  const { orgId } = await getUserOrgId(supabase)
  if (!orgId) {
    return { error: 'Not authenticated' }
  }

  const adminDb = createAdminClient()
  const { error } = await adminDb
    .from('documents')
    .delete()
    .in('id', narrativeIds)
    .eq('org_id', orgId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/narratives')
  return { success: true }
}

export async function deleteNarrative(narrativeId: string) {
  const supabase = await createClient()

  const { orgId } = await getUserOrgId(supabase)
  if (!orgId) {
    return { error: 'Not authenticated' }
  }

  const adminDb = createAdminClient()
  const { error } = await adminDb
    .from('documents')
    .delete()
    .eq('id', narrativeId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/narratives')
  return { success: true }
}

export async function getNarrativeVersions(narrativeId: string) {
  const supabase = await createClient()
  const { orgId } = await getUserOrgId(supabase)
  if (!orgId) return []

  const adminDb = createAdminClient()
  const { data } = await adminDb
    .from('narrative_versions')
    .select('id, title, category, version_number, created_at')
    .eq('document_id', narrativeId)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(20)

  return data || []
}

export async function getNarrativeVersion(versionId: string) {
  const supabase = await createClient()
  const { orgId } = await getUserOrgId(supabase)
  if (!orgId) return null

  const adminDb = createAdminClient()
  const { data } = await adminDb
    .from('narrative_versions')
    .select('*')
    .eq('id', versionId)
    .eq('org_id', orgId)
    .single()

  return data
}

export async function restoreNarrativeVersion(narrativeId: string, versionId: string) {
  const supabase = await createClient()
  const { orgId } = await getUserOrgId(supabase)
  if (!orgId) return { error: 'Not authenticated' }

  const adminDb = createAdminClient()

  // Get the version to restore
  const { data: version } = await adminDb
    .from('narrative_versions')
    .select('*')
    .eq('id', versionId)
    .eq('org_id', orgId)
    .single()

  if (!version) return { error: 'Version not found' }

  // Snapshot current state before restoring
  const { data: current } = await adminDb
    .from('documents')
    .select('title, extracted_text, ai_category, metadata, version')
    .eq('id', narrativeId)
    .single()

  if (current?.extracted_text) {
    const currentMeta = (current.metadata as Record<string, unknown>) || {}
    await adminDb.from('narrative_versions').insert({
      document_id: narrativeId,
      org_id: orgId,
      title: current.title || '',
      content: current.extracted_text,
      category: current.ai_category || null,
      tags: (currentMeta.tags as string[])?.length ? JSON.stringify(currentMeta.tags) : null,
      version_number: (current.version as number) || 1,
    })
  }

  const restoredTags = version.tags ? (typeof version.tags === 'string' ? JSON.parse(version.tags) : version.tags) : []

  await adminDb
    .from('documents')
    .update({
      title: version.title,
      name: version.title,
      extracted_text: version.content,
      ai_category: version.category,
      metadata: { ...((current?.metadata as Record<string, unknown>) || {}), tags: restoredTags.length > 0 ? restoredTags : undefined },
      version: ((current?.version as number) || 1) + 1,
    })
    .eq('id', narrativeId)

  revalidatePath('/narratives')
  revalidatePath(`/narratives/${narrativeId}`)
  return { success: true }
}

export async function triggerAICustomization(narrativeId: string, grantId: string) {
  // Fire-and-forget: trigger n8n AI customization webhook
  if (process.env.N8N_WEBHOOK_URL) {
    fetch(`${process.env.N8N_WEBHOOK_URL}/customize-narrative`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        narrative_id: narrativeId,
        grant_id: grantId
      }),
    }).catch((err) => {
      console.error('n8n customization webhook failed:', err)
    })
  }

  return { success: true }
}
