---
status: complete
phase: 05-budget-builder-submission-tracking
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md]
started: 2026-02-16T12:00:00Z
updated: 2026-02-16T12:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Budget List Page
expected: Navigate to /budgets. Table with columns: Budget Name, Grant Title, Total Amount, Narrative Status, Updated. Search input. Empty state if no budgets.
result: pass

### 2. Create New Budget with Dynamic Line Items
expected: Grant selector, budget form with dynamic line items, add/remove rows, real-time total, submit redirects.
result: pass

### 3. Load Budget Template
expected: Template dropdown populates form line items from saved template.
result: skipped
reason: User moved to Phase 6

### 4. Budget Detail Page with Edit
expected: Pre-populated edit form with action buttons.
result: skipped
reason: User moved to Phase 6

### 5. Generate Budget Narrative
expected: Trigger n8n workflow, progress indicator, narrative displays.
result: skipped
reason: User moved to Phase 6

### 6. Save Budget as Template
expected: Dialog for template name, success toast, appears in template selector.
result: skipped
reason: User moved to Phase 6

### 7. Delete Budget
expected: Confirmation dialog, deletes and redirects.
result: skipped
reason: User moved to Phase 6

### 8. Submissions List with Urgency Badges
expected: Grants table with deadline urgency badges, ordered by deadline.
result: skipped
reason: User moved to Phase 6

### 9. Submission Detail Page with Checklist
expected: Grant title with urgency badge, two-column layout, generate checklist button.
result: skipped
reason: User moved to Phase 6

### 10. Checklist Optimistic Updates
expected: Instant checkbox toggle, progress bar updates, rollback on error.
result: skipped
reason: User moved to Phase 6

### 11. Auto-Submit and Manual Submit
expected: Auto-submit triggers n8n, manual form logs submission.
result: skipped
reason: User moved to Phase 6

### 12. Submission History Timeline
expected: Vertical timeline with method/status badges and timestamps.
result: skipped
reason: User moved to Phase 6

## Summary

total: 12
passed: 2
issues: 0
pending: 0
skipped: 10

## Gaps

[none]
