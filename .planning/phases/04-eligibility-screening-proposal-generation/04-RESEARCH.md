# Phase 4: Eligibility Screening & Proposal Generation - Research

**Researched:** 2026-02-13
**Domain:** Long-running async operations, AI proposal generation, progress tracking, rich text editing, ProPublica 990 API integration, quality review UI
**Confidence:** HIGH

## Summary

Phase 4 delivers the core value proposition: AI-powered proposal generation and quality review. Users trigger n8n workflows to generate full proposals, analyze funders with ProPublica 990 data, and review drafts for quality issues. The primary technical challenges are: (1) tracking long-running workflow progress without blocking the UI, (2) displaying AI-generated proposal sections with inline editing, (3) presenting quality review scores/issues/suggestions, (4) integrating ProPublica 990 data for funder analysis.

**Key technical insights:**
1. Supabase Realtime subscriptions on `workflow_executions` table enable live progress updates
2. Tiptap (already installed in Phase 3) handles inline editing of proposal sections
3. ProPublica Nonprofit Explorer API v2 requires no authentication and provides organization + filing data by EIN
4. Fire-and-forget webhook pattern (established in Phase 3) continues for all n8n triggers
5. shadcn/ui accordion components are ideal for displaying proposal sections and quality review results

**Primary recommendation:** Use Supabase Realtime to subscribe to `workflow_executions.status` changes for live progress updates, leverage existing Tiptap editor for inline section editing, integrate ProPublica API calls from n8n (not Next.js), display proposal sections with shadcn accordion, and use dnd-kit for optional section reordering.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Realtime | Built into @supabase/supabase-js | Live workflow status updates via postgres_changes | Already proven in Phase 3 for document updates, enables progress tracking without polling |
| Tiptap | @tiptap/react ^3.19.0 (installed) | Inline rich text editing for proposal sections | Already installed from Phase 3, supports autosave with onUpdate, contentEditable control |
| TanStack Table | @tanstack/react-table ^8.21.3 (installed) | Display proposal list with filtering | Already installed, proven pattern for data display |
| shadcn/ui Accordion | Part of shadcn/ui | Expandable sections for proposal content and quality review | Clean UI for organizing multi-section content, accessible |
| ProPublica Nonprofit Explorer API v2 | Public API (no auth) | Funder 990 data by EIN | Standard nonprofit data source, no API key needed, updated annually by IRS |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 (installed) | Format timestamps for proposal generation | Already in stack, consistent date handling |
| lucide-react | ^0.563.0 (installed) | Icons for trigger buttons, status badges, quality scores | Already in stack via shadcn |
| @dnd-kit/core + @dnd-kit/sortable | ^6.x (optional) | Reorder proposal sections with drag-and-drop | Only if section reordering is required, pairs well with shadcn/ui |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Realtime | Polling with setInterval | Realtime uses WebSockets (more efficient), already proven in Phase 3, no manual polling logic |
| Tiptap | Lexical | Lexical is type-safe but Tiptap already installed and working from Phase 3 |
| ProPublica API | Manual 990 downloads | API provides structured JSON, manual download requires PDF parsing (complex) |
| shadcn Accordion | Tabs | Accordion better for long content that doesn't need comparison, tabs force side-by-side viewing |
| dnd-kit | SortableJS | dnd-kit is React-first, better TypeScript support, actively maintained in 2026 |

**Installation:**

