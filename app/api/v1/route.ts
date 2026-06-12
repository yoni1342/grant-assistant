import { withApiAuth } from "@/lib/api/handler"
import { apiJson } from "@/lib/api/respond"

export const runtime = "nodejs"

// API index + "whoami": confirms the key works and reports which org it is bound
// to, the scopes it holds, and the available endpoints. Useful for the calling
// platform to verify its credential during integration setup.
export const GET = withApiAuth(null, async ({ ctx, url }) => {
  const base = `${url.origin}/api/v1`
  return apiJson({
    organization: { id: ctx.org.id, name: ctx.org.name, plan: ctx.org.plan },
    scopes: ctx.scopes,
    endpoints: {
      organization: `${base}/organization`,
      grants: `${base}/grants`,
      grant: `${base}/grants/{id}`,
      proposals: `${base}/proposals`,
      proposal: `${base}/proposals/{id}`,
      documents: `${base}/documents`,
      narratives: `${base}/narratives`,
      awards: `${base}/awards`,
      funders: `${base}/funders`,
      reports: `${base}/reports`,
      activity: `${base}/activity`,
      export: `${base}/export`,
    },
  })
})
