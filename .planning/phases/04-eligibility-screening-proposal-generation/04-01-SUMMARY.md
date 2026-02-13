---
phase: 04-eligibility-screening-proposal-generation
plan: 01
subsystem: api
tags: [use-debounce, shadcn, server-actions, n8n-webhooks, fire-and-forget]

# Dependency graph
requires:
  - phase: 03-document-vault-narrative-library
    provides: Fire-and-forget n8n webhook pattern, server action authentication pattern
provides:
  - Server actions for proposal generation, quality review, and funder analysis workflows
  - Server actions for reading/updating proposals and sections
  - Webhook route handlers for n8n callbacks on proposals and funders
  - Phase 4 UI dependencies (use-debounce, shadcn accordion/progress)
affects: [04-eligibility-screening-proposal-generation, 05-budget-management-submission, 06-award-management-analytics]

# Tech tracking
tech-stack:
  added: [use-debounce@10.1.0, shadcn/accordion, shadcn/progress]
  patterns: [fire-and-forget workflow triggers, debounced autosave pattern, batch section reordering]

key-files:
  created:
    - app/(dashboard)/proposals/actions.ts
    - components/ui/accordion.tsx
    - components/ui/progress.tsx
  modified:
    - app/api/webhook/route.ts
    - package.json

key-decisions:
  - "Fire-and-forget pattern for all 3 workflows (generate-proposal, review-proposal, analyze-funder) following Phase 3 precedent"
  - "updateProposalSection skips revalidatePath to avoid full page refresh during autosave"
  - "getFunder handles missing funder gracefully (returns null, not error) since funder analysis might not have run yet"
  - "Batch section reordering uses loop instead of transaction - acceptable trade-off for v1 simplicity"

patterns-established:
  - "Pattern 1: Server actions insert workflow_executions then fire-and-forget fetch to n8n with workflow_id for tracking"
  - "Pattern 2: Autosave actions skip revalidatePath to prevent UI flicker during typing"
  - "Pattern 3: Webhook route uses service-role client to bypass RLS for n8n callbacks"

# Metrics
duration: 3min
completed: 2026-02-13
---

# Phase 04 Plan 01: Proposal Server Actions & Dependencies Summary

**8 proposal/funder server actions with fire-and-forget n8n triggers, 5 webhook handlers for n8n callbacks, and Phase 4 UI dependencies (use-debounce, shadcn accordion/progress)**

## Performance

- **Duration:** 3 min (178 seconds)
- **Started:** 2026-02-13T11:50:23Z
- **Completed:** 2026-02-13T11:53:21Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- All 8 proposal and funder server actions created following established auth and fire-and-forget patterns
- Webhook route extended with 5 new action cases for n8n proposal/funder callbacks
- Phase 4 UI dependencies installed (use-debounce for autosave, shadcn accordion/progress for proposal UI)
- Zero TypeScript errors after all changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Install use-debounce and add shadcn accordion + progress components** - `c85f226` (chore)
2. **Task 2: Create proposal server actions and extend webhook route** - `03ae4df` (feat)

## Files Created/Modified
- `app/(dashboard)/proposals/actions.ts` - 8 server actions for proposal/funder workflows and CRUD
- `app/api/webhook/route.ts` - Extended with 5 new action cases (insert_proposal, insert_proposal_sections, update_proposal, insert_funder, update_funder)
- `components/ui/accordion.tsx` - shadcn Accordion component for proposal sections UI
- `components/ui/progress.tsx` - shadcn Progress component for workflow status display
- `package.json` - Added use-debounce@10.1.0

## Decisions Made

1. **Fire-and-forget pattern for all 3 workflows:** Following Phase 3 precedent (document categorization, narrative customization), all workflow triggers use insert workflow_executions then fire-and-forget fetch to n8n. Avoids timeout issues.

2. **updateProposalSection skips revalidatePath:** Called from debounced autosave - don't want full page refresh on every keystroke. Direct DB update only.

3. **getFunder handles missing gracefully:** Returns `{ data: null, error: null }` when funder not found (PGRST116). Funder analysis might not have run yet, so missing funder isn't an error.

4. **Batch section reordering uses loop:** Simple for loop to update each section's sort_order. Could use transaction for atomicity, but acceptable trade-off for v1 simplicity.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All server actions ready for Phase 4 UI consumption
- Webhook route handles all n8n callback scenarios
- UI dependencies installed and ready for proposal builder components
- Ready for 04-02: Proposal Builder UI

## Self-Check: PASSED

All files and commits verified:
- ✓ app/(dashboard)/proposals/actions.ts exists
- ✓ components/ui/accordion.tsx exists
- ✓ components/ui/progress.tsx exists
- ✓ commit c85f226 exists
- ✓ commit 03ae4df exists

---
*Phase: 04-eligibility-screening-proposal-generation*
*Completed: 2026-02-13*
