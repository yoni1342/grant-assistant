---
phase: 04-eligibility-screening-proposal-generation
plan: 02
subsystem: ui
tags: [tanstack-table, realtime, proposal-generation, workflow-progress, parallel-execution-conflict]

# Dependency graph
requires:
  - phase: 04-eligibility-screening-proposal-generation
    plan: 04-01
    provides: Server actions for proposals, workflow triggers, Realtime infrastructure
provides:
  - Proposals list page with TanStack table and Realtime updates
  - Generate proposal button with workflow progress tracking
  - Funder analysis button with workflow progress tracking
  - Workflow progress indicator with Realtime status updates
affects: [04-eligibility-screening-proposal-generation]

# Tech tracking
tech-stack:
  added: []
  patterns: [TanStack Table for proposal list, Realtime postgres_changes subscriptions, fire-and-forget workflow triggers with progress tracking]

key-files:
  created:
    - app/(dashboard)/proposals/page.tsx
    - app/(dashboard)/proposals/components/proposal-table.tsx
    - app/(dashboard)/proposals/components/proposals-page-client.tsx
    - app/(dashboard)/pipeline/[id]/components/workflow-progress.tsx
    - app/(dashboard)/pipeline/[id]/components/generate-proposal-button.tsx
    - app/(dashboard)/pipeline/[id]/components/funder-analysis-button.tsx
  modified:
    - app/(dashboard)/pipeline/[id]/page.tsx
    - app/(dashboard)/pipeline/[id]/grant-detail.tsx

key-decisions:
  - "TanStack Table for proposals list following document-table.tsx pattern from Phase 3"
  - "Realtime postgres_changes subscription on proposals table for live updates when n8n completes generation"
  - "WorkflowProgress component subscribes to workflow_executions table filtered by workflow_id"
  - "router.refresh() called when workflow completes to reload page data"
  - "Generate/Regenerate UX: show View Proposal + Regenerate button if proposal exists"
  - "Funder analysis button disabled with tooltip if no funder name provided"

patterns-established:
  - "Pattern 1: Workflow progress tracking via Realtime subscription to workflow_executions table filtered by specific workflow_id"
  - "Pattern 2: Generate button shows WorkflowProgress after trigger, auto-refreshes page on completion"
  - "Pattern 3: Proposals list uses global filter for search across all columns, status badges with spinner for generating state"

# Metrics
duration: 5min
completed: 2026-02-13
---

# Phase 04 Plan 02: Proposal Builder UI Summary

**Proposals list with TanStack table, generate proposal button with real-time workflow progress, funder analysis trigger - Task 1 completed, Task 2 completed by parallel plan 04-03**

## Performance

- **Duration:** 5 min (304 seconds)
- **Started:** 2026-02-13T11:56:28Z
- **Completed:** 2026-02-13T12:01:32Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Task 1 completed successfully: Proposals list page with TanStack table and Realtime subscriptions
- Task 2 completed by plan 04-03 due to parallel execution overlap (see Deviations section)
- All pipeline workflow components (WorkflowProgress, GenerateProposalButton, FunderAnalysisButton) created
- Grant detail page integrated with AI Tools section showing proposal generation and funder analysis buttons
- Zero TypeScript errors after all changes

## Task Commits

1. **Task 1: Build proposals list page with TanStack table** - `e42dc43` (feat)
2. **Task 2: Add proposal generation, funder analysis, and workflow progress to grant detail page** - Completed by plan 04-03 in commits `8bed057` and `53a9008`

## Files Created/Modified

**Task 1 (04-02):**
- `app/(dashboard)/proposals/page.tsx` - Server component fetching proposals list
- `app/(dashboard)/proposals/components/proposal-table.tsx` - TanStack table with 6 columns (title, grant, status, quality score, created, actions)
- `app/(dashboard)/proposals/components/proposals-page-client.tsx` - Client wrapper with Realtime subscription for INSERT/UPDATE/DELETE on proposals table

**Task 2 (created by 04-03):**
- `app/(dashboard)/pipeline/[id]/components/workflow-progress.tsx` - Realtime workflow status indicator with auto-refresh on completion
- `app/(dashboard)/pipeline/[id]/components/generate-proposal-button.tsx` - One-click proposal generation with progress tracking
- `app/(dashboard)/pipeline/[id]/components/funder-analysis-button.tsx` - Funder analysis trigger with tooltip for missing funder
- `app/(dashboard)/pipeline/[id]/page.tsx` - Modified to fetch proposals for grant
- `app/(dashboard)/pipeline/[id]/grant-detail.tsx` - Modified to add AI Tools section with buttons and existing proposals list

## Decisions Made

