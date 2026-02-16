# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-13)

**Core value:** Grant writers can see their entire pipeline at a glance, trigger any automation with one click, and never miss a deadline — all from a single, purpose-built interface instead of juggling Plane issues and n8n dashboards.
**Current focus:** Phase 5 - Budget Builder & Submission Tracking

## Current Position

Phase: 5 of 6 (Budget Builder & Submission Tracking)
Plan: 3 of 3 in current phase (completed: 05-01-PLAN.md, 05-02-PLAN.md, 05-03-PLAN.md)
Status: Complete
Last activity: 2026-02-16 — Completed 05-02: Budget Builder UI (TanStack table, dynamic forms, templates, AI narrative)

Progress: [█████████████] 100% (9 of 9 plans across all phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 5 min
- Total execution time: 0.75 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 03 | 3 | 18 min | 6 min |
| 04 | 3 | 11 min | 4 min |
| 05 | 3 | 13 min | 4 min |

**Recent Trend:**
- Last 5 plans: 04-03 (3min), 05-01 (3min), 05-03 (4min), 05-02 (6min)
- Trend: Phase 5 complete, averaging 4min per plan

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap creation: 6-phase structure following architectural dependencies (foundation → pipeline → documents → proposals → budget/submission → awards/analytics)
- Research recommendations: Establish fire-and-forget n8n webhook pattern early (Phase 2) to avoid timeout issues in later phases
- Coverage validation: All 68 v1 requirements mapped to phases with no orphans
- **03-01 (Storage Infrastructure):** Used Supabase MCP apply_migration for bucket creation; implemented rollback pattern for storage uploads; fire-and-forget n8n webhook pattern established; 25MB file size limit with type validation
- **03-02 (Document Vault UI):** Server action wrapper pattern for downloads; Realtime subscription cleanup on unmount; categorization state tracking for AI workflow
- **03-03 (Narrative Library):** Tiptap immediatelyRender: false for SSR; card grid layout for content preview; client-side search/filter for instant feedback; fire-and-forget AI customization webhook; tags as string array
- **03-02 (Document Vault UI):** Server action wrapper pattern for client components; global filter scoped to name column; Realtime subscription with cleanup pattern; "Categorizing..." state for AI processing feedback; file type visual hierarchy with color-coded icons
- **04-01 (Proposal Server Actions):** Fire-and-forget pattern for all 3 workflows (generate-proposal, review-proposal, analyze-funder); updateProposalSection skips revalidatePath for autosave; getFunder returns null (not error) when missing; batch section reordering uses loop for v1 simplicity
- **04-02 (Proposal Builder UI):** TanStack Table for proposals list following document-table pattern; Realtime postgres_changes subscription on proposals table for live updates; WorkflowProgress component subscribes to workflow_executions by workflow_id and auto-refreshes page on completion; Generate/Regenerate UX shows View + Regenerate when proposal exists; funder analysis button disabled with tooltip if no funder name; parallel execution overlap with 04-03 created identical Task 2 files (documented as planning issue, no functional impact)
- **04-03 (Proposal Detail View & Editor):** All sections expanded by default for immediate visibility; section editor matches narrative editor patterns exactly (immediatelyRender: false); 2-second debounced autosave balances responsiveness and efficiency; Realtime subscriptions on both proposals and proposal_sections tables for live updates; quality review with color-coded scores and severity borders; ProPublica 990 data in separate card for easy reference
- **05-01 (Budget & Submission Infrastructure):** is_template boolean flag on budgets table for templates (not separate table); checklist items stored as JSONB array (not separate rows); delete/recreate line items on update (simpler than diff for v1); date-fns for urgency calculations (overdue/critical/urgent/soon/normal); fire-and-forget pattern for budget narrative and submission workflows; 9 budget server actions + 6 submission server actions + 3 new webhook handlers
- **05-02 (Budget Builder UI):** Use TanStack Table following established patterns; useWatch for reactive calculations (not watch() in useEffect); field.id as React key (not index) for dynamic arrays; sonner for toasts (deprecated useToast replaced); WorkflowProgress reused from pipeline; React Hook Form useFieldArray for dynamic line items; grant selector before budget creation; template loading via form.reset(); Realtime subscriptions for live narrative updates
- **05-03 (Submission Tracking UI):** Optimistic checkbox updates with useState + useTransition pattern (immediate feedback, rollback on error); CSS-based timeline layout for submission history (no external library); collapsible section for manual submission form; tooltip on disabled auto-submit button explains missing portal URL; yellow background for urgent urgency level; Realtime subscriptions on both submission_checklists and submissions tables; WorkflowProgress component reused for checklist generation and auto-submission

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 1 readiness:**
- Need to validate existing n8n workflows are functional before integration work begins
- ~~Need to decide: Google Drive vs Supabase Storage for document management (impacts Phase 3)~~ ✓ **RESOLVED:** Using Supabase Storage (03-01 completed)

**General:**
- Plane data migration strategy needs mapping exercise before Phase 1 schema design
- Multi-tenant considerations: v1 is single-org, but schema should be designed for future SaaS expansion

## Session Continuity

Last session: 2026-02-16
Stopped at: Completed 05-02: Budget Builder UI (TanStack table, dynamic forms with useFieldArray, templates, AI narrative)
Resume file: None
Next up: Phase 5 complete - ready for Phase 6 or other work
