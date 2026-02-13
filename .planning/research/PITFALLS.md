# Pitfalls Research: Grant Management Web App

**Research Date:** 2026-02-13
**Domain:** Next.js + Supabase + n8n dashboard wrapping existing automation workflows
**Confidence:** MEDIUM-HIGH — verified through official docs, 2026 community articles, known integration issues

## Critical Pitfalls

### 1. RLS Enabled Without Policies → Silent Empty Results
- **Risk:** HIGH
- **Phase:** 1 (Foundation/Auth)
- **What happens:** You enable Row Level Security on a table but forget to add policies. Queries return empty arrays with no error. You think your data is missing when it's actually hidden by RLS
- **Warning signs:** Dashboard shows no data after deploying auth. Supabase dashboard shows data but API returns empty
- **Prevention:**
  - Always add at least a SELECT policy when enabling RLS
  - Test every table's RLS with `supabase.auth.getUser()` immediately after setup
  - Create a test script that verifies each table returns data for authenticated users
  - Use Supabase dashboard's "API" tab (which respects RLS) to verify, not the "Table Editor" (which bypasses RLS)

### 2. n8n Webhook Timeouts on Long-Running Workflows
- **Risk:** HIGH
- **Phase:** 2-3 (Pipeline/Proposals)
- **What happens:** Proposal generation (WF6) can take 2-5 minutes. The web app calls the webhook, waits for response, times out. User sees error even though n8n is still working
- **Warning signs:** Fetch timeout errors in browser console. Proposals appear "stuck" in UI. Users trigger generation multiple times
- **Prevention:**
  - **Fire-and-forget pattern:** Web app POSTs to n8n webhook, gets immediate 200 acknowledgment. n8n writes results to Supabase when done. UI uses Supabase Realtime to show updates
  - Add a `workflow_runs` table in Supabase: `{id, grant_id, workflow_type, status, started_at, completed_at, result}`
  - n8n updates this table at start ("running") and end ("completed"/"failed")
  - UI subscribes to Realtime changes on this table
  - Show progress indicators: "Generating proposal..." with elapsed time

### 3. Client vs Server Supabase Client Confusion
- **Risk:** HIGH
- **Phase:** 1 (Foundation)
- **What happens:** Using the browser client in server components (no cookies = no auth = empty data). Using the server client in client components (crashes). Mixing them causes auth inconsistencies
- **Warning signs:** Auth works on some pages but not others. Random 401 errors. User appears logged out after navigation
- **Prevention:**
  - Create THREE separate Supabase client factories:
    - `lib/supabase/client.ts` — `createBrowserClient()` for client components
    - `lib/supabase/server.ts` — `createServerClient()` for server components/actions (reads cookies)
    - `lib/supabase/middleware.ts` — for auth middleware (refreshes tokens)
  - **Rule:** Never import `client.ts` in a server component or `server.ts` in a client component
  - Use `'use client'` directive consciously — default to server components

### 4. Bidirectional Sync Race Conditions (Web ↔ n8n ↔ Supabase)
- **Risk:** MEDIUM-HIGH
- **Phase:** 2-3 (Pipeline/Proposals)
- **What happens:** User updates a grant's status in the web UI. Meanwhile, n8n is also writing to the same grant record. One overwrites the other. Data is lost or inconsistent
- **Warning signs:** Grant status "jumps back" to a previous state. User edits disappear. Duplicate entries
- **Prevention:**
  - Use `updated_at` timestamps for optimistic locking
  - n8n should use `UPSERT` (not blind `INSERT`/`UPDATE`) when writing to Supabase
  - Define clear ownership: Web UI owns user-editable fields (notes, tags). n8n owns workflow-generated fields (AI outputs, eligibility scores)
  - Never have both n8n and the web UI update the same column
  - Use Supabase database functions for atomic state transitions

### 5. RLS Performance with Complex Policies
- **Risk:** MEDIUM
- **Phase:** 1 (Foundation) — but manifests later
- **What happens:** RLS policies with JOINs to check team membership add latency to every query. With 100+ grants and complex policies, dashboard loads slowly
- **Warning signs:** Dashboard gets slower as data grows. Supabase logs show long query times
- **Prevention:**
  - Keep RLS policies simple: `auth.uid() = user_id` or `auth.uid() IN (SELECT user_id FROM team_members WHERE org_id = grants.org_id)`
  - Add indexes on columns used in RLS policies
  - For v1 (single org), a simple `user_id` check is sufficient
  - Design for multi-tenant from schema level (add `org_id` to tables) even if v1 only has one org

### 6. Data Migration: Plane Issue Tags → Relational Schema
- **Risk:** MEDIUM
- **Phase:** 1 (Foundation/Schema Design)
- **What happens:** Plane stores everything as issues with tags like `[Eligibility]`, `[Narrative]`, `[Budget]`, `[Doc]`. Translating this flat structure into proper relational tables requires careful mapping. Foreign keys between grants, documents, narratives, and budgets need planning upfront
- **Warning signs:** Schema doesn't capture relationships that existed implicitly in Plane. Data duplication. Orphaned records
- **Prevention:**
  - Map every Plane issue type to a Supabase table BEFORE writing any code
  - Define foreign keys explicitly: `documents.grant_id`, `narratives.grant_id`, `budgets.grant_id`
  - Create a migration script that maps Plane issue tags to table rows (even if you run it manually)
  - Don't try to preserve Plane's issue IDs — generate new UUIDs

