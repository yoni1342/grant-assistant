'use server'

import { createClient } from '@/lib/supabase/server'
import { uploadFile, deleteFile } from '@/lib/supabase/storage'
import { revalidatePath } from 'next/cache'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
    return { error: 'Invalid file type. Only PDF, DOCX, XLSX, PNG, and JPG files are allowed.' }
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
      name: file.name,
      file_path: path,
      file_type: file.type,
      file_size: file.size,
      category: null,
      ai_category: null,
    })
    .select()
    .single()

  if (dbError) {
    // Rollback: delete uploaded file from storage
    await deleteFile(path)
    return { error: dbError.message }
  }

  // Fire-and-forget: trigger n8n AI categorization webhook
  if (process.env.N8N_WEBHOOK_URL) {
    fetch(`${process.env.N8N_WEBHOOK_URL}/get-documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({ document_id: docData.id }),
    }).catch((err) => {
      console.error('n8n categorization webhook failed:', err)
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
    return { error: dbError.message }
  }

  revalidatePath('/documents')
  return { success: true }
}

export async function getDocuments() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', data: [] }
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message, data: [] }
  }

  return { data: data || [], error: null }
}
