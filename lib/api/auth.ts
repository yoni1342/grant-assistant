import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/server"
import { extractBearerToken, hashToken, looksLikeApiKey } from "./keys"
import { scopeSatisfies } from "./scopes"

/**
 * Authenticating an external API request.
 *
 * 1. Extract the bearer token and hash it.
 * 2. Look up the matching api_keys row (must exist, not revoked, not expired).
 * 3. Resolve the bound organization and confirm it is active.
 *
 * The returned context's orgId is the ONLY org scope a handler ever uses, so a
 * key physically cannot read another org's data — the caller has no say in it.
 */

export interface ApiOrg {
  id: string
  name: string
  status: string
  plan: string
}

export interface ApiAuthContext {
  keyId: string
  orgId: string
  scopes: string[]
  org: ApiOrg
}

export type ApiAuthResult =
  | { ok: true; ctx: ApiAuthContext }
  | { ok: false; status: number; code: string; message: string }

// In-process throttle for last_used_at writes (~1/min/key) so we don't write on
// every single request. Per-instance only — that's fine for a "last seen" stamp.
const lastTouch = new Map<string, number>()

function touchLastUsed(admin: SupabaseClient, keyId: string): void {
  const now = Date.now()
  if (now - (lastTouch.get(keyId) ?? 0) < 60_000) return
  lastTouch.set(keyId, now)
  void admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyId)
    .then(
      () => {},
      () => {},
    )
}

export async function authenticateApiRequest(req: Request): Promise<ApiAuthResult> {
  const token = extractBearerToken(req)
  if (!token || !looksLikeApiKey(token)) {
    return {
      ok: false,
      status: 401,
      code: "missing_credentials",
      message: "Provide a valid API key via the 'Authorization: Bearer <key>' header.",
    }
  }

  const admin = createAdminClient()
  const tokenHash = hashToken(token)

  const { data: key, error } = await admin
    .from("api_keys")
    .select("id, org_id, scopes, revoked_at, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle()

  if (error || !key) {
    return { ok: false, status: 401, code: "invalid_key", message: "Invalid API key." }
  }
  if (key.revoked_at) {
    return { ok: false, status: 401, code: "revoked_key", message: "This API key has been revoked." }
  }
  if (key.expires_at && new Date(key.expires_at).getTime() < Date.now()) {
    return { ok: false, status: 401, code: "expired_key", message: "This API key has expired." }
  }

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, status, plan")
    .eq("id", key.org_id)
    .maybeSingle()

  if (!org) {
    return { ok: false, status: 401, code: "org_not_found", message: "The organization for this key no longer exists." }
  }
  if (org.status !== "approved") {
    return { ok: false, status: 403, code: "org_inactive", message: "This organization is not active." }
  }

  touchLastUsed(admin, key.id)

  return {
    ok: true,
    ctx: {
      keyId: key.id,
      orgId: key.org_id,
      scopes: key.scopes ?? [],
      org: org as ApiOrg,
    },
  }
}

export function hasScope(ctx: ApiAuthContext, scope: string): boolean {
  return scopeSatisfies(ctx.scopes, scope)
}
