'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getNarratives() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: [] }
  }

  const { data, error } = await supabase
    .from('narratives')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    return { error: error.message, data: [] }
  }

  return { data: data || [], error: null }
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

  // Insert narrative
  const { data: narrative, error } = await supabase
    .from('narratives')
    .insert({
      org_id: profile.org_id,
      title,
      content,
      category: category || null,
      tags: tags.length > 0 ? tags : null,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
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

  // Update narrative
  const { data: narrative, error } = await supabase
    .from('narratives')
    .update({
      title,
      content,
      category: category || null,
      tags: tags.length > 0 ? tags : null,
    })
    .eq('id', narrativeId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
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
    .from('narratives')
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
