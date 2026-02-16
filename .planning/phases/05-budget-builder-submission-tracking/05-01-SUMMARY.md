---
phase: 05-budget-builder-submission-tracking
plan: 01
subsystem: budget-submission-infrastructure
tags: [server-actions, form-dependencies, webhooks, urgency-calculation]
dependency_graph:
  requires:
    - workflow_executions table (Phase 2)
    - budgets and budget_line_items tables (Phase 1)
    - submission_checklists and submissions tables (Phase 1)
    - fire-and-forget n8n webhook pattern (Phase 2)
  provides:
    - Budget CRUD server actions
    - Budget template system (save/load)
    - Budget narrative generation trigger
    - Submission checklist management
    - Auto-submission and manual logging
    - Urgency calculation utilities
  affects:
    - app/api/webhook/route.ts (3 new action handlers)
tech_stack:
  added:
    - react-hook-form: Form state management for budget builder
    - zod: Schema validation for budget forms
    - '@hookform/resolvers': Zod integration with React Hook Form
    - shadcn/ui form: Form components with React Hook Form integration
    - shadcn/ui checkbox: Checkbox component for checklist items
  patterns:
    - Fire-and-forget n8n webhook triggers
    - Server action authentication and org_id lookup
    - JSONB storage for checklist items
    - is_template flag for budget templates
key_files:
  created:
    - lib/utils/urgency.ts: Deadline urgency calculation (overdue/critical/urgent/soon/normal)
    - app/(dashboard)/budgets/actions.ts: 9 budget server actions
    - app/(dashboard)/submissions/actions.ts: 6 submission server actions
    - components/ui/form.tsx: shadcn Form component
    - components/ui/checkbox.tsx: shadcn Checkbox component
  modified:
    - app/api/webhook/route.ts: Added insert_budget_narrative, submission_complete, insert_checklist handlers
    - package.json: Added form dependencies
decisions:
  - Use is_template boolean flag on budgets table instead of separate templates table
  - Store checklist items as JSONB array instead of separate table rows
  - Delete and recreate line items on update (simpler than diff for v1)
  - Use date-fns for urgency calculations (already installed)
  - Follow established fire-and-forget pattern for all n8n triggers
metrics:
  duration_minutes: 3
  completed_date: 2026-02-16
---

# Phase 5 Plan 1: Budget & Submission Infrastructure Summary

Budget and submission server actions with form dependencies, urgency utilities, and n8n webhook handlers established.

## Objective

Install Phase 5 dependencies (react-hook-form, zod, @hookform/resolvers, shadcn form + checkbox + badge), create all budget and submission server actions, extend the webhook route for n8n callbacks, and create the urgency calculation utility to establish the complete data layer before UI development.

## What Was Built

### Task 1: Form Dependencies and shadcn Components

**Installed:**
- react-hook-form (7.71.1): Form state management
- zod (4.3.6): Schema validation
- @hookform/resolvers (5.2.2): Zod integration with React Hook Form

**Added Components:**
- components/ui/form.tsx: shadcn Form component with React Hook Form integration
- components/ui/checkbox.tsx: shadcn Checkbox component for checklist items
- components/ui/badge.tsx: Already existed from previous phases

**Commit:** b2e6dd5

### Task 2: Budget Actions, Submission Actions, Webhook Extensions, Urgency Utility

**Created Files:**

1. **lib/utils/urgency.ts** - Deadline urgency calculation utility:
   - `calculateUrgency(deadline: Date): UrgencyLevel` - Returns overdue/critical/urgent/soon/normal based on deadline proximity using date-fns
   - `getUrgencyBadgeVariant(level: UrgencyLevel)` - Maps urgency to shadcn Badge variants
   - `getUrgencyLabel(level: UrgencyLevel)` - Human-readable labels

