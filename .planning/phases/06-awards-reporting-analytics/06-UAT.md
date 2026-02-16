---
status: complete
phase: 06-awards-reporting-analytics
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md]
started: 2026-02-16T03:30:00Z
updated: 2026-02-16T03:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Awards List Page
expected: Navigate to /awards. Page shows "Awards" heading with "Record Award" button. TanStack Table with columns: Grant Title, Funder, Amount, Award Period, Award Date. Empty state if no awards. Search filter available.
result: pass

### 2. Record New Award
expected: Click "Record Award" or navigate to /awards/new. Form shows grant selector dropdown, amount input, three Calendar date pickers (Award Date, Start Date, End Date), and requirements textarea. Selecting a date picker opens a Calendar popover. Submitting creates an award and redirects to /awards.
result: pass

### 3. Award Detail View
expected: Click an award row or navigate to /awards/{id}. Two-column layout: left side shows award info card (grant title, amount, award date, period, requirements) plus report list and editor. Right side shows reporting calendar and action buttons.
result: pass

### 4. Reporting Calendar
expected: On award detail page, right column shows a Calendar component. Report due dates are highlighted (bold/underline for upcoming, red background for overdue, green for completed). Clicking a date with a report selects that report.
result: pass

### 5. Add Report
expected: On award detail page, "Add Report" button opens a dialog with report type selector (interim/final), title input, and due date Calendar picker. Submitting creates a report record that appears in the report list.
result: pass

### 6. Generate AI Report
expected: "Generate Report" button shows a dropdown of draft reports. Selecting one triggers AI report generation. WorkflowProgress component appears showing generation status (pending -> running -> completed).
result: pass

### 7. Report Editor
expected: Clicking a report in the list opens Tiptap editor below with toolbar (Bold, Italic, Heading, Lists, Blockquote). Typing content triggers autosave after 2 seconds. "Saving..." indicator appears briefly, then "Saved".
result: pass

### 8. Mark Report Submitted
expected: In the report editor, "Mark as Submitted" button changes report status. Report list updates to show submitted status icon (green checkmark). Button is disabled after submission.
result: pass

### 9. Analytics Dashboard - Metrics Cards
expected: Navigate to /analytics. Page shows "Analytics" heading. Four KPI cards in a grid: Win Rate (percentage), Pipeline Value (currency), Avg Time to Submit (days), Total Awarded (currency with count). Cards have icons (Trophy, DollarSign, Clock, Award).
result: skipped
reason: User satisfied with testing, proceeding to push

### 10. Success Rate by Funder Chart
expected: Below metrics cards, a bar chart titled "Success Rate by Funder" renders using Recharts. Bars show success rate percentage per funder. Hovering shows tooltip with percentage value. If no data, empty state message appears.
result: skipped
reason: User satisfied with testing, proceeding to push

### 11. Pipeline Breakdown
expected: A "Pipeline Breakdown" card shows each grant stage (Discovery, Screening, Drafting, Submission, Awarded, Reporting, Closed) with count badges and color-coded progress bars showing percentage of total.
result: skipped
reason: User satisfied with testing, proceeding to push

### 12. Realtime Updates
expected: On the awards list page, if an award is created in another tab or by n8n, the table refreshes automatically without page reload. On the award detail page, new reports appear live.
result: skipped
reason: User satisfied with testing, proceeding to push

## Summary

total: 12
passed: 8
issues: 0
pending: 0
skipped: 4

## Gaps

[none]
