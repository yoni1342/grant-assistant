import { createClient } from '@/lib/supabase/server'

/**
 * Upload a file to the documents storage bucket.
 * Returns the file path on success.
 */
export async function uploadFile(
  file: File,
  userId: string
): Promise<{ path: string; error: string | null }> {
  const supabase = await createClient()

  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${Date.now()}-${file.name}`

  const { data, error } = await supabase.storage
    .from('documents')
    .upload(fileName, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    return { path: '', error: error.message }
  }

  return { path: data.path, error: null }
}

/**
 * Delete a file from the documents storage bucket.
 */
export async function deleteFile(
  filePath: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase.storage
    .from('documents')
    .remove([filePath])

  return { error: error?.message || null }
}

/**
 * Generate a signed URL for downloading a private document.
 * Default expiry: 1 hour (3600 seconds).
 */
export async function getDocumentSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<{ url: string; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, expiresIn)

  if (error) {
    return { url: '', error: error.message }
  }

  return { url: data.signedUrl, error: null }
}