```bash
# No new core dependencies needed (Tiptap, TanStack Table, shadcn already installed)

# Add shadcn accordion component if not present
npx shadcn@latest add accordion

# Optional: section reordering with drag-and-drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Architecture Patterns

### Recommended Project Structure

```
app/
├── (dashboard)/
│   ├── proposals/
│   │   ├── page.tsx                         # Proposal list (server component)
│   │   ├── [id]/
│   │   │   ├── page.tsx                     # Proposal detail (server component)
│   │   │   └── components/
│   │   │       ├── proposal-sections.tsx    # Section list with accordion (client)
│   │   │       ├── section-editor.tsx       # Inline Tiptap editor per section (client)
│   │   │       ├── quality-review.tsx       # Quality scores/issues display (client)
│   │   │       ├── funder-analysis.tsx      # Funder strategy brief + 990 data (client)
│   │   │       └── workflow-progress.tsx    # Progress indicator with Realtime (client)
│   │   ├── components/
│   │   │   ├── proposal-table.tsx           # TanStack table with proposals (client)
│   │   │   └── generate-button.tsx          # Trigger n8n proposal generation (client)
│   │   └── actions.ts                       # Server actions: trigger workflows, update sections
│   ├── pipeline/
│   │   └── [id]/
│   │       └── components/
│   │           ├── screening-result.tsx     # Display GREEN/YELLOW/RED (client)
│   │           └── screening-button.tsx     # Trigger eligibility screening (client)
lib/
├── supabase/
│   └── (existing files)
app/api/
└── webhook/
    └── route.ts                              # Add new webhook actions: update_proposal, update_proposal_section, update_funder
```

### Pattern 1: Live Progress Tracking with Supabase Realtime

**What:** Subscribe to `workflow_executions` table changes to show live progress for long-running n8n workflows

**When to use:** Proposal generation, funder analysis, quality review triggers

**Example:**

```typescript
// Source: Adapted from Phase 3 document-table.tsx Realtime pattern
// app/(dashboard)/proposals/[id]/components/workflow-progress.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

interface WorkflowProgressProps {
  workflowId: string
  initialStatus: 'pending' | 'running' | 'completed' | 'failed'
}

export function WorkflowProgress({ workflowId, initialStatus }: WorkflowProgressProps) {
  const [status, setStatus] = useState(initialStatus)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`workflow-${workflowId}`)
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workflow_executions',
          filter: `id=eq.${workflowId}`
        },
        (payload) => {
          setStatus(payload.new.status)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workflowId])

  return (
    <div className="flex items-center gap-2">
      {status === 'running' && (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Generating...
        </Badge>
      )}
      {status === 'completed' && (
        <Badge variant="outline" className="gap-1 text-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Complete
        </Badge>
      )}
      {status === 'failed' && (
        <Badge variant="outline" className="gap-1 text-red-600">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      )}
    </div>
  )
}
```

**Why this works:** Supabase Realtime uses PostgreSQL logical replication to stream changes via WebSocket. No polling needed. The webhook route updates `workflow_executions.status` when n8n completes, triggering the subscription callback.

### Pattern 2: Inline Section Editing with Tiptap

**What:** Allow users to edit AI-generated proposal sections inline with rich text formatting

**When to use:** Any proposal section content editing

**Example:**

```typescript
// Source: Adapted from Phase 3 narrative-editor.tsx
// app/(dashboard)/proposals/[id]/components/section-editor.tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useState, useTransition } from 'react'
import { updateProposalSection } from '../actions'

interface SectionEditorProps {
  sectionId: string
  initialContent: string
  editable?: boolean
}