2. **app/(dashboard)/budgets/actions.ts** - 9 server actions:
   - `getBudgets()` - Fetch all budgets for user's org (is_template = false)
   - `getBudget(budgetId)` - Fetch single budget with line items and grant data
   - `createBudget(data)` - Insert budget with line items, calculate total_amount
   - `updateBudget(budgetId, data)` - Update budget, delete/recreate line items if provided
   - `deleteBudget(budgetId)` - Delete budget (line items cascade)
   - `getBudgetTemplates()` - Fetch all templates (is_template = true)
   - `saveBudgetAsTemplate(budgetId, templateName)` - Copy budget as template
   - `loadBudgetTemplate(templateId)` - Fetch template data for form population
   - `triggerBudgetNarrative(budgetId)` - Fire-and-forget to n8n for AI narrative generation

3. **app/(dashboard)/submissions/actions.ts** - 6 server actions:
   - `getSubmissionChecklist(grantId)` - Fetch checklist (JSONB items), return null if not found
   - `generateChecklist(grantId)` - Fire-and-forget to n8n for AI checklist generation
   - `updateChecklistItem(checklistId, itemIndex, completed)` - Update item in JSONB array, recalculate completion_percentage
   - `triggerAutoSubmission(grantId, portalUrl)` - Fire-and-forget to n8n for auto-submission
   - `logManualSubmission(grantId, data)` - Insert manual submission record
   - `getSubmissions(grantId)` - Fetch all submissions for a grant

**Extended File:**

4. **app/api/webhook/route.ts** - Added 3 new n8n callback handlers:
   - `insert_budget_narrative` - Update budget.narrative from n8n
   - `submission_complete` - Insert submission record from n8n auto-submit workflow
   - `insert_checklist` - Upsert submission_checklists with JSONB items and completion_percentage

**Commit:** 4b4eebf

## Patterns Followed

1. **Fire-and-Forget n8n Triggers:**
   - Insert workflow_executions record
   - Fire-and-forget fetch to N8N_WEBHOOK_URL
   - Return workflowId immediately
   - n8n calls back via service-role webhook when complete

2. **Server Action Structure:**
   - Auth check with `supabase.auth.getUser()`
   - Lookup org_id from profiles table
   - Execute database operations
   - Call `revalidatePath()` when needed (skip for autosave/optimistic UI)

3. **Template System:**
   - Budget templates use `is_template: true` flag on budgets table (not separate table)
   - Templates have `grant_id: null`
   - Line items are copied when creating template

4. **Checklist Storage:**
   - Items stored as JSONB array on submission_checklists table
   - Expected structure: `Array<{ label: string, completed: boolean, completed_at?: string }>`
   - completion_percentage calculated on update

5. **Budget Line Items:**
   - Delete and recreate on update (simpler than diff for v1)
   - sort_order based on array index
   - category uses budget_category enum (personnel/fringe/travel/equipment/supplies/contractual/other/indirect)

## Deviations from Plan

None - plan executed exactly as written.

## Verification

1. `npm ls react-hook-form zod @hookform/resolvers` - All dependencies installed
2. `components/ui/form.tsx`, `components/ui/checkbox.tsx`, `components/ui/badge.tsx` - All components exist
3. `app/(dashboard)/budgets/actions.ts` - Exports all 9 server actions
4. `app/(dashboard)/submissions/actions.ts` - Exports all 6 server actions
5. `app/api/webhook/route.ts` - Contains 13 total action handlers (10 existing + 3 new)
6. `lib/utils/urgency.ts` - Exports calculateUrgency, getUrgencyBadgeVariant, getUrgencyLabel, UrgencyLevel
7. `npx tsc --noEmit` - Zero TypeScript errors

## Self-Check

Verifying created files exist:

- FOUND: lib/utils/urgency.ts
- FOUND: app/(dashboard)/budgets/actions.ts
- FOUND: app/(dashboard)/submissions/actions.ts
- FOUND: components/ui/form.tsx
- FOUND: components/ui/checkbox.tsx

Verifying commits exist:

- FOUND commit: b2e6dd5 (Task 1: form dependencies and shadcn components)
- FOUND commit: 4b4eebf (Task 2: server actions and webhook handlers)

**Self-Check: PASSED**
