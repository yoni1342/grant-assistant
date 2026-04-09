'use server'

import { createClient, getUserOrgId } from '@/lib/supabase/server'
import { uploadFile, deleteFile } from '@/lib/supabase/storage'
import { revalidatePath } from 'next/cache'
import { sanitizeError } from '@/lib/errors'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
]

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient()

  const file = formData.get('file') as File
  if (!file || !file.name) {
    return { error: 'No file provided' }
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Invalid file type. Only PDF, DOCX, XLSX, PPTX, PNG, and JPG files are allowed.' }
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { error: 'File too large. Maximum size is 25MB.' }
  }

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

  // Read optional category
  const category = formData.get('category') as string | null

  // Upload file to Storage
  const { path, error: uploadError } = await uploadFile(file, user.id)
  if (uploadError) {
    return { error: uploadError }
  }

  // Insert document metadata into database
  const { data: docData, error: dbError } = await supabase
    .from('documents')
    .insert({
      org_id: profile.org_id,
      title: file.name,
      name: file.name,
      file_path: path,
      file_type: file.type,
      file_size: file.size,
      category: category || null,
      ai_category: null,
    })
    .select()
    .single()

  if (dbError) {
    // Rollback: delete uploaded file from storage
    await deleteFile(path)
    return { error: sanitizeError(dbError, 'Unable to save document. Please try again.') }
  }

  // Fire-and-forget: trigger n8n document processing webhook
  if (process.env.N8N_WEBHOOK_URL) {
    fetch(`${process.env.N8N_WEBHOOK_URL}/process-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        document_id: docData.id,
        org_id: profile.org_id,
        file_name: file.name,
        file_type: file.type,
      }),
    }).catch((err) => {
      console.error('n8n document processing webhook failed:', err)
    })
  }

  revalidatePath('/documents')
  return { data: docData }
}

export async function deleteDocument(documentId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get document to find file_path
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('id, file_path, org_id')
    .eq('id', documentId)
    .single()

  if (fetchError || !doc) {
    return { error: 'Document not found' }
  }

  // Delete from storage first
  const { error: storageError } = await deleteFile(doc.file_path)
  if (storageError) {
    console.error('Storage delete failed:', storageError)
    // Continue with DB delete even if storage fails
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (dbError) {
    return { error: sanitizeError(dbError, 'Unable to delete document. Please try again.') }
  }

  revalidatePath('/documents')
  return { success: true }
}

export async function getDocuments() {
  const supabase = await createClient()
  const { orgId, error: orgError } = await getUserOrgId(supabase)
  if (!orgId) {
    return { error: orgError || 'Not authenticated', data: [] }
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    return { error: sanitizeError(error, 'Unable to load documents. Please try again.'), data: [] }
  }

  return { data: data || [], error: null }
}

export async function getDownloadUrl(filePath: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', url: null }
  }

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, 3600) // 1 hour expiry

  if (error) {
    return { error: sanitizeError(error, 'Unable to generate download link. Please try again.'), url: null }
  }

  return { url: data.signedUrl, error: null }
}

export async function updateDocumentCategory(documentId: string, category: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('documents')
    .update({ category })
    .eq('id', documentId)

  if (error) {
    return { error: sanitizeError(error, 'Unable to update document category. Please try again.') }
  }

  revalidatePath('/documents')
  revalidatePath(`/documents/${documentId}`)
  return { success: true }
}
