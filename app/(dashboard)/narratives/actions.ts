'use server'

import { createClient, getUserOrgId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getNarratives() {
  const supabase = await createClient()
  const { orgId, error: orgError } = await getUserOrgId(supabase)
  if (!orgId) {
    return { error: orgError || 'Not authenticated', data: [] }
  }

  const { data, error } = await supabase
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

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get user's org_id from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return { error: 'User profile or organization not found' }
  }

  // Insert as document
  const { data: doc, error } = await supabase
    .from('documents')
    .insert({
      org_id: profile.org_id,
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

  // Get existing metadata to merge
  const { data: existing } = await supabase
    .from('documents')
    .select('metadata')
    .eq('id', narrativeId)
    .single()

  const existingMeta = (existing?.metadata as Record<string, unknown>) || {}

  // Update document
  const { data: doc, error } = await supabase
    .from('documents')
    .update({
      title,
      name: title,
      ai_category: category || null,
      extracted_text: content,
      metadata: { ...existingMeta, tags: tags.length > 0 ? tags : undefined },
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

export async function deleteNarrative(narrativeId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', narrativeId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/narratives')
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
