import { authenticateApiRequest, hasScope, type ApiAuthContext } from "./auth"
import { apiError, checkRateLimit, logApiRequest, rateLimitHeaders } from "./respond"

/**
 * withApiAuth wraps a route handler with the full external-API gauntlet:
 *   authenticate → rate-limit → scope-check → run → audit-log.
 *
 * The wrapped handler only ever sees a resolved, org-bound context, so it cannot
 * accidentally read across tenants. Works for both static and [id] routes —
 * dynamic params are awaited and passed in.
 */

type RouteContext = { params: Promise<Record<string, string | string[]>> }

export interface ApiHandlerArgs {
  req: Request
  ctx: ApiAuthContext
  url: URL
  params: Record<string, string | string[]>
}

type ApiHandler = (args: ApiHandlerArgs) => Promise<Response>

function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]?.trim() || null
  return req.headers.get("x-real-ip")
}

export function withApiAuth(requiredScope: string | null, handler: ApiHandler) {
  return async (req: Request, routeCtx?: RouteContext): Promise<Response> => {
    const url = new URL(req.url)
    const ip = clientIp(req)
    const method = req.method

    const auth = await authenticateApiRequest(req)
    if (!auth.ok) {
      logApiRequest({ keyId: null, orgId: null, method, path: url.pathname, status: auth.status, ip })
      return apiError(auth.status, auth.code, auth.message)
    }
    const ctx = auth.ctx

    const rate = checkRateLimit(ctx.keyId)
    if (!rate.ok) {
      logApiRequest({ keyId: ctx.keyId, orgId: ctx.orgId, method, path: url.pathname, status: 429, ip })
      return apiError(429, "rate_limited", "Too many requests. Please slow down.", {
        retry_after_ms: rate.retryAfterMs,
      })
    }

    if (requiredScope && !hasScope(ctx, requiredScope)) {
      logApiRequest({ keyId: ctx.keyId, orgId: ctx.orgId, method, path: url.pathname, status: 403, ip })
      return apiError(403, "insufficient_scope", `This API key is missing the required scope: ${requiredScope}.`, {
        required_scope: requiredScope,
      })
    }

    try {
      const params = routeCtx ? await routeCtx.params : {}
      const res = await handler({ req, ctx, url, params })
      for (const [k, v] of Object.entries(rateLimitHeaders(rate))) res.headers.set(k, v)
      logApiRequest({ keyId: ctx.keyId, orgId: ctx.orgId, method, path: url.pathname, status: res.status, ip })
      return res
    } catch (err) {
      console.error("[api/v1] handler error:", err)
      logApiRequest({ keyId: ctx.keyId, orgId: ctx.orgId, method, path: url.pathname, status: 500, ip })
      return apiError(500, "internal_error", "Something went wrong handling your request.")
    }
  }
}
