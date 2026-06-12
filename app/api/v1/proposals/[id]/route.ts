import { createAdminClient } from "@/lib/supabase/server"
import { withApiAuth } from "@/lib/api/handler"
import { apiError, apiJson } from "@/lib/api/respond"

export const runtime = "nodejs"

// A single proposal with its full section list. proposal_sections has no org_id
// of its own — it inherits the tenant boundary from its parent proposal, which
// we constrain with `.eq("org_id", ctx.orgId)`.
const PROPOSAL_DETAIL_SELECT =
  "id, org_id, grant_id, title, status, approval_status, approval_notes, approved_by, approved_at, " +
  "quality_score, quality_review, outcome, outcome_notes, outcome_at, metadata, created_at, updated_at, " +
  "sections:proposal_sections(id, title, sort_order, content, header1, header2, tabulation, created_at, updated_at)"

interface ProposalSection {
  sort_order: number | null
}

export const GET = withApiAuth("proposals:read", async ({ ctx, params }) => {
  const id = String(params.id)
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("proposals")
    .select(PROPOSAL_DETAIL_SELECT)
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .maybeSingle()
  if (error) throw error
  if (!data) return apiError(404, "not_found", "Proposal not found.")

  // Order sections by sort_order for a stable, readable document structure.
  const record = data as { sections?: ProposalSection[] }
  if (Array.isArray(record.sections)) {
    record.sections.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }
  return apiJson({ data })
})
