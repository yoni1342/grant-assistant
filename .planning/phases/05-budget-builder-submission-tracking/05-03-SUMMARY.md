---
phase: 05-budget-builder-submission-tracking
plan: 03
subsystem: submission-tracking-ui
tags: [submission-ui, checklist, urgency-badges, auto-submit, manual-submit, history-timeline]
dependency_graph:
  requires:
    - submission_checklists and submissions tables (Phase 1)
    - submission server actions (05-01)
    - urgency calculation utilities (05-01)
    - WorkflowProgress component (Phase 2)
    - fire-and-forget n8n pattern (Phase 2)
  provides:
    - Submissions list page with deadline urgency
    - Grant submission detail page with checklist
    - Optimistic checkbox updates for checklist items
    - Auto-submission trigger with workflow tracking
    - Manual submission form with validation
    - Submission history timeline
  affects:
    - app/(dashboard)/submissions route (replaced placeholder)
tech_stack:
  added:
    - shadcn/ui collapsible: Collapsible section for manual submission form
  patterns:
    - Optimistic UI updates with useState + useTransition
    - Realtime subscriptions on submission_checklists and submissions tables
    - Fire-and-forget n8n triggers with WorkflowProgress tracking
    - React Hook Form + Zod for manual submission form
    - CSS-based timeline layout (no external library)
    - Tooltip for disabled button with context
key_files:
  created:
    - app/(dashboard)/submissions/page.tsx: Submissions list with grants table
    - app/(dashboard)/submissions/[grantId]/page.tsx: Server component for submission detail
    - app/(dashboard)/submissions/[grantId]/components/submission-page-client.tsx: Client wrapper with Realtime
    - app/(dashboard)/submissions/[grantId]/components/urgency-badge.tsx: Deadline urgency badge
    - app/(dashboard)/submissions/[grantId]/components/submission-checklist.tsx: Checklist with progress bar
    - app/(dashboard)/submissions/[grantId]/components/checklist-item.tsx: Optimistic checkbox item
    - app/(dashboard)/submissions/[grantId]/components/auto-submit-button.tsx: Auto-submit with workflow tracking
    - app/(dashboard)/submissions/[grantId]/components/manual-submit-form.tsx: Manual submission form
    - app/(dashboard)/submissions/[grantId]/components/submission-history.tsx: Timeline display
    - components/ui/collapsible.tsx: shadcn Collapsible component
  modified:
    - package.json: Added @radix-ui/react-collapsible dependency
