---
phase: 05-budget-builder-submission-tracking
plan: 02
subsystem: budget-builder-ui
tags: [tanstack-table, react-hook-form, dynamic-forms, realtime, templates]
dependency_graph:
  requires:
    - Budget server actions (05-01)
    - shadcn form components (05-01)
    - WorkflowProgress component (Phase 4)
    - Realtime subscription pattern (Phase 3)
  provides:
    - Budget list page with TanStack table
    - Budget form with dynamic line items
    - Budget template loading system
    - Budget detail page with edit and AI narrative
  affects:
    - app/(dashboard)/budgets/** (complete UI implementation)
tech_stack:
  added:
    - @radix-ui/react-alert-dialog: Confirmation dialogs
    - sonner: Toast notifications (replaced deprecated toast)
  patterns:
    - TanStack Table with global filter and sorting
    - React Hook Form useFieldArray for dynamic line items
    - useWatch for reactive total calculation (NOT watch() in useEffect)
    - fire-and-forget n8n workflow triggers with WorkflowProgress tracking
    - Realtime subscriptions for live budget updates
    - field.id as React key (NOT array index) for dynamic arrays
key_files:
  created:
    - app/(dashboard)/budgets/page.tsx: Budget list server component
    - app/(dashboard)/budgets/components/budget-page-client.tsx: Client wrapper with Realtime
    - app/(dashboard)/budgets/components/budget-table.tsx: TanStack table for budget list
    - app/(dashboard)/budgets/components/budget-form.tsx: Dynamic budget form with useFieldArray
    - app/(dashboard)/budgets/components/template-selector.tsx: Template loader for forms
    - app/(dashboard)/budgets/new/page.tsx: New budget server component
    - app/(dashboard)/budgets/new/new-budget-client.tsx: New budget client with grant selector
    - app/(dashboard)/budgets/[id]/page.tsx: Budget detail server component
    - app/(dashboard)/budgets/[id]/components/budget-detail-client.tsx: Detail page with edit, narrative, actions
    - components/ui/alert-dialog.tsx: shadcn AlertDialog component
    - components/ui/sonner.tsx: shadcn Sonner toast component
  modified:
    - package.json: Added alert-dialog and sonner dependencies
    - package-lock.json: Locked new dependencies
decisions:
  - Use TanStack Table following established patterns from proposals and documents
  - Use useWatch (not watch() in useEffect) for reactive total calculation to avoid infinite loops
  - Use field.id (not array index) as React key for dynamic line items to prevent reconciliation bugs
  - Use sonner for toasts instead of deprecated shadcn toast component
  - Reuse WorkflowProgress component from pipeline for narrative generation tracking
  - Grant selector in new budget page (user picks grant before creating budget)
  - Realtime subscription pattern: router.refresh() on budget changes for server data reload
  - Number input onChange conversion: parseFloat(e.target.value) || 0 for proper form state
metrics:
  duration_minutes: 6
  completed_date: 2026-02-16
---

# Phase 5 Plan 2: Budget Builder UI Summary

Complete budget management UI with TanStack table list, dynamic line item form using React Hook Form useFieldArray, template loading, and detail page with AI narrative generation.

## Objective

Build the Budget Builder UI: budget list page with TanStack table, new budget form with React Hook Form useFieldArray for dynamic line items, template loading, budget detail page with edit form and AI narrative trigger.

## What Was Built

### Task 1: Budget List Page with TanStack Table

**Created Files:**

1. **app/(dashboard)/budgets/page.tsx** - Budget list server component:
   - Fetches budgets via getBudgets() server action
   - Renders BudgetPageClient with initial data

2. **app/(dashboard)/budgets/components/budget-page-client.tsx** - Client wrapper:
   - Realtime subscription on budgets table for INSERT, UPDATE, DELETE events
   - Calls router.refresh() on any change to reload server data
   - Renders page header with "New Budget" button linking to /budgets/new
   - Renders BudgetTable with budgets data

3. **app/(dashboard)/budgets/components/budget-table.tsx** - TanStack Table:
   - Columns: Budget Name (link to detail), Grant Title (or "Template"), Total Amount (formatted as currency), Narrative Status (badge: "Generated" green or "Pending" gray), Updated (relative time with formatDistanceToNow)
   - Global filter for search across all fields
   - Sortable columns with getCoreRowModel, getFilteredRowModel, getSortedRowModel
   - Row click navigation to /budgets/{id}
   - Empty state: "No budgets yet. Create your first budget."

**Patterns:** Follows proposal-table.tsx and document-table.tsx patterns exactly.

**Commit:** 33d89f4

### Task 2: Budget Form, Template Selector, and Detail Page

**Created Files:**

1. **app/(dashboard)/budgets/components/budget-form.tsx** - Dynamic budget form:
   - Zod schema: budgetSchema with grant_id, name, line_items array (min 1)
   - lineItemSchema: category (enum), description (min 1), amount (number min 0), justification (optional)
   - React Hook Form with zodResolver, useFieldArray for line_items
   - useWatch on line_items for reactive total calculation (NOT watch() in useEffect to avoid infinite loops)
   - Each line item row: category Select (personnel/fringe/travel/equipment/supplies/contractual/other/indirect), description Input, amount Input (type="number" with parseFloat conversion), justification Input, remove button (Trash2 icon)
   - "Add Line Item" button uses append()
   - Use field.id as React key (NOT array index) to prevent reconciliation issues on remove
   - Total displayed below items, formatted as currency
   - Props: grantId, defaultValues (for edit mode), templates, onSubmit, isEdit
   - Renders TemplateSelector above line items when creating new budget (not in edit mode)
   - Submit button: "Create Budget" or "Save Changes" depending on mode

2. **app/(dashboard)/budgets/components/template-selector.tsx** - Template loader:
   - Select dropdown showing template names
   - On select, calls loadBudgetTemplate(templateId) server action
   - Uses form.reset() to populate line items from template data
   - Shows success toast on load
   - Empty state if no templates exist

3. **app/(dashboard)/budgets/new/page.tsx** - New budget server component:
   - Fetches budget templates via getBudgetTemplates()
   - Fetches grants for grant picker
   - Renders NewBudgetClient with grants and templates

4. **app/(dashboard)/budgets/new/new-budget-client.tsx** - New budget client:
   - Grant selector (Select dropdown with grant titles)
   - User must select grant before budget form appears
   - Renders BudgetForm with selected grant_id
   - On submit, calls createBudget() server action then redirects to /budgets

5. **app/(dashboard)/budgets/[id]/page.tsx** - Budget detail server component:
   - Fetches budget with line items via getBudget(params.id)
   - Handles not found with notFound()
   - Renders BudgetDetailClient with budget, line items, grant data

6. **app/(dashboard)/budgets/[id]/components/budget-detail-client.tsx** - Detail page:
   - Renders BudgetForm in edit mode with existing budget data as defaultValues
   - On form submit, calls updateBudget() server action
   - Action buttons:
     - "Generate Narrative" - calls triggerBudgetNarrative(), shows WorkflowProgress component while generating
     - "Save as Template" - opens dialog asking for template name, calls saveBudgetAsTemplate()
     - "Delete Budget" - opens AlertDialog confirmation, calls deleteBudget() and redirects to /budgets
   - Narrative display section: if budget.narrative exists, renders in prose-styled div. If not, shows "No narrative generated yet."
   - Realtime subscription on budgets table filtered by budget.id for live narrative updates. On update, calls router.refresh()
   - WorkflowProgress reused from app/(dashboard)/pipeline/[id]/components/workflow-progress.tsx

7. **components/ui/alert-dialog.tsx** - shadcn AlertDialog component (added via npx shadcn add)

8. **components/ui/sonner.tsx** - shadcn Sonner toast component (added via npx shadcn add)

**Commit:** ee3fa4f

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing use-toast hook and alert-dialog component**
- **Found during:** Task 2 TypeScript compilation
- **Issue:** Components imported @/hooks/use-toast and @/components/ui/alert-dialog which didn't exist
- **Fix:** Added shadcn alert-dialog and sonner components via CLI. Updated all toast calls to use sonner API (toast.success, toast.error) instead of deprecated useToast hook
- **Files modified:** All budget client components updated to import and use sonner
- **Commit:** Included in ee3fa4f

**2. [Rule 3 - Blocking] TypeScript errors with react-hook-form and z.coerce.number()**
- **Found during:** Task 2 TypeScript compilation
- **Issue:** z.coerce.number() inferred as unknown type causing Control type mismatches. z.enum required_error param deprecated
- **Fix:** Changed z.coerce.number() to z.number(), added explicit parseFloat conversion in Input onChange. Changed required_error to message in z.enum
- **Files modified:** app/(dashboard)/budgets/components/budget-form.tsx
- **Commit:** Included in ee3fa4f

## Patterns Followed

1. **TanStack Table:**
   - useReactTable with getCoreRowModel, getFilteredRowModel, getSortedRowModel
   - Global filter input above table
   - Sortable column headers
   - Empty state handling
   - Row click navigation

2. **React Hook Form Dynamic Arrays:**
   - useFieldArray for line_items
   - field.id as React key (NOT index) to prevent bugs on remove
   - useWatch for reactive calculations (NOT watch() in useEffect)
   - Proper FormField > render > FormItem > FormLabel + FormControl + FormMessage structure

3. **Realtime Subscriptions:**
   - Supabase channel subscription on budgets table
   - router.refresh() to reload server data on changes
   - Cleanup on unmount

4. **Fire-and-Forget n8n Workflows:**
   - Trigger server action returns workflowId immediately
   - WorkflowProgress component subscribes to workflow_executions
   - Auto-refresh page on workflow completion

## Verification

1. Budget list page at /budgets shows TanStack table with all budgets - VERIFIED
2. "New Budget" page at /budgets/new renders form with grant selector and template loader - VERIFIED
3. Budget form supports adding/removing line items dynamically - VERIFIED (useFieldArray with append/remove)
4. Total amount recalculates as line item amounts change - VERIFIED (useWatch reactive calculation)
5. Template selector loads template line items into form - VERIFIED (loadBudgetTemplate + form.reset)
6. Budget detail page at /budgets/{id} shows edit form with existing data - VERIFIED
7. "Generate Narrative" triggers n8n workflow and shows progress - VERIFIED (WorkflowProgress component)
8. "Save as Template" saves budget structure as reusable template - VERIFIED (dialog + saveBudgetAsTemplate)
9. AI-generated narrative displays below budget form when available - VERIFIED (prose-styled div)
10. npx tsc --noEmit passes with zero errors - VERIFIED (0 errors)

## Self-Check

Verifying created files exist:

- FOUND: app/(dashboard)/budgets/page.tsx
- FOUND: app/(dashboard)/budgets/components/budget-page-client.tsx
- FOUND: app/(dashboard)/budgets/components/budget-table.tsx
- FOUND: app/(dashboard)/budgets/components/budget-form.tsx
- FOUND: app/(dashboard)/budgets/components/template-selector.tsx
- FOUND: app/(dashboard)/budgets/new/page.tsx
- FOUND: app/(dashboard)/budgets/new/new-budget-client.tsx
- FOUND: app/(dashboard)/budgets/[id]/page.tsx
- FOUND: app/(dashboard)/budgets/[id]/components/budget-detail-client.tsx
- FOUND: components/ui/alert-dialog.tsx
- FOUND: components/ui/sonner.tsx

Verifying commits exist:

- FOUND commit: 33d89f4 (Task 1: budget list page with TanStack table)
- FOUND commit: ee3fa4f (Task 2: budget form with dynamic line items and detail page)

**Self-Check: PASSED**
