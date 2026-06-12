import { createAdminClient } from "@/lib/supabase/server"
import { withApiAuth } from "./handler"
import { listOrgRows, type ResourceName } from "./resources"
import { listResponse, parsePagination } from "./respond"

/**
 * Builds a GET handler that returns a paginated, org-scoped list of `resource`,
 * gated by `scope`. Keeps each resource route file to a single line.
 */
export function makeListRoute(resource: ResourceName, scope: string) {
  return withApiAuth(scope, async ({ ctx, url }) => {
    const pagination = parsePagination(url)
    const admin = createAdminClient()
    const { rows, total } = await listOrgRows(admin, resource, ctx.orgId, pagination)
    return listResponse(rows, total, pagination)
  })
}