export function SectionEditor({ sectionId, initialContent, editable = true }: SectionEditorProps) {
  const [isPending, startTransition] = useTransition()

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      // Debounced autosave (implement debounce with setTimeout)
      startTransition(async () => {
        await updateProposalSection(sectionId, editor.getHTML())
      })
    },
  })

  if (!editor) return null

  return (
    <div className="border rounded-md p-4">
      <EditorContent editor={editor} className="prose prose-sm max-w-none" />
      {isPending && <p className="text-xs text-muted-foreground mt-2">Saving...</p>}
    </div>
  )
}
```

**Why this works:** Tiptap's `onUpdate` callback fires on every content change. Use `useTransition` to mark updates as non-blocking. Add debouncing (setTimeout with cleanup) to avoid excessive server action calls.

### Pattern 3: Fire-and-Forget n8n Workflow Trigger

**What:** Trigger n8n workflows without waiting for response, track status via Realtime

**When to use:** Proposal generation, funder analysis, quality review, eligibility screening

**Example:**

```typescript
// Source: Established pattern from Phase 3 documents/actions.ts
// app/(dashboard)/proposals/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function triggerProposalGeneration(grantId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return { error: 'Profile not found' }

  // Insert workflow execution record (status: 'running')
  const { data: workflow } = await supabase
    .from('workflow_executions')
    .insert({
      org_id: profile.org_id,
      grant_id: grantId,
      workflow_name: 'generate-proposal',
      status: 'running',
      webhook_url: '/webhook/generate-proposal',
    })
    .select()
    .single()

  // Fire-and-forget: trigger n8n webhook
  if (process.env.N8N_WEBHOOK_URL) {
    fetch(`${process.env.N8N_WEBHOOK_URL}/generate-proposal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        grant_id: grantId,
        workflow_id: workflow?.id,
      }),
    }).catch((err) => {
      console.error('n8n webhook failed:', err)
    })
  }

  return { success: true, workflowId: workflow?.id }
}
```

**Why this works:** n8n receives the webhook, processes the workflow (generates proposal), then calls back to `/api/webhook` with `action: 'update_workflow'` to mark status as `completed`. The UI subscribes to `workflow_executions` via Realtime and updates automatically.

### Pattern 4: Accordion for Proposal Sections

**What:** Display proposal sections with expandable accordion for easy navigation

**When to use:** Viewing/editing multi-section proposals, displaying quality review issues

**Example:**

```typescript
// Source: shadcn/ui documentation
// app/(dashboard)/proposals/[id]/components/proposal-sections.tsx
'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { SectionEditor } from './section-editor'

interface Section {
  id: string
  title: string
  content: string
  sort_order: number
}

interface ProposalSectionsProps {
  sections: Section[]
}

export function ProposalSections({ sections }: ProposalSectionsProps) {
  const sortedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <Accordion type="multiple" className="w-full">
      {sortedSections.map((section) => (
        <AccordionItem key={section.id} value={section.id}>
          <AccordionTrigger className="text-left">
            {section.title}
          </AccordionTrigger>
          <AccordionContent>
            <SectionEditor
              sectionId={section.id}
              initialContent={section.content}
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
```

**Why this works:** Accordion supports `type="multiple"` to allow expanding multiple sections simultaneously. Sections are sorted by `sort_order` from Supabase. Each section contains a Tiptap editor for inline editing.

### Pattern 5: Quality Review Display

**What:** Show AI quality review scores, issues, and rewrite suggestions in structured UI

**When to use:** Displaying results from `/webhook/review-proposal`

**Example:**

```typescript
// app/(dashboard)/proposals/[id]/components/quality-review.tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface QualityReview {
  overall_score: number // 0-100
  issues: Array<{
    type: 'jargon' | 'passive_voice' | 'vagueness' | 'alignment'
    severity: 'low' | 'medium' | 'high'
    text: string
    suggestion: string
  }>
}

interface QualityReviewProps {
  review: QualityReview | null
}

export function QualityReview({ review }: QualityReviewProps) {
  if (!review) {
    return <p className="text-sm text-muted-foreground">No quality review available</p>
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-4xl font-bold ${getScoreColor(review.overall_score)}`}>
            {review.overall_score}/100
          </p>
        </CardContent>
      </Card>

      {/* Issues */}
      {review.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Issues Found ({review.issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {review.issues.map((issue, idx) => (
              <div key={idx} className="border-l-4 border-yellow-500 pl-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{issue.type.replace('_', ' ')}</Badge>
                  <Badge variant={issue.severity === 'high' ? 'destructive' : 'secondary'}>
                    {issue.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  <strong>Found:</strong> {issue.text}
                </p>
                <p className="text-sm">
                  <strong>Suggestion:</strong> {issue.suggestion}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

**Why this works:** Color-coded score provides instant feedback. Issues are grouped by type/severity with concrete suggestions. Badge components maintain visual consistency with the rest of the app.

### Pattern 6: ProPublica 990 Data Integration

**What:** n8n fetches funder data from ProPublica API, stores in `funders` table, Next.js displays

**When to use:** Funder analysis workflow

**Example (n8n workflow, not Next.js code):**

```
n8n workflow:
1. Receive webhook with funder EIN
2. HTTP Request: GET https://projects.propublica.org/nonprofits/api/v2/organizations/{ein}.json
3. Parse JSON response
4. POST to /api/webhook with action: 'update_funder', data: { funder_id, propublica_data: {...} }
```

**Next.js display:**

```typescript
// app/(dashboard)/proposals/[id]/components/funder-analysis.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FunderData {
  name: string
  ein: string
  propublica_data: {
    revenue: number
    assets: number
    filings: Array<{ tax_period: string, totrevenue: number }>
  }
  strategy_brief: string
  giving_patterns: { focus_areas: string[], avg_grant_size: number }
}

export function FunderAnalysis({ funder }: { funder: FunderData }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{funder.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">EIN: {funder.ein}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Strategy Brief</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{funder.strategy_brief}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>990 Financial Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              <strong>Revenue:</strong> ${funder.propublica_data.revenue.toLocaleString()}
            </p>
            <p className="text-sm">
              <strong>Assets:</strong> ${funder.propublica_data.assets.toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Why this works:** ProPublica API requires no authentication. n8n handles the API call (not Next.js, avoiding CORS issues and keeping API logic in n8n). Funder data is stored in Supabase and displayed as structured cards.

### Anti-Patterns to Avoid

- **Don't call ProPublica API from Next.js route handlers:** n8n already handles external API calls. Keep this pattern consistent.
- **Don't poll for workflow status:** Use Supabase Realtime subscriptions instead of setInterval polling.
- **Don't use global loading spinner for long operations:** Show specific progress indicators tied to workflow status.
- **Don't block UI on workflow triggers:** Fire-and-forget pattern means the user can navigate away while n8n processes.
- **Don't skip `immediatelyRender: false` in Tiptap:** Causes hydration errors in Next.js App Router (established in Phase 3).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop section reordering | Custom mouse event handlers | @dnd-kit/sortable | Handles touch devices, accessibility, edge cases (nested lists, scroll zones) |
| Rich text editing | contentEditable + execCommand | Tiptap (already installed) | Browser quirks, undo/redo, collaborative editing support |
| Progress indicators | Custom SVG animations | shadcn Progress + Badge | Accessible, consistent styling, loading states |
| Realtime updates | setInterval polling | Supabase Realtime | WebSocket-based, more efficient, already proven in Phase 3 |
| Debounced autosave | Manual setTimeout cleanup | useDebouncedCallback (from use-debounce package) | Handles cleanup, leading/trailing edge, cancel on unmount |

**Key insight:** Long-running async operations require workflow orchestration (n8n), status tracking (Supabase), and live updates (Realtime). Building custom polling or progress systems creates race conditions and complexity. Use established patterns from Phase 3 and expand them.

## Common Pitfalls

### Pitfall 1: Realtime Subscription Leaks

**What goes wrong:** Subscribing to Realtime channels without cleanup causes memory leaks and duplicate subscriptions.

**Why it happens:** Forgetting to call `supabase.removeChannel(channel)` in useEffect cleanup.

**How to avoid:**

```typescript
useEffect(() => {
  const supabase = createClient()
  const channel = supabase.channel('workflow-updates').on(...).subscribe()

  return () => {
    supabase.removeChannel(channel) // CRITICAL: cleanup
  }
}, [])
```

**Warning signs:** Multiple duplicate updates firing on every change, browser console showing increasing channel count.

### Pitfall 2: Race Conditions on Workflow Status

**What goes wrong:** UI shows "completed" before proposal data is inserted into `proposals` table.

**Why it happens:** n8n webhook updates `workflow_executions.status = 'completed'` before inserting proposal sections.

**How to avoid:** n8n workflow must insert proposal + sections FIRST, then update workflow status. Webhook action order matters.

**Verification:** Check n8n workflow nodes to ensure `insert_proposal` → `insert_proposal_sections` → `update_workflow` (completed).

### Pitfall 3: Autosave Throttling Abuse

**What goes wrong:** Tiptap `onUpdate` fires on every keystroke, triggering server actions too frequently.

**Why it happens:** No debouncing on autosave logic.

**How to avoid:** Use debounce with 1-2 second delay:

```typescript
import { useDebouncedCallback } from 'use-debounce'

const debouncedSave = useDebouncedCallback(
  (content: string) => {
    updateProposalSection(sectionId, content)
  },
  2000 // 2 seconds
)

const editor = useEditor({
  onUpdate: ({ editor }) => {
    debouncedSave(editor.getHTML())
  },
})
```

**Warning signs:** Network tab shows hundreds of requests, Supabase logs show excessive writes.

### Pitfall 4: Missing Workflow Error Handling

**What goes wrong:** Workflow fails silently, user sees infinite "Generating..." spinner.

**Why it happens:** No error state handling in Realtime subscription or webhook response.

**How to avoid:** Check for `status: 'failed'` in Realtime subscription and display error message. n8n workflow should catch errors and update status to `failed` with error details in `workflow_executions.error` field.

**Warning signs:** Users report "stuck" workflows that never complete.

### Pitfall 5: ProPublica API Rate Limit Ignorance

**What goes wrong:** n8n workflow gets rate limited when analyzing multiple funders simultaneously.

**Why it happens:** ProPublica API documentation doesn't specify rate limits, but they exist for heavy usage.

**How to avoid:** Implement exponential backoff in n8n HTTP Request node (retry with 1s, 2s, 4s delays). Cache 990 data in `funders.propublica_data` to avoid re-fetching.

**Warning signs:** n8n workflow logs show 429 Too Many Requests errors.

## Code Examples

Verified patterns from official sources and established codebase patterns:

### Debounced Autosave with Tiptap

```typescript
// Source: Tiptap docs + use-debounce pattern
import { useEditor } from '@tiptap/react'
import { useDebouncedCallback } from 'use-debounce'

const debouncedUpdate = useDebouncedCallback(
  async (html: string) => {
    await updateProposalSection(sectionId, html)
  },
  2000 // 2 seconds
)

const editor = useEditor({
  immediatelyRender: false,
  extensions: [StarterKit],
  content: initialContent,
  onUpdate: ({ editor }) => {
    debouncedUpdate(editor.getHTML())
  },
})
```

### Webhook Action for Proposal Insert

```typescript
// app/api/webhook/route.ts (extend existing switch)
case 'insert_proposal': {
  const { data: proposal } = await supabase
    .from('proposals')
    .insert(data.proposal)
    .select()
    .single()
  if (!proposal) throw new Error('Proposal insert failed')
  break
}

case 'insert_proposal_sections': {
  await supabase.from('proposal_sections').insert(data.sections)
  break
}

case 'update_proposal': {
  const { id, ...updates } = data
  await supabase.from('proposals').update(updates).eq('id', id)
  break
}

case 'update_funder': {
  const { id, ...updates } = data
  await supabase.from('funders').update(updates).eq('id', id)
  break
}
```

### Proposal Section Reordering (Optional)

```typescript
// Source: dnd-kit documentation
// app/(dashboard)/proposals/[id]/components/sortable-sections.tsx
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableSection({ section }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {/* Section content */}
    </div>
  )
}

export function SortableSections({ sections, onReorder }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id)
      const newIndex = sections.findIndex((s) => s.id === over.id)
      const reordered = arrayMove(sections, oldIndex, newIndex)
      onReorder(reordered)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections} strategy={verticalListSortingStrategy}>
        {sections.map((section) => (
          <SortableSection key={section.id} section={section} />
        ))}
      </SortableContext>
    </DndContext>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling with setInterval | Supabase Realtime postgres_changes | Supabase Realtime v2 (2023) | More efficient, real WebSocket connections, no manual polling logic |
| Draft.js + custom toolbar | Tiptap with StarterKit | ~2022-2023 | Modular extensions, better React integration, active maintenance |
| Custom drag-and-drop | dnd-kit | 2021+ | Better accessibility, touch support, TypeScript-first |
| react-beautiful-dnd | dnd-kit | react-beautiful-dnd deprecated 2024 | dnd-kit actively maintained, supports React 18+ |
| Server-sent events (SSE) | WebSockets (Realtime) | Supabase standard | Bidirectional, lower latency |

**Deprecated/outdated:**
- react-beautiful-dnd: No longer maintained, doesn't support React 18+ strict mode
- Quill editor: Older, less modular than Tiptap
- Custom polling for async operations: Supabase Realtime eliminates need

## Open Questions

1. **Section reordering: drag-and-drop or simple up/down buttons?**
   - What we know: dnd-kit provides full drag-and-drop, up/down buttons are simpler
   - What's unclear: User preference for reordering method
   - Recommendation: Start with up/down buttons (simpler), add dnd-kit if users request drag-and-drop

2. **ProPublica API rate limits: what are they exactly?**
   - What we know: Documentation doesn't specify exact limits, PDF downloads are rate limited
   - What's unclear: Requests per second/minute for JSON API
   - Recommendation: Implement retry with exponential backoff, cache 990 data in Supabase, monitor n8n logs for 429 errors

3. **Quality review: trigger automatically on proposal save or manual button?**
   - What we know: AI review is a separate n8n workflow
   - What's unclear: User expectation for when review happens
   - Recommendation: Manual trigger button (user control), could add auto-trigger after first generation completes

4. **Proposal template structure: fixed sections or dynamic?**
   - What we know: `proposal_sections` table supports dynamic sections with `title` and `sort_order`
   - What's unclear: Do all proposals share the same section structure, or grant-specific?
   - Recommendation: Dynamic sections (n8n determines based on grant requirements), display sorted by `sort_order`

## Sources

### Primary (HIGH confidence)

- [ProPublica Nonprofit Explorer API v2](https://projects.propublica.org/nonprofits/api) - API endpoints, data structure, no auth requirement
- [Tiptap Editor Documentation](https://tiptap.dev/docs/editor/api/editor) - Configuration, onUpdate callback, React integration
- [Supabase Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) - postgres_changes subscription pattern
- [dnd-kit Sortable Preset](https://docs.dndkit.com/presets/sortable) - Sortable list implementation, vertical strategy
- [shadcn/ui Accordion](https://ui.shadcn.com/docs/components/radix/progress) - Accordion component API
- Existing codebase patterns: Phase 3 document-table.tsx (Realtime), narrative-editor.tsx (Tiptap), documents/actions.ts (fire-and-forget webhooks)

### Secondary (MEDIUM confidence)

- [Next.js 16 Long-Running Operations Discussion](https://github.com/vercel/next.js/discussions/34266) - Background task patterns
- [React Progress UI Patterns](https://www.shadcn.io/ui/progress) - shadcn progress components
- [Radix UI Accordion](https://www.radix-ui.com/primitives/docs/components/accordion) - WAI-ARIA design patterns

### Tertiary (LOW confidence)

- WebSearch results on drag-and-drop libraries (verified with official dnd-kit docs)
- WebSearch results on ProPublica API (verified with official ProPublica API documentation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed (Tiptap, TanStack Table, shadcn) or verified via official docs (ProPublica API, dnd-kit)
- Architecture: HIGH - Patterns proven in Phase 3 (Realtime, fire-and-forget webhooks, Tiptap), extended with official dnd-kit and accordion examples
- Pitfalls: HIGH - Realtime cleanup, autosave throttling, race conditions are known issues from Phase 3 experience and React best practices

**Research date:** 2026-02-13
**Valid until:** ~60 days (stable stack, slow-moving changes for Supabase/Tiptap/dnd-kit)
