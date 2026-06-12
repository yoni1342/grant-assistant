import { createAdminClient } from "@/lib/supabase/server"
import { withApiAuth } from "@/lib/api/handler"
import { hasScope } from "@/lib/api/auth"
import { SELECTS, listOrgRows, type ResourceName } from "@/lib/api/resources"
import { apiJson } from "@/lib/api/respond"

export const runtime = "nodejs"

// Bulk "give me everything" endpoint — one call returns the whole org dataset
// the key is allowed to read. Each resource is capped; anything truncated is
// reported in meta.truncated so the caller knows to page the per-resource
// endpoint instead. No single scope is required: the export contains exactly
// the resources the key has scopes for.
const EXPORT_CAP = 1000

const RESOURCES: Array<{ resource: ResourceName; scope: string }> = [
  { resource: "grants", scope: "grants:read" },
  { resource: "proposals", scope: "proposals:read" },
  { resource: "documents", scope: "documents:read" },
  { resource: "narratives", scope: "narratives:read" },
  { resource: "awards", scope: "awards:read" },
  { resource: "funders", scope: "funders:read" },
  { resource: "reports", scope: "reports:read" },
  { resource: "activity", scope: "activity:read" },
]

export const GET = withApiAuth(null, async ({ ctx }) => {
  const admin = createAdminClient()
  const out: Record<string, unknown> = {}
  const truncated: string[] = []

  const orgPromise = hasScope(ctx, "organization:read")
    ? admin.from("organizations").select(SELECTS.organization).eq("id", ctx.orgId).maybeSingle()
    : Promise.resolve({ data: null })

  const listPromises = RESOURCES.filter(({ scope }) => hasScope(ctx, scope)).map(async ({ resource }) => {
    const { rows, total } = await listOrgRows(admin, resource, ctx.orgId, { limit: EXPORT_CAP, offset: 0 })
    return { resource, rows, total }
  })

  const [orgResult, listResults] = await Promise.all([orgPromise, Promise.all(listPromises)])

  if (hasScope(ctx, "organization:read")) {
    out.organization = (orgResult as { data: unknown }).data ?? null
  }
  for (const { resource, rows, total } of listResults) {
    out[resource] = rows
    if (total > rows.length) truncated.push(resource)
  }

  return apiJson({
    data: out,
    meta: {
      generated_at: new Date().toISOString(),
      export_cap: EXPORT_CAP,
      truncated,
      scopes: ctx.scopes,
    },
  })
})
