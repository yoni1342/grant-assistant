---
phase: 06-awards-reporting-analytics
plan: 01
subsystem: api
tags: [server-actions, supabase, n8n, webhooks, analytics, recharts, react-day-picker]

# Dependency graph
requires:
  - phase: 05-budget-builder-submission-tracking
    provides: Server action patterns, fire-and-forget n8n integration, workflow_executions table
provides:
  - Award CRUD server actions (5 functions)
  - Report management server actions (6 functions)
  - Analytics calculation server actions (2 functions)
  - Analytics utility helpers (2 functions)
  - Webhook handlers for n8n award/report callbacks (4 cases)
  - shadcn chart and calendar UI components
affects: [06-02, 06-03]

# Tech tracking
tech-stack:
  added: [recharts@2.15.4, react-day-picker@9.13.2, date-fns]
  patterns: [fire-and-forget n8n for award recording and report generation, analytics aggregation patterns, success rate calculation by funder]

key-files:
  created:
    - app/(dashboard)/awards/actions.ts
    - app/(dashboard)/awards/reports-actions.ts
    - app/(dashboard)/analytics/actions.ts
    - lib/utils/analytics.ts
    - components/ui/chart.tsx
    - components/ui/calendar.tsx
  modified:
    - app/api/webhook/route.ts

key-decisions:
  - "Fire-and-forget n8n pattern for award recording creates reporting calendar automatically"
  - "Analytics calculations use server-side aggregation with client-side reduce for sums (Supabase JS no native sum)"
  - "Success rate by funder groups awards and submissions by funder_name in application code"
  - "Report autosave pattern skips revalidatePath for content-only updates (status changes trigger revalidate)"
  - "Grant stage updated to 'awarded' when award created (separate update, non-failing)"

patterns-established:
  - "Analytics pattern: fetch counts with head: true for efficiency, calculate win rate as percentage"
  - "Fire-and-forget n8n: createAward triggers /record-award webhook with award_id and grant_id"
  - "Report generation: workflow_executions record with metadata { award_id, report_id }"
  - "Type assertion for Supabase joins: use 'as any' to handle grant:grants type inference issue"

# Metrics
duration: 4min
completed: 2026-02-16
---

# Phase 06 Plan 01: Awards, Reports & Analytics Infrastructure Summary

**Award CRUD, report management, analytics calculations, n8n webhook handlers, and chart/calendar dependencies ready for Phase 6 UI work**

## Performance

- **Duration:** 4 min (212 seconds)
- **Started:** 2026-02-16T02:15:36Z
- **Completed:** 2026-02-16T02:19:08Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Installed shadcn chart and calendar components with recharts and react-day-picker dependencies
- Created complete award CRUD server actions (5 functions) with grant stage update and n8n award recording
- Created report management server actions (6 functions) with AI generation trigger
- Created analytics server actions calculating win rate, pipeline value, total awards/amount, avg time to submission, and success rate by funder
- Extended webhook route with 4 new handlers for n8n award and report callbacks

## Task Commits

Each task was committed atomically:

1. **Task 1: Install shadcn chart and calendar components** - `7c558a5` (chore)
2. **Task 2: Create award, report, and analytics server actions with webhook extensions** - `055a12c` (feat)

## Files Created/Modified
- `components/ui/chart.tsx` - shadcn chart wrapper with ChartContainer, ChartTooltip components using recharts
- `components/ui/calendar.tsx` - shadcn calendar component using react-day-picker
- `app/(dashboard)/awards/actions.ts` - Award CRUD: getAwards, getAward, createAward (updates grant stage + fires n8n), updateAward, deleteAward
- `app/(dashboard)/awards/reports-actions.ts` - Report management: getReports, getReport, createReport, updateReport (autosave pattern), deleteReport, triggerReportGeneration
- `app/(dashboard)/analytics/actions.ts` - Analytics: getAnalytics (6 metrics), getSuccessRateByFunder (grouped by funder)
- `lib/utils/analytics.ts` - Analytics helpers: calculateAvgTimeToSubmission (using date-fns), formatCurrency
- `app/api/webhook/route.ts` - Added 4 cases: insert_award, update_award, insert_report, update_report

## Decisions Made

- **Fire-and-forget n8n for award recording:** When createAward runs, it triggers `/record-award` webhook with award_id and grant_id so n8n can automatically create reporting calendar
- **Grant stage update on award creation:** Separate update to set grant.stage = 'awarded' (non-failing if update errors, award is still created)
- **Analytics aggregation pattern:** Use Supabase count with `head: true` for efficiency, client-side reduce for sums since Supabase JS doesn't support aggregate sum directly
- **Success rate by funder calculation:** Fetch awards and submissions with grant joins, group by funder_name in application code, calculate success rate as awards/submissions percentage
- **Report autosave pattern:** updateReport skips revalidatePath when only content changes (following Phase 4 updateProposalSection pattern), revalidates when status changes
- **TypeScript join handling:** Used `as any` type assertion for grant:grants joins to handle TypeScript inference issue where foreign key relationships are typed as arrays

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript inference issue with Supabase joins:** TypeScript inferred `grant:grants (...)` joins as arrays instead of single objects. Applied `as any` type assertion in analytics actions to resolve (standard pattern for Supabase foreign key relationships).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All Phase 6 server actions complete and type-checking clean
- shadcn chart and calendar components installed
- Webhook handlers ready for n8n award and report workflows
- Ready for 06-02 (Award Management & Reporting UI) and 06-03 (Analytics Dashboard)

---
*Phase: 06-awards-reporting-analytics*
*Completed: 2026-02-16*

## Self-Check: PASSED

All files exist:
- ✓ components/ui/chart.tsx
- ✓ components/ui/calendar.tsx
- ✓ app/(dashboard)/awards/actions.ts
- ✓ app/(dashboard)/awards/reports-actions.ts
- ✓ app/(dashboard)/analytics/actions.ts
- ✓ lib/utils/analytics.ts

All commits verified:
- ✓ 7c558a5 (Task 1: shadcn components)
- ✓ 055a12c (Task 2: server actions)

Dependencies confirmed:
- ✓ recharts@2.15.4
- ✓ react-day-picker@9.13.2
