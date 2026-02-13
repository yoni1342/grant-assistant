---
phase: 03-document-vault-narrative-library
plan: 03
subsystem: narratives
tags: [narrative-library, tiptap, rich-text-editor, n8n-webhooks, realtime, card-grid]

# Dependency graph
requires:
  - phase: 03-document-vault-narrative-library
    plan: 01
    provides: Tiptap dependencies, storage patterns, server action patterns
  - phase: 02-pipeline-discovery-dashboard
    provides: Database schema with narratives table and grants table
provides:
  - Narrative CRUD server actions (create, read, update, delete)
  - AI customization webhook trigger for n8n
  - Narrative library card grid with search and category filter
  - Tiptap rich text editor with toolbar (Bold, Italic, Heading, Lists, Blockquote)
  - Create/edit dialog with full form
  - AI customization dialog with grant picker
  - Realtime subscription for narrative updates
affects: [phase-04-proposals, phase-05-budgets]

# Tech tracking
tech-stack:
  added: [date-fns, shadcn/popover]
  patterns: [Tiptap immediatelyRender false for SSR, fire-and-forget n8n webhooks, client-side filtering]

key-files:
  created:
    - app/(dashboard)/narratives/actions.ts
    - app/(dashboard)/narratives/page.tsx
    - app/(dashboard)/narratives/components/narrative-list.tsx
    - app/(dashboard)/narratives/components/narrative-page-client.tsx
    - app/(dashboard)/narratives/components/narrative-editor.tsx
    - app/(dashboard)/narratives/components/narrative-dialog.tsx
    - app/(dashboard)/narratives/components/ai-customize-button.tsx
    - components/ui/popover.tsx
  modified: []

key-decisions:
  - "Tiptap editor uses immediatelyRender: false to prevent Next.js hydration mismatches"
  - "Card grid layout instead of table for narratives (better for content preview)"
  - "Client-side search and filter for immediate feedback (no server round-trip)"
  - "Fire-and-forget AI customization webhook (n8n handles async processing)"
  - "Tags stored as string array in Postgres, comma-separated in UI"
  - "Category filter includes all 8 narrative_category enum values"

patterns-established:
  - "Tiptap editor component pattern: toolbar + EditorContent + custom styling"
  - "Dialog state management: page-level client wrapper manages open/close state"
  - "Rich text form field pattern: NarrativeEditor as controlled component with onUpdate callback"

# Metrics
duration: 7min
completed: 2026-02-13
---

# Phase 03 Plan 03: Narrative Library Summary

**Complete narrative library with CRUD, Tiptap editor, search/filter, and AI customization via n8n webhook**

## Performance

- **Duration:** 7 minutes
- **Started:** 2026-02-13T10:59:36Z
- **Completed:** 2026-02-13T11:07:12Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Narrative CRUD server actions with org scoping via RLS
- Card grid layout with responsive design (1/2/3 columns)
- Search by title and filter by category (8 narrative types)
- Tiptap rich text editor with 6-button toolbar (no hydration errors)
- Create/edit dialog with title, category, tags, and rich text content
- AI customization dialog with grant picker
- Fire-and-forget n8n webhook trigger for narrative customization
- Realtime subscription for INSERT/UPDATE/DELETE events
- Empty states for no narratives and no search results

## Task Commits

Each task was committed atomically:

1. **Task 1: Create narrative server actions and list page with search/filter** - `cd3dc98` (feat)
2. **Task 2: Build Tiptap editor, create/edit dialog, and AI customization** - `12fa190` (feat) *

*Note: Task 2 implementation was accidentally included in plan 03-02's SUMMARY commit due to parallel execution overlap. Work is correct and complete.

## Files Created/Modified
- `app/(dashboard)/narratives/actions.ts` - 5 server actions: getNarratives, createNarrative, updateNarrative, deleteNarrative, triggerAICustomization
- `app/(dashboard)/narratives/page.tsx` - Server component fetching narratives and grants, rendering page header
- `app/(dashboard)/narratives/components/narrative-list.tsx` - Card grid with search, category filter, Realtime subscription, delete with confirmation
- `app/(dashboard)/narratives/components/narrative-page-client.tsx` - Client wrapper managing dialog state and callbacks
- `app/(dashboard)/narratives/components/narrative-editor.tsx` - Tiptap editor with StarterKit, Placeholder, toolbar (Bold, Italic, H2, Bullet, Ordered, Blockquote)
- `app/(dashboard)/narratives/components/narrative-dialog.tsx` - Create/edit dialog calling server actions
- `app/(dashboard)/narratives/components/ai-customize-button.tsx` - Grant picker dialog triggering n8n webhook
- `components/ui/popover.tsx` - Shadcn Popover component

