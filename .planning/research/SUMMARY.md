# Project Research Summary

**Project:** Grant Management Web Application
**Domain:** Grant lifecycle management dashboard with AI-powered automation
**Researched:** 2026-02-13
**Confidence:** HIGH

## Executive Summary

This is a brownfield grant management web application wrapping 14 existing n8n automation workflows. The product replaces Plane as the user interface for an established AI-powered grant discovery, proposal generation, submission, and reporting system. Research shows this type of application is best built as a Next.js + Supabase + n8n integration following a server-first, realtime-synchronized architecture.

The recommended approach is to build a thin, responsive web UI that orchestrates existing n8n workflows through webhooks while maintaining a bidirectional data flow: the web app triggers AI operations via n8n webhooks, n8n writes results back to Supabase, and the UI updates automatically via Realtime subscriptions. This architecture separates concerns cleanly—Next.js handles authentication and CRUD operations, n8n handles heavy AI processing and external API calls, and Supabase serves as the authoritative data store with built-in auth, real-time sync, and Row Level Security.

Key risks center around three integration points: RLS policies that silently block data access when misconfigured, long-running n8n workflows that require asynchronous fire-and-forget patterns with progress tracking, and bidirectional sync race conditions between manual user edits and automated n8n updates. Mitigation requires careful RLS testing from day one, a dedicated workflow execution tracking table, and clear ownership boundaries between user-editable and workflow-generated fields.

## Key Findings

### Recommended Stack

Next.js 16 with App Router, React Server Components, and server actions provides the foundation, already scaffolded and ready. Supabase replaces Plane entirely, offering Postgres + Auth + Realtime + Storage in a single managed service with Row Level Security for multi-tenant isolation. The shadcn/ui component library delivers a clean, customizable UI that matches modern SaaS aesthetics (Linear, Notion) without dependency bloat since components are copied into the project rather than installed as packages.

**Core technologies:**
- **Next.js 16 + React 19**: Server components for data fetching, server actions for mutations, client components only for interactivity and realtime subscriptions
- **Supabase (@supabase/ssr)**: Postgres database with RLS, cookie-based auth (email + OAuth), Realtime via Postgres WAL, and Storage for documents
- **shadcn/ui + Radix + Tailwind**: Source-owned component library with accessible primitives, organized in three layers (ui/primitives/blocks) for scalability
- **React Hook Form + Zod**: Performant form handling with schema validation shared between client and server, type-safe with TypeScript
- **date-fns**: Date manipulation for deadline tracking, which is existential for grant management
- **Supabase Realtime**: Live UI updates when n8n workflows complete and write results back to the database

**Critical version note:** Use `@supabase/ssr` (NOT the deprecated `@supabase/auth-helpers-nextjs`) for proper Next.js App Router authentication with cookie-based sessions.

### Expected Features

Research into competitors (Submittable, Fluxx, Instrumentl, GrantHub, Foundant) reveals clear table stakes and differentiation opportunities.

**Must have (table stakes):**
- Grant pipeline dashboard (visual lifecycle stages: Discovery → Screening → Drafting → Submission → Award → Reporting)
- Deadline and task tracking with urgency indicators (critical <24h, urgent <48h, soon <7d)
- Document repository with search, filter, and AI categorization
- Application status tracking with detailed drill-down views
- Search and filter across grants, documents, and narratives
- Team activity feed and collaboration features
- Financial tracking (budgets, awards, spending)
- Reporting interface for interim and final grant reports
- Funder/contact management with relationship notes

**Should have (competitive differentiators):**
- AI grant discovery and matching (automated search across Grants.gov, ProPublica, USAspending with eligibility scoring)
- AI proposal generation (one-click full proposals customized to funder requirements)
- AI quality review (pre-submission scoring for jargon, passive voice, vagueness, funder alignment)
- Narrative/content library with AI customization per grant
- AI budget builder with narrative justifications
- Automated submission via Puppeteer
- Funder intelligence (AI strategy briefs using ProPublica 990 data)
- Analytics dashboard (win rates, pipeline value, time-to-submission metrics)

**Defer (v2+):**
- Full accounting system integration (QuickBooks/Xero)
- Mobile-first design (grant writing happens on desktop)
- Real-time collaborative editing (Google Docs handles this)
- Built-in grant database (integrate with external sources instead)
- Custom workflow builder UI (n8n already provides this)

### Architecture Approach

