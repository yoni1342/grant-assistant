---
phase: 06-awards-reporting-analytics
plan: 02
subsystem: ui
tags: [awards, reports, tanstack-table, tiptap, calendar, react-hook-form, realtime, debounce]

# Dependency graph
requires:
  - phase: 06-awards-reporting-analytics
    plan: 01
    provides: Award CRUD server actions, report management server actions, Calendar component
  - phase: 05-budget-builder-submission-tracking
    provides: TanStack Table patterns, React Hook Form patterns, WorkflowProgress component
  - phase: 04-proposal-builder-interface
    provides: Tiptap editor patterns, debounced autosave pattern, Realtime subscription patterns
provides:
  - Awards list page with TanStack Table
  - New award form with Calendar date pickers
  - Award detail page with reporting calendar
  - Report creation and AI generation
  - Tiptap report editor with debounced autosave
affects: [06-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [TanStack Table for awards list, Calendar date pickers in Popover, Tiptap editor with 2-second debounced autosave, Realtime subscriptions on multiple tables, Calendar modifiers for visual deadline tracking]

key-files:
  created:
    - app/(dashboard)/awards/page.tsx
    - app/(dashboard)/awards/components/awards-page-client.tsx
    - app/(dashboard)/awards/components/award-table.tsx
    - app/(dashboard)/awards/new/page.tsx
    - app/(dashboard)/awards/new/new-award-client.tsx
    - app/(dashboard)/awards/[id]/page.tsx
    - app/(dashboard)/awards/[id]/components/award-detail-client.tsx
    - app/(dashboard)/awards/[id]/components/reporting-calendar.tsx
    - app/(dashboard)/awards/[id]/components/report-list.tsx
    - app/(dashboard)/awards/[id]/components/report-editor.tsx
  modified: []

key-decisions:
  - "TanStack Table for awards list following established budget-table pattern exactly"
  - "Three Calendar date pickers in Popover for award_date, start_date, end_date"
  - "Realtime subscriptions on both awards and reports tables for live updates on detail page"
  - "Calendar modifiers for deadline highlighting: overdue (destructive bg), completed (green bg), deadline (bold/underline)"
  - "Tiptap editor with 2-second debounced autosave following proposal section editor pattern"
  - "Report editor autosave calls updateReport() with content only (skips revalidatePath per 06-01 decision)"
  - "WorkflowProgress component reused for report generation tracking"

patterns-established:
  - "Awards list page pattern: server component → client wrapper with realtime → TanStack Table"
  - "Calendar date picker pattern: Calendar in Popover with format() display and Date value"
  - "Award detail two-column layout: left (award info + report list + editor), right (calendar + actions)"
  - "Report status visual hierarchy: CheckCircle2 (submitted), AlertTriangle (overdue), Clock (draft)"

# Metrics
duration: 5min
completed: 2026-02-16
---

# Phase 06 Plan 02: Award Management & Reporting UI Summary

**Complete awards interface: list page with TanStack Table, create form with Calendar date pickers, detail page with reporting calendar, AI report generation, and Tiptap report editor with debounced autosave**

## Performance

- **Duration:** 5 min (355 seconds)
- **Started:** 2026-02-16T02:22:15Z
- **Completed:** 2026-02-16T02:28:10Z
- **Tasks:** 2
- **Files created:** 10

## Accomplishments
- Built complete awards list page with TanStack Table showing grant title, funder, amount, period, and award date
- Created new award form with React Hook Form, Zod validation, and three Calendar date pickers
- Built award detail page with two-column layout (award info + reports on left, calendar + actions on right)
- Implemented reporting calendar with color-coded deadline highlighting (overdue red, completed green, deadline bold)
- Created report list with type badges (interim/final) and status badges (submitted/overdue/draft)
- Built Tiptap report editor with toolbar (bold, italic, heading, lists, blockquote) and 2-second debounced autosave
- Integrated WorkflowProgress component for AI report generation tracking
- Added realtime subscriptions on both awards and reports tables for live updates

## Task Commits

Each task was committed atomically:

1. **Task 1: Awards list page and create award form** - (already committed in previous session - verified identical)
2. **Task 2: Award detail page with reporting calendar and report editor** - `4cd0e84` (feat)

## Files Created/Modified
- `app/(dashboard)/awards/page.tsx` - Server component calling getAwards()
- `app/(dashboard)/awards/components/awards-page-client.tsx` - Client wrapper with realtime subscription on awards table
- `app/(dashboard)/awards/components/award-table.tsx` - TanStack Table with grant title, funder, amount, period, award date columns, global filter, row click navigation
- `app/(dashboard)/awards/new/page.tsx` - Server component fetching grants for selector
- `app/(dashboard)/awards/new/new-award-client.tsx` - React Hook Form with three Calendar date pickers (award_date, start_date, end_date), grant selector, amount input, requirements textarea
- `app/(dashboard)/awards/[id]/page.tsx` - Server component calling getAward() with notFound() handling
- `app/(dashboard)/awards/[id]/components/award-detail-client.tsx` - Two-column layout with award info card, report list, report editor, reporting calendar, and actions (Add Report, Generate Report, Delete Award)
- `app/(dashboard)/awards/[id]/components/reporting-calendar.tsx` - Calendar with modifiers for deadline/overdue/completed dates, report list below calendar with type badges and status icons
- `app/(dashboard)/awards/[id]/components/report-list.tsx` - Report listing with type badges, status badges, click to select, selected report highlighted with ring-2 border
- `app/(dashboard)/awards/[id]/components/report-editor.tsx` - Tiptap editor with StarterKit, Placeholder, toolbar (bold, italic, heading, lists, blockquote), 2-second debounced autosave, save status indicator, Mark as Submitted button

## Decisions Made

- **TanStack Table for awards list:** Followed budget-table.tsx pattern exactly for consistency (global filter, sortable columns, row click navigation)
- **Calendar date pickers in Popover:** Three date pickers (award_date, start_date, end_date) using shadcn Calendar in Popover with format() display and Date value
- **Realtime subscriptions on multiple tables:** Award detail subscribes to both awards and reports tables for comprehensive live updates
- **Calendar modifiers for visual deadline tracking:** Overdue reports (destructive background), completed reports (green background), all deadlines (bold/underline)
- **Tiptap editor with debounced autosave:** 2-second debounce following proposal section editor pattern, autosave calls updateReport() with content only (skips revalidatePath per 06-01 decision)
- **WorkflowProgress component reuse:** Same component used for budget narrative, proposal generation, now report generation tracking
- **Report status visual hierarchy:** CheckCircle2 icon (submitted), AlertTriangle (overdue), Clock (draft) for instant status recognition

## Deviations from Plan

**[Rule 1 - Bug] Task 1 files already committed in previous session**
- **Found during:** Plan execution start
- **Issue:** Files for Task 1 (awards list and new award form) were already committed in commit c475746 from a previous session
- **Fix:** Verified that created files matched committed versions exactly, proceeded to Task 2
- **Files affected:** app/(dashboard)/awards/page.tsx, components/awards-page-client.tsx, components/award-table.tsx, new/page.tsx, new/new-award-client.tsx
- **Commit:** N/A (no changes needed)

## Issues Encountered

None - all Task 2 files created and compiled successfully on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All Phase 6 UI components complete
- Awards list page functional at /awards
- New award form functional at /awards/new
- Award detail page functional at /awards/{id}
- Ready for 06-03 (Analytics Dashboard) - final plan in Phase 6

---
*Phase: 06-awards-reporting-analytics*
*Completed: 2026-02-16*

## Self-Check: PASSED

All files exist:
- ✓ app/(dashboard)/awards/page.tsx
- ✓ app/(dashboard)/awards/components/awards-page-client.tsx
- ✓ app/(dashboard)/awards/components/award-table.tsx
- ✓ app/(dashboard)/awards/new/page.tsx
- ✓ app/(dashboard)/awards/new/new-award-client.tsx
- ✓ app/(dashboard)/awards/[id]/page.tsx
- ✓ app/(dashboard)/awards/[id]/components/award-detail-client.tsx
- ✓ app/(dashboard)/awards/[id]/components/reporting-calendar.tsx
- ✓ app/(dashboard)/awards/[id]/components/report-list.tsx
- ✓ app/(dashboard)/awards/[id]/components/report-editor.tsx

All commits verified:
- ✓ 4cd0e84 (Task 2: Award detail page with reporting calendar and report editor)

Note: Task 1 files were already committed in commit c475746 from a previous session.