decisions:
  - Use optimistic updates with useState + useTransition pattern (immediate feedback, rollback on error)
  - CSS-based timeline layout using borders and positioning (no external timeline library)
  - Collapsible section for manual submission form to reduce visual clutter
  - Tooltip on disabled auto-submit button explains missing portal URL
  - Yellow background for urgent urgency level (shadcn Badge doesn't have yellow variant)
  - Realtime subscriptions on both submission_checklists and submissions tables for live updates
  - WorkflowProgress component reused for both checklist generation and auto-submission
metrics:
  duration_minutes: 4
  completed_date: 2026-02-16
---

# Phase 5 Plan 3: Submission Tracking UI Summary

Full submission tracking UI with dynamic checklist, optimistic updates, urgency indicators, dual-mode submission, and history timeline.

## Objective

Build the Submission Tracking UI: submissions list page, submission detail page per grant with dynamic checklist (optimistic checkbox updates), deadline urgency badges, auto-submit trigger, manual submission form, and submission history timeline.

## What Was Built

### Task 1: Submissions List and Grant Submission Detail Pages

**Created Files:**

1. **app/(dashboard)/submissions/page.tsx** - Submissions list page (server component):
   - Fetches all grants for user's org with submission_checklists and submissions joins
   - Table layout showing: Grant Title (link to detail), Deadline, Urgency Badge, Checklist Status, Submission Status
   - Ordered by deadline ascending (soonest first)
   - Calculates urgency level using `calculateUrgency(deadline)` from lib/utils/urgency.ts
   - Empty state: "No grants in your pipeline. Add grants to start tracking submissions."

2. **app/(dashboard)/submissions/[grantId]/components/urgency-badge.tsx** - Urgency badge component:
   - Client component receives deadline as ISO string prop
   - Calls `calculateUrgency()`, `getUrgencyBadgeVariant()`, `getUrgencyLabel()`
   - Custom yellow background for 'urgent' level (bg-yellow-500 text-white)

3. **app/(dashboard)/submissions/[grantId]/page.tsx** - Submission detail server component:
   - Fetches grant data (title, deadline, funder_name, source_url)
   - Calls `getSubmissionChecklist()` and `getSubmissions()` server actions
   - Passes data to SubmissionPageClient

4. **app/(dashboard)/submissions/[grantId]/components/submission-page-client.tsx** - Client wrapper:
   - Page header with grant title and urgency badge
   - Two-column layout: checklist + actions (left), history (right)
   - "Generate Checklist" button if no checklist exists
   - Realtime subscriptions on submission_checklists and submissions tables
   - Calls `router.refresh()` on any change

**Commit:** 366e529

### Task 2: Checklist Items, Auto-Submit, Manual Form, and History

**Created Files:**

1. **app/(dashboard)/submissions/[grantId]/components/submission-checklist.tsx** - Checklist display:
   - Receives checklist with items JSONB array
   - Types items as `Array<{ label: string, completed: boolean, completed_at?: string }>`
   - Progress bar showing completion percentage
   - Completion text: "X of Y items complete (Z%)"
   - Maps over items, renders ChecklistItem for each

2. **app/(dashboard)/submissions/[grantId]/components/checklist-item.tsx** - Optimistic checkbox:
   - useState for local checked state
   - useTransition for non-blocking server action
   - On change: set state immediately (optimistic), call `updateChecklistItem()` in transition
   - Rollback to `!newChecked` on error
   - Checkbox disabled during transition (isPending)
   - Label has line-through and text-muted-foreground when checked

3. **app/(dashboard)/submissions/[grantId]/components/auto-submit-button.tsx** - Auto-submit trigger:
   - "Auto-Submit" button with Upload icon
   - Calls `triggerAutoSubmission(grantId, portalUrl)` server action
   - Shows WorkflowProgress component after triggering
   - Disabled with tooltip if portalUrl is null: "No portal URL available for this grant"
   - Loading state with spinner

4. **app/(dashboard)/submissions/[grantId]/components/manual-submit-form.tsx** - Manual submission form:
   - React Hook Form with Zod validation schema:
     ```
     confirmation_number: string min(1)
     submitted_at: string (datetime-local format)
     notes: string optional
     ```
   - shadcn Form components (FormField, FormItem, FormLabel, FormControl, FormMessage)
   - Wrapped in Collapsible with header "Log Manual Submission"
   - Default submitted_at to current date/time
   - On success: reset form and close collapsible
   - "Log Submission" button with FileCheck icon

5. **app/(dashboard)/submissions/[grantId]/components/submission-history.tsx** - Timeline display:
   - CSS-based timeline with left border line and event dots
   - Each event shows:
     - Icon: Upload (auto) or FileCheck (manual)
     - Method badge: "Auto-Submitted" or "Manual Submission"
     - Status badge: CheckCircle2 (completed), Clock (pending), XCircle (failed)
     - Timestamp with `formatDistanceToNow(submitted_at, { addSuffix: true })`
     - Confirmation number (font-mono)
     - Notes (if exists, muted text)
   - Events ordered by submitted_at descending (most recent first)
   - Empty state: "No submissions yet."

**Added Component:**
- components/ui/collapsible.tsx: shadcn Collapsible component (via `npx shadcn@latest add collapsible`)

**Commit:** 1ef2375

## Patterns Followed

1. **Optimistic UI Updates:**
   - useState for immediate local state change
   - useTransition for non-blocking server action call
   - Rollback on error
   - Disabled state during pending transition

2. **Realtime Subscriptions:**
   - Subscribe to submission_checklists and submissions tables
   - Filter by grant_id
   - Call router.refresh() on any change
   - Cleanup on unmount with removeChannel()

3. **Fire-and-Forget with Workflow Tracking:**
   - Server action returns workflowId immediately
   - WorkflowProgress component subscribes to workflow_executions
   - Auto-refreshes page on completion

4. **Form Validation:**
   - React Hook Form + Zod schema
   - shadcn Form components throughout
   - Default values for better UX

5. **CSS Timeline:**
   - Relative positioning with absolute border line
   - Flex layout for icon + content
   - No external timeline library needed

## Deviations from Plan

None - plan executed exactly as written.

## Verification

1. `app/(dashboard)/submissions/page.tsx` - Fetches grants with urgency badges and submission status
2. `app/(dashboard)/submissions/[grantId]/page.tsx` - Fetches grant, checklist, and submissions
3. `app/(dashboard)/submissions/[grantId]/components/submission-page-client.tsx` - Has Realtime subscriptions
4. `app/(dashboard)/submissions/[grantId]/components/urgency-badge.tsx` - Uses calculateUrgency from lib/utils/urgency.ts
5. `app/(dashboard)/submissions/[grantId]/components/checklist-item.tsx` - Uses useState + useTransition for optimistic updates
6. `app/(dashboard)/submissions/[grantId]/components/auto-submit-button.tsx` - Calls triggerAutoSubmission and shows WorkflowProgress
7. `app/(dashboard)/submissions/[grantId]/components/manual-submit-form.tsx` - Uses React Hook Form + Zod with shadcn Form components
8. `app/(dashboard)/submissions/[grantId]/components/submission-history.tsx` - Renders timeline with method icons and status badges
9. `app/(dashboard)/submissions/[grantId]/components/submission-checklist.tsx` - Renders progress bar with completion percentage
10. `npx tsc --noEmit` - Zero TypeScript errors for submission components

## Self-Check

Verifying created files exist:

- FOUND: app/(dashboard)/submissions/page.tsx
- FOUND: app/(dashboard)/submissions/[grantId]/page.tsx
- FOUND: app/(dashboard)/submissions/[grantId]/components/submission-page-client.tsx
- FOUND: app/(dashboard)/submissions/[grantId]/components/urgency-badge.tsx
- FOUND: app/(dashboard)/submissions/[grantId]/components/submission-checklist.tsx
- FOUND: app/(dashboard)/submissions/[grantId]/components/checklist-item.tsx
- FOUND: app/(dashboard)/submissions/[grantId]/components/auto-submit-button.tsx
- FOUND: app/(dashboard)/submissions/[grantId]/components/manual-submit-form.tsx
- FOUND: app/(dashboard)/submissions/[grantId]/components/submission-history.tsx
- FOUND: components/ui/collapsible.tsx

Verifying commits exist:

- FOUND commit: 366e529 (Task 1: submissions list and grant submission detail pages)
- FOUND commit: 1ef2375 (Task 2: checklist, auto-submit, manual form, and history components)

**Self-Check: PASSED**