Follow a server-first architecture with client islands: default to React Server Components for all routes and data fetching, use Client Components only for interactivity (forms, realtime subscriptions, user events). Authentication flows through Next.js middleware with Supabase SSR, refreshing session cookies on each request. Mutations route through server actions which validate input, write to Supabase, then trigger n8n webhooks for heavy processing using a fire-and-forget pattern—the action returns immediately while n8n works asynchronously and writes results back to Supabase, triggering Realtime broadcasts to subscribed clients.

**Major components:**
1. **Next.js Server Layer** — Server components for initial data fetching, server actions for mutations and n8n webhook triggers, route handlers for incoming n8n callbacks
2. **Supabase Backend** — Postgres with Row Level Security for authorization, Realtime for live updates via Postgres WAL streaming, Auth for session management, Storage for documents
3. **n8n Automation Engine** — 14 existing workflows handling AI operations (proposal generation, screening, budget creation, report drafting), external API calls (Grants.gov, ProPublica, Google Drive), and heavy processing
4. **Component Architecture** — Three-layer organization (ui/ for raw shadcn components, primitives/ for organization-specific wrappers, blocks/ for composed multi-component features) prevents shadcn sprawl at scale
5. **RLS-First Authorization** — All database tables use Row Level Security as the primary authorization layer, never bypassed from client code, with explicit indexes on policy columns for performance

### Critical Pitfalls

Research identified ten critical pitfalls, with the top five requiring immediate attention:

1. **RLS enabled without policies → silent empty results** — Enabling Row Level Security without adding policies causes queries to return empty arrays with no error. Prevention: Always add at least a SELECT policy when enabling RLS, test with actual auth tokens (not Supabase dashboard which bypasses RLS), create a test script verifying each table returns data for authenticated users.

2. **n8n webhook timeouts on long-running workflows** — Proposal generation takes 2-5 minutes. Synchronous webhook calls timeout while n8n is still working. Prevention: Use fire-and-forget pattern (POST to webhook returns 200 immediately, n8n writes results to Supabase when done, UI uses Realtime to show updates), add a `workflow_executions` table tracking run status, show progress indicators with elapsed time.

3. **Client vs server Supabase client confusion** — Using browser client in server components (no cookies = no auth = empty data) or server client in client components (crashes). Prevention: Create three separate client factories (`lib/supabase/client.ts` for browser, `lib/supabase/server.ts` for server components/actions, `lib/supabase/middleware.ts` for auth refresh), never mix them, default to server components.

4. **Bidirectional sync race conditions** — User updates grant status in UI while n8n simultaneously writes to the same record. One overwrites the other, data is lost. Prevention: Define clear ownership (web UI owns user-editable fields like notes/tags, n8n owns workflow-generated fields like AI outputs/scores), use `updated_at` timestamps for optimistic locking, never have both systems update the same column.

5. **RLS performance with complex policies** — RLS policies with JOINs checking team membership add latency to every query. Prevention: Keep policies simple (`auth.uid() = user_id`), add indexes on columns used in policies, design for multi-tenant from schema level even if v1 only has one org.

## Implications for Roadmap

Based on research, the roadmap should follow architectural dependencies and build from foundation to differentiation. The n8n workflows already exist and function—the web UI's job is to expose them elegantly.

### Phase 1: Foundation & Authentication
**Rationale:** Must establish authentication, database schema, and Supabase client setup before any feature development. All subsequent phases depend on this foundation.

**Delivers:** Working auth flow (email/password + Google OAuth), protected routes, RLS policies on all tables, proper Supabase client separation (server/client/middleware), base component library (shadcn/ui installation and layered structure).

**Addresses:** Auth requirement from features research, prevents pitfalls #1 (RLS setup), #3 (client confusion), #10 (middleware naming).

**Avoids:** Technical debt of "adding auth later" which requires complete rewrite. Establishes RLS patterns correctly from day one.

**Research flag:** Standard pattern, skip additional research. Follow Supabase + Next.js official docs.

### Phase 2: Grant Discovery & Pipeline Management
**Rationale:** The grant pipeline is the "command center" of the application—all other features radiate from this core view. Establishes the basic data model and CRUD patterns used throughout the app.

**Delivers:** Grant list/detail pages, pipeline dashboard (kanban + list views), basic search/filter, grant CRUD operations via server actions, first n8n integration (automated grant fetcher workflow writing to Supabase), Realtime subscriptions for live updates.

**Addresses:** Must-have features (pipeline dashboard, search/filter, status tracking), competitive differentiator (AI grant discovery).

