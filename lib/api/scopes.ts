/**
 * Scopes for the external API (/api/v1/*). Each scope grants read access to one
 * resource family. A key may also hold the wildcard "*" for full read access.
 *
 * This file is intentionally free of node:crypto / server-only imports so it can
 * be imported from both server actions and client components (the create-key
 * dialog renders the checklist from API_SCOPE_DEFS).
 *
 * v1 is read-only by design — the API exists to let another platform *extract*
 * an organization's data, not mutate it. Write scopes can be added later.
 */
export interface ScopeDef {
  value: string
  label: string
  description: string
}

export const API_SCOPE_DEFS: ScopeDef[] = [
  { value: "organization:read", label: "Organization", description: "Org profile, mission, contact & metadata" },
  { value: "grants:read", label: "Grants", description: "Tracked grants, stages & screening results" },
  { value: "proposals:read", label: "Proposals", description: "Proposals and their sections" },
  { value: "documents:read", label: "Documents", description: "Uploaded document records & metadata" },
  { value: "narratives:read", label: "Narratives", description: "Reusable narrative library" },
  { value: "awards:read", label: "Awards", description: "Awarded grants & funding records" },
  { value: "funders:read", label: "Funders", description: "Funder profiles & research" },
  { value: "reports:read", label: "Reports", description: "Grant reports (interim & final)" },
  { value: "activity:read", label: "Activity", description: "Activity / audit log" },
]

export const ALL_SCOPE_VALUES: string[] = API_SCOPE_DEFS.map((s) => s.value)

/** Grants access to every read scope, including ones added in the future. */
export const WILDCARD_SCOPE = "*"

/** True if `granted` satisfies `required` (wildcard counts for everything). */
export function scopeSatisfies(granted: string[], required: string): boolean {
  return granted.includes(WILDCARD_SCOPE) || granted.includes(required)
}

/** Human label for a scope value (falls back to the raw value). */
export function scopeLabel(value: string): string {
  if (value === WILDCARD_SCOPE) return "Full access"
  return API_SCOPE_DEFS.find((s) => s.value === value)?.label ?? value
}
