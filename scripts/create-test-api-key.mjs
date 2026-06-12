#!/usr/bin/env node
/**
 * Mint an external API key for an org WITHOUT going through the UI — handy for
 * testing the /api/v1 endpoints (and the cross-org isolation guarantee: mint a
 * key for two different orgs and confirm each only sees its own data).
 *
 * The hashing here mirrors lib/api/keys.ts exactly:
 *   token      = "fnd_live_" + base64url(32 random bytes)
 *   token_hash = sha256(token + ":" + pepper)
 *   pepper     = API_KEY_PEPPER || SUPABASE_SERVICE_ROLE_KEY
 * Keep it in sync if lib/api/keys.ts ever changes.
 *
 * Requires: migration 20260612_external_api.sql applied to the target DB, and
 * SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local.
 *
 * Usage:
 *   node scripts/create-test-api-key.mjs                 # lists approved orgs to pick from
 *   node scripts/create-test-api-key.mjs <org_id>        # full-access key
 *   node scripts/create-test-api-key.mjs <org_id> "My test key" grants:read,proposals:read
 */
import { createHash, randomBytes } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

config({ path: ".env.local" })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

const [orgId, name = "Test key", scopesArg = "*"] = process.argv.slice(2)

if (!orgId) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, plan, status")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(15)
  if (error) {
    console.error("Could not list orgs:", error.message)
    process.exit(1)
  }
  console.log("Pass one of these org ids as the first argument:\n")
  for (const o of data ?? []) console.log(`  ${o.id}  ${o.name}  (${o.plan})`)
  console.log("\ne.g.  node scripts/create-test-api-key.mjs " + (data?.[0]?.id ?? "<org_id>"))
  process.exit(0)
}

const pepper = process.env.API_KEY_PEPPER || serviceKey
const token = "fnd_live_" + randomBytes(32).toString("base64url")
const tokenHash = createHash("sha256").update(token + ":" + pepper).digest("hex")
const tokenPrefix = token.slice(0, "fnd_live_".length + 6)
const scopes = scopesArg.split(",").map((s) => s.trim()).filter(Boolean)

const { error } = await supabase.from("api_keys").insert({
  org_id: orgId,
  name,
  token_hash: tokenHash,
  token_prefix: tokenPrefix,
  scopes,
})
if (error) {
  console.error("Insert failed:", error.message)
  process.exit(1)
}

console.log("API key created for org " + orgId)
console.log("  scopes: " + scopes.join(", "))
console.log("\n  " + token + "\n")
console.log("Try it:")
console.log(`  curl http://localhost:3002/api/v1 -H "Authorization: Bearer ${token}"`)