**Uses:** Next.js server components + server actions, Supabase Realtime, n8n webhook bidirectional pattern.

**Implements:** Fire-and-forget workflow pattern, Realtime synchronization, workflow execution tracking table.

**Avoids:** Pitfall #2 (webhook timeouts) by establishing async pattern early, pitfall #4 (race conditions) by defining field ownership.

**Research flag:** Standard pattern for most functionality. May need research on n8n webhook signature verification for security.

### Phase 3: Document Vault & Narrative Library
**Rationale:** Documents and narratives are dependencies for proposal generation (Phase 4). Building this first allows proposal generation to reference existing content.

**Delivers:** Document upload to Supabase Storage, document vault browser (list, view, delete), n8n Document Vault Manager integration (AI categorization, text extraction), narrative library CRUD with versioning, AI customization triggers.

**Addresses:** Must-have (document repository), differentiator (narrative library with AI customization).

**Uses:** Supabase Storage, file upload validation, n8n WF4 (document processing) and WF5 (narrative generation).

**Implements:** Architectural pattern for file handling, metadata tracking.

**Avoids:** Pitfall #8 (file upload without validation), storage security issues.

**Research flag:** Standard pattern for CRUD. May need specific research on Supabase Storage policies and virus scanning if strict security required.

### Phase 4: Eligibility Screening & Proposal Generation
**Rationale:** This is the core value proposition—AI-powered proposal generation. Depends on Phase 2 (grants exist) and Phase 3 (documents/narratives exist to pull from).

**Delivers:** Eligibility screening workflow UI (trigger n8n WF2/3, display results), proposal generator interface (trigger n8n WF6, show AI-generated proposals), proposal review workspace, AI quality review trigger (n8n WF8), version history and editing.

**Addresses:** Headline differentiators (AI proposal generation, AI quality review).

**Uses:** Long-running n8n workflows, progress tracking, complex UI state management.

**Implements:** Advanced fire-and-forget pattern with status polling, version control for AI-generated content.

**Avoids:** Pitfall #2 (long workflow timeouts) critical here since proposal generation takes 2-5 minutes.

**Research flag:** Standard integration pattern, but may need UX research on progress indicators and "in-flight" state management for long-running AI operations.

### Phase 5: Budget Builder & Submission Tracking
**Rationale:** Budgets are required for complete proposals. Submission tracking closes the pre-award loop.

**Delivers:** Budget CRUD with templates, AI budget narrative generation (n8n WF7), submission checklist generator (n8n WF10), submission tracking (manual recording + auto-submit via n8n WF11), post-submission status polling (n8n WF12).

**Addresses:** Must-have (financial tracking), differentiator (AI budget builder, automated submission).

**Uses:** JSONB for flexible budget line items, Puppeteer workflows via n8n.

**Implements:** Complex data modeling (budget items), external automation (auto-submit).

**Avoids:** Security issues with auto-submit (Puppeteer script validation), timezone issues in deadline tracking.

**Research flag:** May need security research on Puppeteer automation risks (credential handling, portal security). Deadline/timezone handling needs validation.

### Phase 6: Awards, Reporting & Analytics
**Rationale:** Post-award workflow. Can be built independently after core grant lifecycle (Phases 1-5) is complete.

**Delivers:** Award notification handler (n8n WF13 callback), award management UI (requirements, payment schedule), report drafting interface (n8n WF14), report deadline tracking, analytics dashboard (win rates, pipeline value, team metrics).

**Addresses:** Must-have (reporting interface, financial tracking), differentiator (analytics).

**Uses:** Complex aggregation queries, charting library (likely Recharts with shadcn), historical data analysis.

**Implements:** Data visualization patterns, report versioning.

