import { createAdminClient } from "@/lib/supabase/server"

/**
 * Response helpers, pagination parsing, a best-effort per-key rate limiter, and
 * fire-and-forget request logging for the external API.
 */

function baseHeaders(extra?: Record<string, string>): Record<string, string> {
  // Never cache org data at the edge; this is per-key private data.
  return { "Cache-Control": "no-store", ...(extra ?? {}) }
}

export function apiJson(data: unknown, headers?: Record<string, string>): Response {
  return Response.json(data, { status: 200, headers: baseHeaders(headers) })
}

export function apiError(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
): Response {
  return Response.json({ error: { code, message, ...(extra ?? {}) } }, { status, headers: baseHeaders() })
}

export interface Pagination {
  limit: number
  offset: number
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export function parsePagination(url: URL): Pagination {
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "", 10)
  const rawOffset = parseInt(url.searchParams.get("offset") ?? "", 10)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT) : DEFAULT_LIMIT
  const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0
  return { limit, offset }
}

/** Shape every list response the same way so clients can paginate predictably. */
export function listResponse(rows: unknown[], total: number, pagination: Pagination): Response {
  return apiJson({
    data: rows,
    pagination: {
      total,
      limit: pagination.limit,
      offset: pagination.offset,
      has_more: pagination.offset + rows.length < total,
    },
  })
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Simple in-memory sliding window, per key, per server instance. It throttles a
// single key hammering one node; it is not a global limiter (serverless runs
// many instances). Good enough as a v1 abuse guard; tighten with an edge/DB
// limiter if needed.
const RATE_LIMIT_PER_MIN = 120
const buckets = new Map<string, number[]>()

export interface RateResult {
  ok: boolean
  remaining: number
  retryAfterMs: number
}

export function checkRateLimit(keyId: string): RateResult {
  const now = Date.now()
  const windowStart = now - 60_000
  const hits = (buckets.get(keyId) ?? []).filter((t) => t > windowStart)
  if (hits.length >= RATE_LIMIT_PER_MIN) {
    buckets.set(keyId, hits)
    return { ok: false, remaining: 0, retryAfterMs: hits[0] + 60_000 - now }
  }
  hits.push(now)
  buckets.set(keyId, hits)
  return { ok: true, remaining: RATE_LIMIT_PER_MIN - hits.length, retryAfterMs: 0 }
}

export function rateLimitHeaders(rate: RateResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(RATE_LIMIT_PER_MIN),
    "X-RateLimit-Remaining": String(Math.max(rate.remaining, 0)),
  }
}

// ── Audit logging ─────────────────────────────────────────────────────────────
export interface ApiLogEntry {
  keyId: string | null
  orgId: string | null
  method: string
  path: string
  status: number
  ip: string | null
}

/** Fire-and-forget — never blocks or fails the response. */
export function logApiRequest(entry: ApiLogEntry): void {
  try {
    const admin = createAdminClient()
    void admin
      .from("api_request_log")
      .insert({
        api_key_id: entry.keyId,
        org_id: entry.orgId,
        method: entry.method,
        path: entry.path,
        status: entry.status,
        ip: entry.ip,
      })
      .then(
        () => {},
        () => {},
      )
  } catch {
    // best-effort
  }
}
