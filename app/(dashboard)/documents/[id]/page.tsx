import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { DocumentDetail } from "./document-detail"

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: document } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single()

  if (!document) {
    notFound()
  }

  // Generate signed URL for viewing (file_path may be null for legacy docs)
  let signedUrl: string | null = null
  if (document.file_path) {
    const { data: signedUrlData } = await supabase.storage
      .from("documents")
      .createSignedUrl(document.file_path, 3600)
    signedUrl = signedUrlData?.signedUrl || null
  }

  // Fetch linked grant title if grant_id exists
  let linkedGrant: { id: string; title: string } | null = null
  if (document.grant_id) {
    const { data: grant } = await supabase
      .from("grants")
      .select("id, title")
      .eq("id", document.grant_id)
      .single()

    if (grant) {
      linkedGrant = grant
    }
  }

  return (
    <DocumentDetail
      document={document}
      signedUrl={signedUrl}
      linkedGrant={linkedGrant}
    />
  )
}
