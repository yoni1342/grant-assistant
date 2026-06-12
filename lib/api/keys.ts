import { createHash, randomBytes } from "node:crypto"

/**
 * API key generation, hashing, and parsing.
 *
 * A token looks like `fnd_live_<43 url-safe chars>` (32 bytes of entropy).
 * At rest we keep only `sha256(token + ':' + pepper)` and a short non-secret
 * prefix for display. Verification re-hashes the presented token and looks the
 * row up by hash — O(1), indexed, and a DB leak never exposes a usable key.
 */

const TOKEN_BYTES = 32
const LIVE_PREFIX = "fnd_live_"
const PREFIX_DISPLAY_LEN = LIVE_PREFIX.length + 6 // e.g. "fnd_live_a1b2c3"

/**
 * Per-deployment pepper. Defaults to the service-role key (same approach as the
 * signup OTP hashing) so a separate secret is optional. Set API_KEY_PEPPER to
 * rotate independently of the Supabase key.
 */
function pepper(): string {
  return process.env.API_KEY_PEPPER || process.env.SUPABASE_SERVICE_ROLE_KEY || ""
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token + ":" + pepper()).digest("hex")
}

export interface GeneratedKey {
  /** The full secret — return to the caller ONCE, never persist. */
  token: string
  /** sha256 hex of the token; this is what we store. */
  tokenHash: string
  /** Non-secret display hint, e.g. "fnd_live_a1b2c3". */
  tokenPrefix: string
}

export function generateApiKey(): GeneratedKey {
  const secret = randomBytes(TOKEN_BYTES).toString("base64url")
  const token = LIVE_PREFIX + secret
  return {
    token,
    tokenHash: hashToken(token),
    tokenPrefix: token.slice(0, PREFIX_DISPLAY_LEN),
  }
}

/** Pull the bearer token out of an Authorization header. */
export function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization")
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}

/** Cheap shape check before we bother hashing / hitting the DB. */
export function looksLikeApiKey(token: string): boolean {
  return token.startsWith(LIVE_PREFIX) && token.length > LIVE_PREFIX.length + 16
}