1. **TanStack Table for proposals list:** Following the established pattern from document-table.tsx (Phase 3). Columns: title (clickable), grant name, status badge (with spinner for generating), quality score with color coding, created date, actions dropdown.

2. **Realtime postgres_changes for proposals:** Subscribe to proposals table for INSERT/UPDATE/DELETE events. Keeps the list in sync when n8n completes proposal generation without polling.

3. **WorkflowProgress component design:** Subscribes to workflow_executions table filtered by specific workflow_id. Shows status with icons (running=spinner, completed=checkmark, failed=X). Calls router.refresh() on completion to reload page data.

4. **Generate/Regenerate UX:** If proposal exists, show "View Proposal" button (primary) and "Regenerate" button (outline). If no proposal, show "Generate Proposal" button. After trigger, show WorkflowProgress component.

5. **Funder analysis button with tooltip:** Disabled if no funder name provided. Tooltip says "Add a funder name first" to guide user.

6. **AI Tools section on grant detail:** Grouped proposal generation and funder analysis in one card. Shows existing proposals with links to detail pages.

## Deviations from Plan

### Parallel Execution Overlap (Rule 4 - Architectural)

**Issue:** Plan 04-03, executing in parallel, created all Task 2 files that were in plan 04-02's scope.

**Discovery:** After completing Task 1 and creating Task 2 files locally, attempted to commit. Found that plan 04-03 had already committed identical files in commits `8bed057` and `53a9008`.

**Root cause:** Plan 04-03's task 2 instructions said "import WorkflowProgress component from pipeline components or create shared version" (line 206, 270 of 04-03-PLAN.md). Instead of importing from 04-02, plan 04-03 created the entire pipeline structure including:
- `app/(dashboard)/pipeline/[id]/components/workflow-progress.tsx`
- `app/(dashboard)/pipeline/[id]/components/generate-proposal-button.tsx`
- `app/(dashboard)/pipeline/[id]/components/funder-analysis-button.tsx`
- Modified `app/(dashboard)/pipeline/[id]/page.tsx`
- Modified `app/(dashboard)/pipeline/[id]/grant-detail.tsx`

**Scope conflict:** Plan 04-02's declared scope (from execution context) was:
- `app/(dashboard)/proposals/page.tsx`
- `app/(dashboard)/proposals/components/*`
- `app/(dashboard)/pipeline/[id]/components/*`
- `app/(dashboard)/pipeline/[id]/grant-detail.tsx`

Plan 04-03's declared scope (from frontmatter) was:
- `app/(dashboard)/proposals/[id]/page.tsx`
- `app/(dashboard)/proposals/[id]/components/*`

But plan 04-03 modified files outside its declared scope.

**Outcome:**
- Files created by both plans are IDENTICAL (verified with `diff`)
- No merge conflicts or file inconsistencies
- All functionality works as intended
- Task 2 objectives met by plan 04-03's work

**Impact:** This is a **planning issue**, not an execution issue. The parallel execution created duplicate work but no bugs. For future parallel plans, scope boundaries must be stricter, or shared components should be created in a prerequisite plan.

**Classification:** Rule 4 (architectural) - this is a cross-plan coordination issue requiring documentation, not an auto-fix scenario.

## Issues Encountered

None beyond the parallel execution overlap documented above.

## User Setup Required

None - all components integrated with existing server actions and Realtime infrastructure.

## Next Phase Readiness

- Proposals list page fully functional with search, sorting, and Realtime updates
- Generate proposal workflow triggers from grant detail page
- Funder analysis workflow triggers from grant detail page
- Workflow progress tracking shows live status updates
- All proposal UI complete except for individual section editing (covered by 04-03)

## Self-Check: PASSED

All Task 1 files verified (Task 2 files verified as committed by 04-03):

**Task 1 (my commit):**
- ✓ app/(dashboard)/proposals/page.tsx exists
- ✓ app/(dashboard)/proposals/components/proposal-table.tsx exists
- ✓ app/(dashboard)/proposals/components/proposals-page-client.tsx exists
- ✓ commit e42dc43 exists

**Task 2 (04-03 commits):**
- ✓ app/(dashboard)/pipeline/[id]/components/workflow-progress.tsx exists
- ✓ app/(dashboard)/pipeline/[id]/components/generate-proposal-button.tsx exists
- ✓ app/(dashboard)/pipeline/[id]/components/funder-analysis-button.tsx exists
- ✓ app/(dashboard)/pipeline/[id]/page.tsx modified
- ✓ app/(dashboard)/pipeline/[id]/grant-detail.tsx modified
- ✓ commit 8bed057 exists (04-03 Task 1)
- ✓ commit 53a9008 exists (04-03 Task 2)

---
*Phase: 04-eligibility-screening-proposal-generation*
*Completed: 2026-02-13*