**Avoids:** Performance issues on large datasets (pitfall #5 by using indexed queries, potentially materialized views).

**Research flag:** May need research on reporting data aggregation and performance optimization as data grows. Analytics dashboards benefit from charting library evaluation (Recharts vs other options).

### Phase Ordering Rationale

- **Sequential dependency structure:** Each phase builds on the previous. Can't generate proposals (Phase 4) without documents (Phase 3), can't track submissions (Phase 5) without proposals (Phase 4), can't manage reports (Phase 6) without awards (Phase 6).
- **Risk mitigation through early patterns:** Establishing fire-and-forget n8n pattern in Phase 2 makes Phases 4-6 easier since the integration pattern is proven.
- **Foundation-first prevents rework:** Phase 1's RLS and auth setup avoids the "add it later" trap that leads to complete rewrites.
- **Grouping by architectural similarity:** Phases 2-3 are CRUD-heavy with light n8n integration. Phase 4 is integration-heavy with complex UI state. Phases 5-6 add specialized workflows.
- **Value delivery cadence:** Phase 2 delivers a usable pipeline view (replaces Plane immediately). Phase 4 delivers the headline AI features. Phase 6 adds polish and analytics.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (Submission):** Auto-submit security (Puppeteer credential handling, portal authentication), deadline timezone complexity
- **Phase 6 (Analytics):** Data aggregation performance at scale, charting library comparison, materialized view patterns

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Well-documented Supabase + Next.js auth patterns
- **Phase 2 (Pipeline):** Standard CRUD + Realtime patterns
- **Phase 3 (Documents):** Standard file upload + storage patterns
- **Phase 4 (Proposals):** Standard async workflow integration (pattern established in Phase 2)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js 16 + Supabase + n8n is well-documented with established 2026 patterns. All technologies verified through official docs and multiple authoritative sources. |
| Features | MEDIUM | Based on competitor analysis (Submittable, Fluxx, Instrumentl, etc.) and industry publications. Table stakes are clear, but differentiation assumes n8n workflows deliver as described. |
| Architecture | HIGH | Server-first with client islands is the standard Next.js App Router pattern for 2026. Supabase + n8n integration patterns verified through official documentation and production case studies. |
| Pitfalls | MEDIUM-HIGH | RLS, webhook timeouts, client/server confusion, and race conditions are verified issues from official docs and community reports. Phase-specific warnings extrapolated from general patterns. |

**Overall confidence:** HIGH

### Gaps to Address

- **n8n workflow reliability:** Research assumes all 14 n8n workflows function as described. Needs validation during Phase 2 integration—if workflows are broken or incomplete, development timeline expands significantly.
- **Plane data migration:** PITFALLS.md identifies risk in mapping Plane's flat issue structure to relational schema. Needs explicit mapping exercise before Phase 1 schema design—orphaned data or lost relationships would require rework.
- **Multi-tenant considerations:** Research assumes v1 is single-organization. If multi-tenant (SaaS) is required for v1, RLS policies and Realtime subscriptions need org-scoping from day one—adding this later requires database restructuring.
- **Google Drive vs Supabase Storage:** STACK.md notes documents can remain in Google Drive for v1 with links in Supabase. Needs product decision before Phase 3—impacts storage setup, n8n workflow integration, and document processing patterns.
- **AI cost and rate limits:** Features assume unlimited AI API access for proposal generation, screening, quality review. Production use may hit OpenAI/Anthropic rate limits or budget constraints—needs monitoring and fallback patterns.

## Sources

### Primary (HIGH confidence)
- [Supabase + Next.js Official Documentation](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs) — Auth, RLS, Realtime patterns
- [Next.js App Router Documentation](https://nextjs.org/docs/app) — Server components, server actions, middleware
- [n8n Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) — Integration patterns
- [shadcn/ui Official Documentation](https://ui.shadcn.com/) — Component installation and usage
- Competitor websites (Submittable, Fluxx, Instrumentl, OpenGrants, GrantHub, Foundant, SmartSimple) — Feature analysis

### Secondary (MEDIUM confidence)
- [Next.js Architecture in 2026 — Server-First, Client-Islands](https://www.yogijs.tech/blog/nextjs-project-architecture-app-router) — Architectural patterns
- [Building for Scale: Why Next.js and Supabase are the Gold Standard](https://theyellowflashlight.com/building-for-scale-why-next-js-and-supabase-are-the-gold-standard-for-modern-saas/) — Integration best practices
- [Supabase Row Level Security Complete Guide (2026)](https://designrevision.com/blog/supabase-row-level-security) — RLS patterns and pitfalls
- [shadcn at Scale: Architecture Patterns](https://www.shadcnstore.com/blog/marketing/shadcn-at-scale-architecture-patterns-for-large-applications) — Component organization
- [Next.js + Supabase app in production: what would I do differently](https://catjam.fi/articles/next-supabase-what-do-differently) — Anti-patterns and lessons learned

### Tertiary (LOW confidence)
- Community articles on n8n workflow best practices (Medium, personal blogs) — Workflow organization patterns
- Reddit discussions on Supabase Realtime scale limits — Needs validation with official docs during implementation

---
*Research completed: 2026-02-13*
*Ready for roadmap: yes*
