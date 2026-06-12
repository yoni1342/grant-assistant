import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Column selections for each external-API resource.
 *
 * These are deliberately curated rather than `select(*)`:
 *   - Vector `embedding` columns and large derived `extracted_text` are excluded
 *     (internal machinery, not "the org's data", and huge).
 *   - Grants embed their underlying central/manual grant so the row is useful on
 *     its own (title, funder, amount, deadline live there, not on `grants`).
 *
 * Every table here has an `org_id` column, which is how listOrgRows scopes them.
 */
export const SELECTS = {
  organization:
    "id, name, plan, status, email, phone, address, website, description, mission, executive_summary, sector, ein, annual_budget, staff_count, founding_year, geographic_focus, programs, created_at, updated_at",
  grants:
    "id, org_id, stage, screening_score, screening_notes, concerns, recommendations, created_at, updated_at, " +
    "central_grant:central_grants(id, title, funder_name, organization, amount, deadline, description, source_url, categories), " +
    "manual_grant:manual_grants(id, title, funder_name, organization, amount, deadline, description, source_url, categories, eligibility)",
  proposals:
    "id, org_id, grant_id, title, status, approval_status, approval_notes, quality_score, quality_review, outcome, outcome_notes, outcome_at, approved_at, created_at, updated_at",
  documents:
    "id, org_id, grant_id, name, title, description, file_type, mime_type, file_size, category, ai_category, status, version, source_url, created_at, updated_at",
  narratives: "id, org_id, title, content, category, tags, created_at, updated_at",
  awards: "id, org_id, grant_id, amount, award_date, start_date, end_date, requirements, metadata, created_at, updated_at",
  funders:
    "id, org_id, name, ein, giving_patterns, priorities, strategy_brief, submission_preferences, created_at, updated_at",
  reports:
    "id, org_id, grant_id, award_id, title, content, report_type, status, due_date, submitted_at, created_at, updated_at",
  activity: "id, org_id, user_id, grant_id, action, details, created_at",
} as const

export type ResourceName = keyof typeof SELECTS

/** Maps a public resource name to its underlying table (mostly identity). */
export const TABLES: Record<ResourceName, string> = {
  organization: "organizations",
  grants: "grants",
  proposals: "proposals",
  documents: "documents",
  narratives: "narratives",
  awards: "awards",
  funders: "funders",
  reports: "reports",
  activity: "activity_log",
}

export interface ListOpts {
  limit: number
  offset: number
  orderBy?: string
  ascending?: boolean
}

/**
 * List rows of an org-scoped table. The `.eq("org_id", orgId)` here is the hard
 * tenant boundary — callers pass the org from the authenticated key context, not
 * from request input.
 */
export async function listOrgRows(
  admin: SupabaseClient,
  table: ResourceName,
  orgId: string,
  opts: ListOpts,
): Promise<{ rows: unknown[]; total: number }> {
  const { data, error, count } = await admin
    .from(TABLES[table])
    .select(SELECTS[table], { count: "exact" })
    .eq("org_id", orgId)
    .order(opts.orderBy ?? "created_at", { ascending: opts.ascending ?? false })
    .range(opts.offset, opts.offset + opts.limit - 1)

  if (error) throw error
  return { rows: data ?? [], total: count ?? 0 }
}