### 7. Supabase Realtime Not Respecting RLS on Subscribe
- **Risk:** MEDIUM
- **Phase:** 2 (Pipeline Dashboard)
- **What happens:** Realtime subscriptions broadcast changes to all connected clients regardless of RLS policies. A user could see another org's data changes in a future multi-tenant setup
- **Warning signs:** In multi-tenant setup, users see activity from other orgs
- **Prevention:**
  - For v1 (single org): Not a problem — all users share data
  - For v2 (SaaS): Use Realtime's `filter` parameter to scope subscriptions: `.on('postgres_changes', { filter: 'org_id=eq.{orgId}' })`
  - Enable Realtime's RLS mode in Supabase dashboard (requires Supabase >= recent versions)
  - Design subscription filters from day 1 even if v1 doesn't need them

### 8. File Upload Without Validation
- **Risk:** MEDIUM
- **Phase:** 3 (Document Vault)
- **What happens:** Users upload arbitrary files. No size limits, no type checking, no virus scanning. Storage fills up. Malicious files stored
- **Warning signs:** Storage costs spike. Large files slow down document retrieval
- **Prevention:**
  - Validate file type (PDF, DOCX, XLSX, PNG, JPG only) and size (<25MB) on both client and server
  - Use Supabase Storage policies to restrict upload size and types
  - Store metadata (filename, type, size, uploaded_by, uploaded_at) in a `documents` table
  - For v1: Store Google Drive links in Supabase, not the files themselves

### 9. Missing n8n Webhook Authentication
- **Risk:** MEDIUM
- **Phase:** 1 (Foundation)
- **What happens:** n8n webhooks are publicly accessible. Anyone who discovers the URL can trigger your workflows — generating proposals, submitting applications, or modifying data
- **Warning signs:** Unexpected workflow executions. Data appearing from unknown sources
- **Prevention:**
  - Add a shared secret header to n8n webhooks: `X-Webhook-Secret: {secret}`
  - Validate the secret in n8n's webhook node
  - Store the secret in environment variables (not hardcoded)
  - For n8n → Supabase: Use a Supabase service role key (server-side only, never exposed to browser)

### 10. Next.js 16 Middleware Rename (proxy.ts)
- **Risk:** LOW-MEDIUM
- **Phase:** 1 (Foundation)
- **What happens:** Next.js 16 renamed `middleware.ts` to `proxy.ts`. Old Supabase Auth examples reference `middleware.ts` which won't work
- **Warning signs:** Auth redirects don't fire. Token refresh fails silently. Users get logged out randomly
- **Prevention:**
  - Use `proxy.ts` at project root (NOT `middleware.ts`) for Supabase auth token refresh
  - Check Next.js 16 migration guide for other breaking changes
  - Test auth flow end-to-end: login → navigate → refresh → still logged in

## Technical Debt Patterns

| Shortcut | Cost | When It Breaks |
|----------|------|----------------|
| Skip RLS, "add it later" | Complete auth rewrite | When you add a second user or org |
| Store all data as JSON blobs | Can't query, filter, or index | When pipeline has 50+ grants |
| No loading/error states in UI | Users think app is broken | First time n8n takes >5 seconds |
| No `workflow_runs` tracking | Can't show n8n progress | When users trigger long workflows |
| Hardcoded n8n webhook URLs | Deploy breaks everything | When you change n8n server or paths |
| Skip database migrations | Schema drift, lost data | When you need to add a column |

## Integration Gotchas

### Supabase
- `@supabase/ssr` requires cookie configuration in both server and client — don't assume defaults work
- Supabase `insert()` returns null by default — add `.select()` to get inserted data back
- RLS policies need both SELECT and UPDATE permissions — UPDATE alone doesn't work
- Supabase Storage buckets must be explicitly set to "public" or "authenticated" — default is private with no access

### n8n
- Webhook nodes have two URLs: test and production. Use production URLs in the web app
- n8n's "Respond to Webhook" node must be explicitly added for synchronous responses — without it, the webhook hangs
- Large payloads (>1MB) to n8n webhooks may timeout — send references (Supabase IDs) not data
- n8n error handling: use "Error Trigger" nodes to catch failures and write error status to Supabase

### shadcn/ui
- `npx shadcn@latest init` must run AFTER Tailwind CSS is configured — it reads your Tailwind config
- shadcn components are source-owned — updating shadcn doesn't update existing components
- The `cn()` utility must be at `lib/utils.ts` — shadcn components import from this exact path
- Dark mode requires manual setup (CSS variables in globals.css) — not automatic

## "Looks Done But Isn't" Checklist

- [ ] Auth works on page refresh (not just initial login)
- [ ] Auth works after browser tab sleeps for 1+ hour (token refresh)
- [ ] Pipeline loads with 0 grants (empty state, not broken state)
- [ ] Pipeline loads with 100+ grants (performance, pagination)
- [ ] n8n webhook failure shows error to user (not silent failure)
- [ ] Long-running n8n workflows show progress (not "Loading..." forever)
- [ ] File uploads fail gracefully for unsupported types
- [ ] Search works with special characters in grant names
- [ ] Deadline calendar handles timezone differences correctly
- [ ] RLS policies tested with actual auth tokens (not just Supabase dashboard)

## Phase-Specific Warnings

| Phase | Watch Out For |
|-------|--------------|
| 1 (Foundation) | RLS setup, Supabase client confusion, proxy.ts (not middleware.ts), n8n webhook auth |
| 2 (Pipeline) | Realtime subscriptions, webhook timeout patterns, empty states, pagination |
| 3 (Proposals) | Long-running workflow UX, bidirectional sync, large document handling |
| 4 (Documents) | File upload validation, storage bucket permissions, Google Drive link management |
| 5 (Submission) | Auto-submit security (Puppeteer scripts), deadline timezone handling |
| 6 (Reporting) | Report data aggregation performance, historical data growth |

---
*Research completed: 2026-02-13*
*Confidence: MEDIUM-HIGH — verified through official Supabase/n8n docs, 2026 community articles, known integration patterns*
