# Phase 5: Budget Builder & Submission Tracking - Research

**Researched:** 2026-02-16
**Domain:** Budget management with dynamic line items, AI narrative generation integration, submission checklist tracking, deadline urgency indicators, form automation
**Confidence:** HIGH

## Summary

Phase 5 delivers the final pre-submission features: budget creation with AI narrative generation and comprehensive submission tracking. Users create budgets with dynamic line items (using React Hook Form's `useFieldArray`), trigger AI budget narrative generation (via n8n), save budget templates for reuse (stored as JSONB in Supabase), generate dynamic submission checklists with urgency indicators (calculated via date-fns), check off items as they complete them (optimistic updates), trigger auto-submission via n8n Puppeteer, log manual submissions, and view submission status/history.

The primary technical challenges are: (1) managing dynamic budget line items with real-time total calculation, (2) persisting and loading budget templates, (3) displaying checklists with deadline urgency color coding, (4) optimistic UI updates for checkbox state, (5) triggering Puppeteer automation for portal submissions, and (6) displaying submission history timeline.

**Key technical insights:**
1. React Hook Form's `useFieldArray` is the standard for managing dynamic budget line items (append/remove rows)
2. `useWatch` hook enables reactive total calculation without infinite render loops
3. Budget templates store line item structure as JSONB in `budget_templates` table for reuse
4. shadcn/ui Badge component with custom variants (destructive/warning/secondary) provides urgency indicators
5. Optimistic UI updates via TanStack Query or local state enable instant checkbox feedback before Supabase confirms
6. n8n Puppeteer nodes handle automated form submission to grant portals
7. Timeline component pattern displays submission history with status badges

**Primary recommendation:** Use React Hook Form + Zod + shadcn Form components for budget creation, store budget templates as JSONB for reusability, implement submission checklists with date-fns urgency calculations and optimistic checkbox updates, trigger n8n Puppeteer workflows for auto-submission, and display submission history with shadcn timeline/activity log patterns.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Hook Form | ^7.x (install) | Dynamic budget line item management with useFieldArray | Industry standard for complex forms, minimal re-renders, useFieldArray handles dynamic fields, pairs perfectly with shadcn Form |
| Zod | ^3.x (install) | Budget form validation schema | Type-safe validation, integrates with React Hook Form via zodResolver, already recommended by shadcn docs |
| @hookform/resolvers | ^3.x (install) | Zod + React Hook Form integration | Official resolver for connecting Zod schemas to React Hook Form |
| date-fns | ^4.1.0 (installed) | Deadline urgency calculation (differenceInHours, differenceInDays) | Already in stack from Phase 3, provides precise date arithmetic for urgency levels |
| shadcn/ui Form | Part of shadcn/ui | Form wrapper with field composition | Official shadcn pattern for React Hook Form + Zod integration, provides FormField/FormItem components |
| shadcn/ui Badge | Part of shadcn/ui | Deadline urgency indicators (critical/urgent/soon) | Color-coded variants (destructive/warning/secondary) communicate urgency visually |
| shadcn/ui Checkbox | Part of shadcn/ui | Checklist item state management | Accessible, supports controlled state, integrates with React Hook Form |
| TanStack Table | @tanstack/react-table ^8.21.3 (installed) | Display budget list and submission history | Already proven in Phases 3-4, supports inline editing for budget line items |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | ^5.x (optional) | Optimistic checkbox updates with rollback | If implementing optimistic UI pattern (recommended for better UX) |
| lucide-react | ^0.563.0 (installed) | Icons for urgency badges, add/remove line item buttons | Already in stack via shadcn |
| shadcn Timeline (community) | Community component | Submission history display | Alternative to activity log table for chronological submission events |
| use-debounce | ^10.1.0 (installed) | Debounce budget total recalculation | Already in stack from Phase 3, prevents excessive re-calculations |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Hook Form + useFieldArray | Formik FieldArray | React Hook Form has better performance (fewer re-renders), useFieldArray more actively maintained in 2026 |
| Zod | Yup | Zod is TypeScript-first, better inference, pairs with tRPC (future consideration) |
| date-fns urgency calculation | moment.js | date-fns is modular/tree-shakeable, moment.js is deprecated/legacy |
| Optimistic updates | Server-first updates only | Optimistic updates provide instant feedback, better UX for high-confidence actions like checkbox toggles |
| JSONB template storage | Separate budget_template_items table | JSONB simplifies queries (single row per template), easier to clone templates, appropriate for unstructured line item data |

**Installation:**

```bash
# New dependencies for Phase 5
npm install react-hook-form zod @hookform/resolvers

# Add shadcn form components if not present
npx shadcn@latest add form checkbox badge

# Optional: TanStack Query for optimistic updates
npm install @tanstack/react-query
```

## Architecture Patterns

### Recommended Project Structure

```
app/
├── (dashboard)/
│   ├── budgets/
│   │   ├── page.tsx                         # Budget list (server component)
│   │   ├── new/
│   │   │   └── page.tsx                     # New budget form (server + client)
│   │   ├── [id]/
│   │   │   ├── page.tsx                     # Budget detail/edit (server + client)
│   │   ├── components/
│   │   │   ├── budget-table.tsx             # TanStack table with budgets (client)
│   │   │   ├── budget-form.tsx              # React Hook Form with useFieldArray (client)
│   │   │   ├── line-item-row.tsx            # Single line item with remove button (client)
│   │   │   ├── budget-total.tsx             # Calculated total display (client)
│   │   │   └── template-selector.tsx        # Load budget template dropdown (client)
│   │   └── actions.ts                       # Server actions: create/update budget, save template
│   ├── submissions/
│   │   ├── [grantId]/
│   │   │   ├── page.tsx                     # Submission page (server component)
│   │   │   └── components/
│   │   │       ├── submission-checklist.tsx # Checklist with urgency indicators (client)
│   │   │       ├── checklist-item.tsx       # Single checkbox item with optimistic update (client)
│   │   │       ├── urgency-badge.tsx        # Deadline urgency badge component (client)
│   │   │       ├── auto-submit-button.tsx   # Trigger Puppeteer auto-submit (client)
│   │   │       ├── manual-submit-form.tsx   # Log manual submission (client)
│   │   │       └── submission-history.tsx   # Timeline/activity log (client)
│   │   └── actions.ts                       # Server actions: update checklist, log submission
lib/
├── utils/
│   └── urgency.ts                            # Urgency calculation helpers (differenceInHours, etc.)
app/api/
└── webhook/
    └── route.ts                              # Extend webhook: insert_budget_narrative, submission_complete
```

### Pattern 1: Dynamic Budget Line Items with React Hook Form

**What:** Manage budget line items as a dynamic field array with add/remove functionality and real-time total calculation

**When to use:** Budget creation and editing forms

**Example:**

```typescript
// Source: React Hook Form useFieldArray docs + shadcn Form pattern
// app/(dashboard)/budgets/components/budget-form.tsx
'use client'

import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'

const lineItemSchema = z.object({
  category: z.string().min(1, 'Category required'),
  description: z.string().min(1, 'Description required'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
})

const budgetSchema = z.object({
  grant_id: z.string().uuid(),
  title: z.string().min(1, 'Budget title required'),
  line_items: z.array(lineItemSchema).min(1, 'At least one line item required'),
})

type BudgetFormValues = z.infer<typeof budgetSchema>

export function BudgetForm({ grantId, onSubmit }: { grantId: string; onSubmit: (data: BudgetFormValues) => Promise<void> }) {
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      grant_id: grantId,
      title: '',
      line_items: [{ category: '', description: '', amount: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'line_items',
  })

  // Watch line items for total calculation (useWatch prevents infinite loops)
  const lineItems = useWatch({
    control: form.control,
    name: 'line_items',
  })

  const total = lineItems?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Budget Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="FY2026 Project Budget" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Line Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ category: '', description: '', amount: 0 })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Line Item
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start border p-3 rounded-md">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <FormField
                  control={form.control}
                  name={`line_items.${index}.category`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} placeholder="Category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`line_items.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} placeholder="Description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`line_items.${index}.amount`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} type="number" placeholder="Amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center border-t pt-4">
          <p className="text-lg font-semibold">Total: ${total.toLocaleString()}</p>
          <Button type="submit">Save Budget</Button>
        </div>
      </form>
    </Form>
  )
}
```

**Why this works:** `useFieldArray` generates unique `field.id` for each line item (used as React key), preventing re-render bugs. `useWatch` observes line items and triggers total recalculation without infinite loops (unlike `watch()` in `useEffect`). Zod validation ensures data integrity before server action submission.

### Pattern 2: Budget Template Storage and Loading

**What:** Save budget line item structure as JSONB template for reuse, load template to populate new budget form

**When to use:** "Save as template" button on budget form, template selector dropdown on new budget page

**Example:**

```typescript
// Source: Supabase JSONB storage pattern + React Hook Form reset()
// app/(dashboard)/budgets/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function saveBudgetTemplate(data: {
  name: string
  line_items: Array<{ category: string; description: string; amount: number }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return { error: 'Profile not found' }

  // Store line items as JSONB
  const { data: template, error } = await supabase
    .from('budget_templates')
    .insert({
      org_id: profile.org_id,
      name: data.name,
      line_items: data.line_items, // Postgres JSONB column
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { success: true, template }
}

export async function loadBudgetTemplate(templateId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: template, error } = await supabase
    .from('budget_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (error) return { error: error.message }
  return { success: true, template }
}

// app/(dashboard)/budgets/components/template-selector.tsx
'use client'

import { useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { loadBudgetTemplate } from '../actions'

interface Template {
  id: string
  name: string
  line_items: Array<{ category: string; description: string; amount: number }>
}

export function TemplateSelector({
  templates,
  form
}: {
  templates: Template[]
  form: UseFormReturn<any>
}) {
  const handleTemplateSelect = async (templateId: string) => {
    const { success, template } = await loadBudgetTemplate(templateId)
    if (success && template) {
      // Reset form with template data
      form.reset({
        ...form.getValues(),
        line_items: template.line_items,
      })
    }
  }

  return (
    <Select onValueChange={handleTemplateSelect}>
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="Load from template" />
      </SelectTrigger>
      <SelectContent>
        {templates.map((template) => (
          <SelectItem key={template.id} value={template.id}>
            {template.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

**Why this works:** JSONB column stores unstructured line item array efficiently, enabling simple template cloning. `form.reset()` populates form fields with template data, preserving field registration and validation. Single query loads entire template (no JOIN needed).

### Pattern 3: Deadline Urgency Calculation with date-fns

**What:** Calculate time until deadline and assign urgency level (critical <24h, urgent <48h, soon <7d) with color-coded badges

**When to use:** Submission checklists, deadline displays, dashboard deadline calendar

**Example:**

```typescript
// Source: date-fns differenceInHours/differenceInDays documentation
// lib/utils/urgency.ts

import { differenceInHours, differenceInDays, isPast } from 'date-fns'

export type UrgencyLevel = 'overdue' | 'critical' | 'urgent' | 'soon' | 'normal'

export function calculateUrgency(deadline: Date): UrgencyLevel {
  if (isPast(deadline)) return 'overdue'

  const hoursUntil = differenceInHours(deadline, new Date())
  const daysUntil = differenceInDays(deadline, new Date())

  if (hoursUntil < 24) return 'critical'  // <24 hours
  if (hoursUntil < 48) return 'urgent'    // <48 hours
  if (daysUntil < 7) return 'soon'        // <7 days
  return 'normal'
}

export function getUrgencyBadgeVariant(level: UrgencyLevel) {
  switch (level) {
    case 'overdue': return 'destructive'
    case 'critical': return 'destructive'
    case 'urgent': return 'warning' // Custom variant or 'outline' with yellow classes
    case 'soon': return 'secondary'
    case 'normal': return 'outline'
  }
}

export function getUrgencyLabel(level: UrgencyLevel): string {
  switch (level) {
    case 'overdue': return 'Overdue'
    case 'critical': return 'Critical (<24h)'
    case 'urgent': return 'Urgent (<48h)'
    case 'soon': return 'Soon (<7d)'
    case 'normal': return 'On Track'
  }
}

// app/(dashboard)/submissions/[grantId]/components/urgency-badge.tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { calculateUrgency, getUrgencyBadgeVariant, getUrgencyLabel } from '@/lib/utils/urgency'

export function UrgencyBadge({ deadline }: { deadline: Date }) {
  const urgency = calculateUrgency(deadline)
  const variant = getUrgencyBadgeVariant(urgency)
  const label = getUrgencyLabel(urgency)

  return (
    <Badge variant={variant} className={urgency === 'urgent' ? 'bg-yellow-500 text-white' : ''}>
      {label}
    </Badge>
  )
}
```

**Why this works:** date-fns provides precise hour/day calculations without timezone bugs. Centralized urgency logic ensures consistent color coding across app. Badge variants communicate urgency visually without requiring user to read labels.

### Pattern 4: Optimistic Checkbox Updates for Checklist

**What:** Update checkbox state immediately in UI, then sync with Supabase, with rollback on error

**When to use:** Submission checklist item completion tracking

**Example:**

```typescript
// Source: TanStack Query optimistic updates pattern + Supabase
// app/(dashboard)/submissions/[grantId]/components/checklist-item.tsx
'use client'

import { useState, useTransition } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { updateChecklistItem } from '../actions'

interface ChecklistItemProps {
  id: string
  label: string
  initialChecked: boolean
}

export function ChecklistItem({ id, label, initialChecked }: ChecklistItemProps) {
  const [checked, setChecked] = useState(initialChecked)
  const [isPending, startTransition] = useTransition()

  const handleToggle = async (newChecked: boolean) => {
    // Optimistic update: set state immediately
    setChecked(newChecked)

    startTransition(async () => {
      const { error } = await updateChecklistItem(id, newChecked)

      // Rollback on error
      if (error) {
        setChecked(!newChecked)
        console.error('Failed to update checklist item:', error)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />
      <label
        htmlFor={id}
        className={`text-sm ${checked ? 'line-through text-muted-foreground' : ''}`}
      >
        {label}
      </label>
    </div>
  )
}
```

**Why this works:** Optimistic update provides instant visual feedback (no lag). Rollback on error prevents data inconsistency. `useTransition` marks update as non-blocking, preventing spinner during server action. Checkbox appears checked immediately, then syncs with Supabase.

### Pattern 5: Fire-and-Forget n8n Puppeteer Auto-Submission

**What:** Trigger n8n workflow with Puppeteer node to automate grant portal form submission

**When to use:** "Auto-submit" button on submission page for supported grant portals

**Example:**

```typescript
// Source: Established fire-and-forget pattern from Phases 3-4
// app/(dashboard)/submissions/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function triggerAutoSubmission(grantId: string, portalUrl: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return { error: 'Profile not found' }

  // Insert workflow execution record
  const { data: workflow } = await supabase
    .from('workflow_executions')
    .insert({
      org_id: profile.org_id,
      grant_id: grantId,
      workflow_name: 'auto-submit',
      status: 'running',
      webhook_url: '/webhook/submission-complete',
    })
    .select()
    .single()

  // Fire-and-forget: trigger n8n Puppeteer workflow
  if (process.env.N8N_WEBHOOK_URL) {
    fetch(`${process.env.N8N_WEBHOOK_URL}/auto-submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        grant_id: grantId,
        portal_url: portalUrl,
        workflow_id: workflow?.id,
      }),
    }).catch((err) => {
      console.error('n8n webhook failed:', err)
    })
  }

  return { success: true, workflowId: workflow?.id }
}

// n8n workflow structure (conceptual):
// 1. Webhook trigger receives grant_id, portal_url, workflow_id
// 2. Fetch grant + proposal + budget data from Supabase
// 3. Puppeteer node: navigate to portal_url
// 4. Puppeteer: fill form fields with grant data
// 5. Puppeteer: upload required documents
// 6. Puppeteer: submit form
// 7. Puppeteer: capture confirmation number/screenshot
// 8. POST to /api/webhook with action: 'submission_complete', data: { grant_id, confirmation_number, screenshot_url }
```

**Why this works:** n8n Puppeteer node handles browser automation (headless Chrome), avoiding complex browser control logic in Next.js. Fire-and-forget pattern prevents timeout issues. Webhook callback updates submission status and stores confirmation details.

### Pattern 6: Submission History Timeline Display

**What:** Display chronological submission events (draft saved, checklist completed, auto-submitted, manually logged) with status badges

**When to use:** Submission page to show user all submission activity

**Example:**

```typescript
// Source: shadcn timeline pattern + activity log table pattern
// app/(dashboard)/submissions/[grantId]/components/submission-history.tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, Upload, FileCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface SubmissionEvent {
  id: string
  type: 'checklist_completed' | 'auto_submitted' | 'manual_submitted' | 'draft_saved'
  timestamp: Date
  details: string
}

const eventIcons = {
  checklist_completed: CheckCircle2,
  auto_submitted: Upload,
  manual_submitted: FileCheck,
  draft_saved: Clock,
}

const eventLabels = {
  checklist_completed: 'Checklist Completed',
  auto_submitted: 'Auto-Submitted',
  manual_submitted: 'Manual Submission Logged',
  draft_saved: 'Draft Saved',
}

export function SubmissionHistory({ events }: { events: SubmissionEvent[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Submission History</h3>
      <div className="relative border-l-2 border-muted pl-6 space-y-6">
        {events.map((event, idx) => {
          const Icon = eventIcons[event.type]
          return (
            <div key={event.id} className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                <Icon className="h-2 w-2 text-primary-foreground" />
              </div>

              {/* Event content */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{eventLabels[event.type]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm">{event.details}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**Why this works:** Timeline pattern provides clear chronological view. Icons and badges make event types scannable. `formatDistanceToNow` from date-fns provides human-readable timestamps ("2 hours ago"). Left border with dots creates visual continuity.

### Anti-Patterns to Avoid

- **Don't use `watch()` in `useEffect` for total calculation:** Causes infinite render loops. Use `useWatch` hook instead.
- **Don't mutate `fields` array directly in useFieldArray:** Use `append`, `remove`, `update` methods. Direct mutation breaks React Hook Form state.
- **Don't store budget templates as separate table rows for each line item:** Use JSONB column for unstructured line item array. Easier to clone templates, simpler queries.
- **Don't calculate urgency on every render:** Memoize urgency calculation or calculate once in server component.
- **Don't skip optimistic updates for checkboxes:** Instant feedback is critical for UX. Checkbox lag feels broken.
- **Don't call Puppeteer from Next.js route handler:** n8n handles browser automation. Keep this pattern consistent with Phases 3-4.
- **Don't use `field.index` as React key in useFieldArray:** Use `field.id` (generated by React Hook Form). Index can change when items are removed/reordered, breaking React reconciliation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dynamic form field arrays | Manual state management with array manipulation | React Hook Form useFieldArray | Handles unique IDs, validation, nested errors, append/remove/reorder logic, TypeScript inference |
| Form validation | Custom validation functions and error state | Zod + zodResolver | Type-safe schemas, composable validators, runtime type checking, sharable with backend |
| Date urgency calculation | Custom date math with Date objects | date-fns differenceInHours/differenceInDays | Handles edge cases (DST, leap years, month boundaries), tree-shakeable, proven library |
| Optimistic UI updates | Custom rollback logic | TanStack Query or local state with useTransition | Handles race conditions, deduplication, error rollback, loading states |
| Browser automation for form submission | Custom Puppeteer script in Next.js | n8n Puppeteer node | Timeout handling, screenshot capture, error recovery, workflow orchestration, keeps automation in n8n |
| Timeline component | Custom CSS timeline with absolute positioning | shadcn community timeline component | Accessibility, responsive design, icon integration, proven pattern |

**Key insight:** Budget and submission tracking requires complex form state management (dynamic arrays, validation, real-time calculation) and deadline-driven UI (urgency indicators, checklist completion tracking). React Hook Form + Zod handle form complexity, date-fns handles deadline math, and n8n handles automation. Don't rebuild these capabilities.

## Common Pitfalls

### Pitfall 1: Infinite Re-renders with watch() in useEffect

**What goes wrong:** Using `watch()` to observe line items in `useEffect` for total calculation causes infinite render loop.

**Why it happens:** `watch()` triggers component re-render on every field change. If `useEffect` depends on watched values and updates state, it re-triggers the effect infinitely.

**How to avoid:**

```typescript
// BAD: infinite loop
const watchedLineItems = form.watch('line_items')
useEffect(() => {
  const total = watchedLineItems.reduce((sum, item) => sum + item.amount, 0)
  setTotal(total) // Causes re-render, triggers useEffect again
}, [watchedLineItems])

// GOOD: useWatch hook
const lineItems = useWatch({
  control: form.control,
  name: 'line_items',
})
const total = lineItems?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0
// Render total directly, no useEffect needed
```

**Warning signs:** Browser console shows "Maximum update depth exceeded" error, page freezes/becomes unresponsive.

### Pitfall 2: Using Array Index as Key in useFieldArray

**What goes wrong:** Removing a line item causes React to re-render wrong fields, losing user input.

**Why it happens:** Array index changes when items are removed. React reconciliation matches components by key, so `key={index}` causes mismatched components after removal.

**How to avoid:**

```typescript
// BAD: index as key
fields.map((field, index) => (
  <div key={index}> {/* WRONG */}
    {/* form fields */}
  </div>
))

// GOOD: field.id as key
fields.map((field) => (
  <div key={field.id}> {/* CORRECT */}
    {/* form fields */}
  </div>
))
```

**Verification:** Test by adding 3 line items, filling in data, then removing the middle item. With index key, third item's data appears in second position.

### Pitfall 3: Missing Rollback on Optimistic Update Failure

**What goes wrong:** Checkbox shows checked state, but Supabase update fails silently. UI state doesn't match database.

**Why it happens:** Optimistic update modifies local state, but error handling doesn't revert state on failure.

**How to avoid:**

```typescript
const handleToggle = async (newChecked: boolean) => {
  const previousChecked = checked
  setChecked(newChecked) // Optimistic

  const { error } = await updateChecklistItem(id, newChecked)

  if (error) {
    setChecked(previousChecked) // Rollback
    // Optionally: show toast notification
  }
}
```

**Warning signs:** User reports checklist items appearing checked after page refresh even though they unchecked them.

### Pitfall 4: Deadline Urgency Calculation Without Timezone Handling

**What goes wrong:** Urgency badges show wrong level for users in different timezones.

**Why it happens:** Date comparison uses browser local time instead of consistent timezone (UTC or deadline's timezone).

**How to avoid:**

```typescript
// Store deadlines as ISO strings with timezone in Supabase (timestamptz)
// Convert to Date objects in client
const deadline = new Date(grant.deadline) // Automatically handles timezone

// date-fns uses Date objects, which respect timezone
const hoursUntil = differenceInHours(deadline, new Date())
```

**Verification:** Test with deadline "2026-02-17T23:59:59Z" (UTC). User in EST (UTC-5) should see correct hours until deadline.

### Pitfall 5: Budget Template Line Items Not Validating After Load

**What goes wrong:** Loading template populates form, but validation errors appear for valid data.

**Why it happens:** `form.reset()` doesn't trigger validation. Schema expects specific structure, template data might have extra fields.

**How to avoid:**

```typescript
// Ensure template data matches form schema exactly
const handleTemplateSelect = async (templateId: string) => {
  const { success, template } = await loadBudgetTemplate(templateId)
  if (success && template) {
    // Map template data to match form schema
    const lineItems = template.line_items.map(item => ({
      category: item.category,
      description: item.description,
      amount: item.amount,
      // Omit extra fields from template JSONB
    }))

    form.reset({
      ...form.getValues(),
      line_items: lineItems,
    }, {
      keepDefaultValues: false, // Reset validation state
    })
  }
}
```

**Warning signs:** Form shows validation errors immediately after loading template, even though data looks correct.

## Code Examples

Verified patterns from official sources and established codebase patterns:

### Webhook Action for Budget Narrative Insert

```typescript
// app/api/webhook/route.ts (extend existing switch)
case 'insert_budget_narrative': {
  const { budget_id, narrative } = data
  await supabase
    .from('budgets')
    .update({ narrative, narrative_generated_at: new Date().toISOString() })
    .eq('id', budget_id)
  break
}

case 'submission_complete': {
  const { grant_id, confirmation_number, screenshot_url } = data
  await supabase
    .from('submissions')
    .insert({
      grant_id,
      submitted_at: new Date().toISOString(),
      confirmation_number,
      screenshot_url,
      submission_type: 'auto',
      status: 'completed',
    })
  break
}

case 'update_checklist_item': {
  const { id, completed } = data
  await supabase
    .from('checklist_items')
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq('id', id)
  break
}
```

### Manual Submission Form with Server Action

```typescript
// app/(dashboard)/submissions/[grantId]/components/manual-submit-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { logManualSubmission } from '../actions'

const manualSubmissionSchema = z.object({
  confirmation_number: z.string().min(1, 'Confirmation number required'),
  submitted_at: z.string().datetime('Invalid date'),
  notes: z.string().optional(),
})

type ManualSubmissionValues = z.infer<typeof manualSubmissionSchema>

export function ManualSubmitForm({ grantId }: { grantId: string }) {
  const form = useForm<ManualSubmissionValues>({
    resolver: zodResolver(manualSubmissionSchema),
    defaultValues: {
      confirmation_number: '',
      submitted_at: new Date().toISOString().slice(0, 16), // datetime-local format
      notes: '',
    },
  })

  const onSubmit = async (data: ManualSubmissionValues) => {
    const { error } = await logManualSubmission(grantId, data)
    if (error) {
      console.error('Failed to log submission:', error)
      return
    }
    form.reset()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="confirmation_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmation Number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="GRANT-2026-12345" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="submitted_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Submission Date/Time</FormLabel>
              <FormControl>
                <Input {...field} type="datetime-local" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Additional details..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Log Submission</Button>
      </form>
    </Form>
  )
}
```

### Generate Dynamic Checklist from Grant Requirements

```typescript
// app/(dashboard)/submissions/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function generateChecklist(grantId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch grant to determine required items
  const { data: grant } = await supabase
    .from('grants')
    .select('*, proposals(*), budgets(*), documents(*)')
    .eq('id', grantId)
    .single()

  if (!grant) return { error: 'Grant not found' }

  // Generate checklist items based on grant requirements
  const checklistItems = [
    { label: 'Complete proposal draft', completed: !!grant.proposals?.[0], order: 1 },
    { label: 'Create budget', completed: !!grant.budgets?.[0], order: 2 },
    { label: 'Upload required documents', completed: (grant.documents?.length || 0) > 0, order: 3 },
    { label: 'Review for quality', completed: false, order: 4 },
    { label: 'Final proofreading', completed: false, order: 5 },
  ]

  // Insert checklist items
  const { data: checklist, error } = await supabase
    .from('checklist_items')
    .insert(
      checklistItems.map(item => ({
        grant_id: grantId,
        label: item.label,
        completed: item.completed,
        order: item.order,
      }))
    )
    .select()

  if (error) return { error: error.message }
  return { success: true, checklist }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Formik + Yup | React Hook Form + Zod | ~2022-2023 | Better performance (fewer re-renders), TypeScript-first validation, smaller bundle size |
| moment.js for date calculations | date-fns | moment.js deprecated ~2020 | Tree-shakeable (smaller bundles), immutable API, actively maintained |
| Manual optimistic updates | TanStack Query mutations | TanStack Query v4+ (2022) | Built-in rollback, deduplication, loading states, cache invalidation |
| Separate table for template items | JSONB for template storage | Postgres 9.4+ (2014), widely adopted ~2020+ | Simpler queries, easier template cloning, appropriate for unstructured data |
| Custom timeline components | shadcn community timeline patterns | shadcn/ui adoption ~2023+ | Accessible, customizable, consistent with design system |

**Deprecated/outdated:**
- moment.js: Declared legacy project, use date-fns or Luxon instead
- Formik: Still maintained but React Hook Form has better performance
- Custom browser automation in Next.js: n8n Puppeteer nodes provide better orchestration

## Open Questions

1. **Budget template versioning: track changes to templates over time?**
   - What we know: JSONB stores current template structure
   - What's unclear: User expectation for template history (did old budgets use old template version?)
   - Recommendation: Start without versioning (simpler), add `template_version` column if users request historical tracking

2. **Checklist generation: static items or dynamic based on grant type?**
   - What we know: Requirements vary by grant portal (federal vs. foundation vs. corporate)
   - What's unclear: Can we infer checklist items from grant metadata, or do users need to customize?
   - Recommendation: Start with static baseline checklist (proposal, budget, documents, review), add customization if users request grant-specific items

3. **Auto-submission portal support: which portals can be automated?**
   - What we know: Puppeteer can automate most web forms
   - What's unclear: Which grant portals have stable form structures, which require CAPTCHA/2FA?
   - Recommendation: Start with 2-3 major portals (Grants.gov, Foundation Directory), expand based on user demand and portal stability

4. **Budget narrative placement: display with budget or separately?**
   - What we know: Budget narrative is AI-generated (n8n workflow), stored as text field
   - What's unclear: Should narrative appear inline with budget table, or on separate tab/accordion?
   - Recommendation: Display below budget table (single view), use Tiptap editor for inline editing (consistent with proposal sections from Phase 4)

## Sources

### Primary (HIGH confidence)

- [React Hook Form useFieldArray Documentation](https://react-hook-form.com/docs/usefieldarray) - Dynamic field array API, append/remove methods
- [React Hook Form useWatch Documentation](https://react-hook-form.com/docs/usewatch) - Reactive field observation without infinite loops
- [Zod Documentation](https://zod.dev/) - Schema validation, type inference
- [shadcn/ui Form Documentation](https://ui.shadcn.com/docs/forms/react-hook-form) - React Hook Form + Zod integration pattern
- [shadcn/ui Badge Component](https://ui.shadcn.com/docs/components/radix/badge) - Badge variants for urgency indicators
- [shadcn/ui Checkbox Component](https://ui.shadcn.com/docs/components/radix/checkbox) - Controlled checkbox state
- [date-fns Documentation](https://date-fns.org/) - differenceInHours, differenceInDays, isPast functions
- [Supabase JSON/JSONB Documentation](https://supabase.com/docs/guides/database/json) - JSONB column types, querying
- [TanStack Table Editable Data Example](https://tanstack.com/table/latest/docs/framework/react/examples/editable-data) - Inline editing pattern
- Phase 4 research (established patterns): fire-and-forget webhooks, n8n Puppeteer integration

### Secondary (MEDIUM confidence)

- [Building React Forms with React Hook Form, Zod and Shadcn - Wasp](https://wasp.sh/blog/2024/11/20/building-react-forms-with-ease-using-react-hook-form-and-zod) - Integration tutorial
- [TanStack Query Optimistic Updates Discussion](https://github.com/orgs/supabase/discussions/1753) - Optimistic update patterns with Supabase
- [shadcn Timeline Community Component](https://github.com/timDeHof/shadcn-timeline) - Timeline display pattern
- [n8n Puppeteer Node GitHub](https://github.com/drudge/n8n-nodes-puppeteer) - Browser automation capabilities
- [React Hook Form Calculate Total Discussion](https://github.com/react-hook-form/react-hook-form/discussions/3179) - Total calculation patterns with useWatch

### Tertiary (LOW confidence, needs verification)

- WebSearch results on form builder best practices (verified against official React Hook Form docs)
- WebSearch results on budget tracker patterns (general patterns, not library-specific)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - React Hook Form, Zod, date-fns verified via official docs; shadcn components verified via official component docs
- Architecture: HIGH - Patterns follow established React Hook Form + shadcn best practices, n8n Puppeteer pattern consistent with Phases 3-4
- Pitfalls: HIGH - useFieldArray key pitfall documented in React Hook Form issues, infinite loop with watch() is common React pattern, optimistic update rollback is TanStack Query best practice

**Research date:** 2026-02-16
**Valid until:** ~60 days (stable stack, React Hook Form and Zod slow-moving, shadcn components stable)