## Decisions Made

**Card grid vs table layout:**
- Chose card layout for narratives (unlike documents which use table)
- Reason: Narratives are content blocks, need content preview and metadata display
- Cards show title, category badge, content preview (150 chars), tags, and timestamp
- Responsive grid: 1 column mobile, 2 tablet, 3 desktop

**Client-side filtering:**
- Search and category filter run entirely client-side
- Provides instant feedback without server round-trips
- Acceptable for narrative library (smaller dataset than documents)
- Uses simple case-insensitive includes() for title search

**Tiptap hydration fix:**
- Set `immediatelyRender: false` in useEditor hook
- Prevents "Text content did not match" errors in Next.js
- Editor returns null until fully initialized
- Critical pattern for any Tiptap usage in Next.js App Router

**Tags as string array:**
- Postgres stores tags as `string[]` (text array column)
- UI presents comma-separated input: "education, youth, STEM"
- Server action splits on comma, trims whitespace, filters empty strings
- Display uses Badge component for each tag

**AI customization flow:**
- Separate dialog for AI customization (not inline button)
- Requires grant selection from dropdown
- Fires n8n webhook with `narrative_id` and `grant_id`
- Fire-and-forget pattern: returns immediately, n8n processes async
- Updated narrative arrives via Realtime when n8n finishes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed AI customization error handling**
- **Found during:** Task 2 build verification
- **Issue:** AICustomizeButton tried to access `result?.error` but `triggerAICustomization` only returns `{ success: true }`
- **Fix:** Changed to try/catch pattern instead of checking result.error
- **Files modified:** `app/(dashboard)/narratives/components/ai-customize-button.tsx`
- **Commit:** Included in Task 2 implementation

**2. [Rule 3 - Blocking] Added placeholder components for build**
- **Found during:** Task 1 build verification
- **Issue:** TypeScript errors because NarrativeDialog, NarrativeEditor, AICustomizeButton didn't accept props
- **Fix:** Created placeholder components with correct TypeScript interfaces
- **Files modified:** Same 3 component files (placeholders replaced in Task 2)
- **Commit:** `cd3dc98` (Task 1)

### Parallel Execution Issue

**Task 2 commit attribution:**
- **Issue:** Task 2 implementation (narrative-editor.tsx, narrative-dialog.tsx, ai-customize-button.tsx) was committed under plan 03-02's SUMMARY commit (12fa190) instead of a separate Task 2 commit
- **Cause:** Plan 03-02 and 03-03 executing in parallel; 03-02's executor staged and committed 03-03's working directory changes
- **Impact:** Work is correct and complete, just attributed to wrong commit message
- **Resolution:** Documented here for clarity; no code changes needed

---

**Total deviations:** 2 auto-fixed bugs, 1 parallel execution commit attribution issue
**Impact on plan:** None - all functionality works as specified

## Issues Encountered

**None** - All features implemented successfully per plan specification.

## User Setup Required

**N8N_WEBHOOK_URL configuration:**
- The `triggerAICustomization` server action requires `N8N_WEBHOOK_URL` environment variable
- Webhook endpoint: `${N8N_WEBHOOK_URL}/customize-narrative`
- Payload: `{ narrative_id: string, grant_id: string }`
- If not configured: AI customization button works but webhook won't fire
- User must set up corresponding n8n workflow to handle customization

## Next Phase Readiness

**Ready for Phase 4 (Proposal Builder):**
- Narrative library fully functional with CRUD operations
- Narratives can be searched and filtered by category
- Rich text content stored and editable via Tiptap
- AI customization webhook pattern established
- Realtime updates ensure UI stays in sync
- Phase 4 can query narratives by category to populate proposal sections

**No blockers identified.**

## Self-Check: PASSED

All SUMMARY.md claims verified:
- ✓ All created files exist on disk
- ✓ Task 1 commit (cd3dc98) found in git history
- ✓ Task 2 implementation present in HEAD (12fa190)
- ✓ Tiptap editor has immediatelyRender: false
- ✓ All 8 narrative_category enum values present in filter
- ✓ Server actions export: getNarratives, createNarrative, updateNarrative, deleteNarrative, triggerAICustomization
- ✓ Realtime subscription present in narrative-list.tsx
- ✓ Build completes without TypeScript errors

---
*Phase: 03-document-vault-narrative-library*
*Completed: 2026-02-13*
