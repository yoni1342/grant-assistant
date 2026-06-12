import { createAdminClient } from "@/lib/supabase/server"
import { withApiAuth } from "@/lib/api/handler"
import { SELECTS } from "@/lib/api/resources"
import { apiError, apiJson } from "@/lib/api/respond"

export const runtime = "nodejs"

export const GET = withApiAuth("organization:read", async ({ ctx }) => {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("organizations")
    .select(SELECTS.organization)
    .eq("id", ctx.orgId)
    .maybeSingle()
  if (error) throw error
  if (!data) return apiError(404, "not_found", "Organization not found.")
  return apiJson({ data })
})
