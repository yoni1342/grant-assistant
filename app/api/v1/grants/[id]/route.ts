import { createAdminClient } from "@/lib/supabase/server"
import { withApiAuth } from "@/lib/api/handler"
import { apiError, apiJson } from "@/lib/api/respond"

export const runtime = "nodejs"

// A single grant, enriched with its source grant and its related child records.
// The `.eq("org_id", ctx.orgId)` keeps it tenant-scoped; embedded children are
// resolved through their grant_id FK so they belong to this grant only.
const GRANT_DETAIL_SELECT =
  "id, org_id, stage, screening_score, screening_result, screening_notes, concerns, recommendations, metadata, created_at, updated_at, " +
  "central_grant:central_grants(id, title, funder_name, organization, amount, deadline, description, eligibility, categories, source, source_url), " +
  "manual_grant:manual_grants(id, title, funder_name, organization, amount, deadline, description, eligibility, categories, source_url), " +
  "proposals(id, title, status, approval_status, quality_score, outcome, created_at), " +
  "awards(id, amount, award_date, start_date, end_date), " +
  "documents(id, name, title, category, file_type, created_at)"

export const GET = withApiAuth("grants:read", async ({ ctx, params }) => {
  const id = String(params.id)
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("grants")
    .select(GRANT_DETAIL_SELECT)
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .maybeSingle()
  if (error) throw error
  if (!data) return apiError(404, "not_found", "Grant not found.")
  return apiJson({ data })
})
