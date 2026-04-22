import { createClient, createAdminClient, getUserOrgId } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { DocumentDetail } from "./document-detail"

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { orgId } = await getUserOrgId(supabase)
  if (!orgId) redirect("/login")

  const adminDb = createAdminClient()

  const { data: document } = await adminDb
    .from("documents")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .single()

  if (!document) {
    notFound()
  }

  // Generate signed URL for viewing (file_path may be null for legacy docs)
  let signedUrl: string | null = null
  if (document.file_path) {
    const { data: signedUrlData } = await adminDb.storage
      .from("documents")
      .createSignedUrl(document.file_path, 3600)
    signedUrl = signedUrlData?.signedUrl || null
  }

  // Fetch linked grant title if grant_id exists
  let linkedGrant: { id: string; title: string } | null = null
  if (document.grant_id) {
    const { data: grant } = await adminDb
      .from("grants_full")
      .select("id, title")
      .eq("id", document.grant_id)
      .single()

    if (grant && grant.id && grant.title) {
      linkedGrant = { id: grant.id, title: grant.title }
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
