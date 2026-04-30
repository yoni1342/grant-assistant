import { createClient } from '@/lib/supabase/server'

// Supabase Storage rejects keys with non-ASCII characters (em-dash —, smart
// quotes, etc.) and most symbols. Strip them from the user-supplied filename
// before using it as the storage key. Original filename is still kept on the
// document row for display.
export function sanitizeStorageFilename(name: string): string {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  const cleanBase = base
    .normalize('NFKD')
    .replace(/[‐-―−]/g, '-')
    .replace(/[‘-‛]/g, "'")
    .replace(/[“-‟]/g, '"')
    .replace(/[^\w\-.()]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  const cleanExt = ext.replace(/[^\w.]+/g, '')
  return ((cleanBase || 'file') + cleanExt).slice(0, 200)
}

/**
 * Upload a file to the documents storage bucket.
 * Returns the file path on success.
 */
export async function uploadFile(
  file: File,
  userId: string
): Promise<{ path: string; error: string | null }> {
  const supabase = await createClient()

  const fileName = `${userId}/${Date.now()}-${sanitizeStorageFilename(file.name)}`

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
