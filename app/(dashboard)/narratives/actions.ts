'use server'

import { createClient, createAdminClient, getUserOrgId } from '@/lib/supabase/server'
import { sanitizeError } from '@/lib/errors'
import { revalidatePath } from 'next/cache'
import { uploadFile, deleteFile } from '@/lib/supabase/storage'

const NARRATIVE_UPLOAD_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'text/plain',
]
const NARRATIVE_UPLOAD_MAX_SIZE = 25 * 1024 * 1024 // 25MB

export async function uploadNarrativeFile(formData: FormData) {
  const supabase = await createClient()

  const file = formData.get('file') as File
  if (!file || !file.name) return { error: 'No file provided' }
  if (!NARRATIVE_UPLOAD_TYPES.includes(file.type)) {
    return { error: 'Invalid file type. Allowed: PDF, DOCX, XLSX, PPTX, PNG, JPG, TXT.' }
  }
  if (file.size > NARRATIVE_UPLOAD_MAX_SIZE) {
    return { error: 'File too large. Maximum size is 25MB.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { orgId } = await getUserOrgId(supabase)
  if (!orgId) return { error: 'Organization not found' }

  const aiCategory = ((formData.get('category') as string) || '').trim() || null
  const tagsString = (formData.get('tags') as string) || ''
  const tags = tagsString
    ? tagsString.split(',').map((t) => t.trim()).filter(Boolean)
    : []

  const titleOverride = ((formData.get('title') as string) || '').trim()
  const title = titleOverride || file.name

  const { path, error: uploadError } = await uploadFile(file, user.id)
  if (uploadError) return { error: uploadError }

  const adminDb = createAdminClient()
  const { data: doc, error: dbError } = await adminDb
    .from('documents')
    .insert({
      org_id: orgId,
      title,
      name: file.name,
      file_path: path,
      file_type: file.type,
      file_size: file.size,
      category: 'narrative',
      ai_category: aiCategory,
      metadata: tags.length > 0 ? { tags } : null,
    })
    .select()
    .single()

  if (dbError) {
    await deleteFile(path)
    return { error: sanitizeError(dbError, 'Unable to save narrative. Please try again.') }
  }

  // Fire-and-forget: trigger n8n extraction so the narrative gets text.
  if (process.env.N8N_WEBHOOK_URL) {
    fetch(`${process.env.N8N_WEBHOOK_URL}/process-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        document_id: doc.id,
        org_id: orgId,
        file_name: file.name,
        file_type: file.type,
        category: 'narrative',
      }),
    }).catch((err) => {
      console.error('[uploadNarrativeFile] n8n process-document webhook failed:', err)
    })
  }

  revalidatePath('/narratives')
  return { data: { id: doc.id }, error: null }
}

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
    .or('category.eq.narrative,ai_category.eq.narrative,ai_category.like.narrative_%')
    .order('updated_at', { ascending: false })

  if (error) {
    return { error: sanitizeError(error, 'Unable to load narratives. Please try again.'), data: [] }
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
    return { error: sanitizeError(error, 'Unable to save narrative. Please try again.') }
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
    version: doc.version || 1,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  }

  revalidatePath('/narratives')
  return { data: narrative, error: null }
}

export async function updateNarrative(narrativeId: string, formData: FormData) {
  const supabase = await createClient()
  const { orgId } = await getUserOrgId(supabase)
  if (!orgId) return { error: 'Not authenticated' }

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
    return { error: sanitizeError(error, 'Unable to update narrative. Please try again.') }
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
    version: doc.version || 1,
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
    .or('category.eq.narrative,ai_category.eq.narrative,ai_category.like.narrative_%')
    .single()

  if (error || !doc) {
    return { error: error?.message || 'Not found', data: null }
  }

  // If the narrative is backed by an uploaded file, generate a signed URL so
  // the org can view the original document instead of the extracted text.
  let signedUrl: string | null = null
  if (doc.file_path) {
    const { data: signed } = await adminDb.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 60 * 60)
    signedUrl = signed?.signedUrl ?? null
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
    version: doc.version || 1,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    file_path: doc.file_path ?? null,
    file_type: doc.file_type ?? null,
    file_name: doc.name ?? null,
    signed_url: signedUrl,
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
    return { error: sanitizeError(error, 'Unable to delete narrative. Please try again.') }
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
    return { error: sanitizeError(error, 'Unable to delete narrative. Please try again.') }
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
