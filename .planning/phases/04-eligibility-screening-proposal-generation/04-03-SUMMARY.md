---
phase: 04-eligibility-screening-proposal-generation
plan: 03
subsystem: ui
tags: [tiptap, accordion, debounce, realtime, quality-review, funder-analysis]

# Dependency graph
requires:
  - phase: 04-eligibility-screening-proposal-generation
    plan: 01
    provides: Proposal server actions, webhook handlers, use-debounce, shadcn components
  - phase: 03-document-vault-narrative-library
    plan: 03
    provides: Tiptap editor patterns (immediatelyRender: false, toolbar structure)
provides:
  - Proposal detail page with accordion-based section editor
  - Inline Tiptap rich text editing with debounced autosave
  - Quality review display with score, issues, and trigger button
  - Funder analysis display with strategy brief, giving patterns, 990 data
affects: [04-eligibility-screening-proposal-generation, 05-budget-management-submission]

# Tech tracking
tech-stack:
  added: []
  patterns: [accordion UI for sections, debounced autosave for inline editing, Realtime subscriptions for live updates, section reordering with up/down buttons]

key-files:
  created:
    - app/(dashboard)/proposals/[id]/page.tsx
    - app/(dashboard)/proposals/[id]/components/proposal-detail-client.tsx
    - app/(dashboard)/proposals/[id]/components/proposal-sections.tsx
    - app/(dashboard)/proposals/[id]/components/section-editor.tsx
    - app/(dashboard)/proposals/[id]/components/quality-review.tsx
    - app/(dashboard)/proposals/[id]/components/funder-analysis.tsx
  modified: []

key-decisions:
  - "All sections expanded by default using Accordion type='multiple' with defaultValue set to all IDs for immediate visibility"
  - "Section editor matches narrative-editor patterns exactly: immediatelyRender: false, same toolbar, same extensions"
  - "Debounced autosave with 2-second delay prevents excessive server calls while typing"
  - "Realtime subscriptions on both proposals and proposal_sections tables for live updates when n8n workflows complete"
  - "Quality review displays issues with color-coded severity borders (high=red, medium=yellow, low=gray)"
  - "Funder analysis shows ProPublica 990 data in organized cards with financial values formatted as currency"

patterns-established:
  - "Pattern 1: Server page fetches related data (proposal, sections, grant, funder), passes to client wrapper with Realtime subscriptions"
  - "Pattern 2: Accordion with reorder buttons using stopPropagation to prevent accordion toggle during reorder"
  - "Pattern 3: Tiptap editor with debounced autosave calling server action directly (no intermediate state updates)"
  - "Pattern 4: Quality review and funder analysis panels with trigger buttons and empty states"

# Metrics
duration: 3min
completed: 2026-02-13
---

# Phase 04 Plan 03: Proposal Detail View & Editor Summary

**Accordion-based proposal editor with Tiptap inline editing, debounced autosave, quality review panel with score/issues display, and funder analysis panel with ProPublica 990 data**

## Performance

- **Duration:** 3 min (216 seconds)
- **Started:** 2026-02-13T11:56:32Z
- **Completed:** 2026-02-13T12:00:11Z
- **Tasks:** 2
- **Files created:** 6

## Accomplishments

- Proposal detail page with server-side data fetching (proposal, sections, grant, funder)
- Client wrapper with Realtime subscriptions for live updates on proposals and sections
- Accordion-based section display with all sections expanded by default
- Tiptap inline editor per section with toolbar (Bold, Italic, H2, Lists, Blockquote)
- Debounced autosave (2s delay) with "Saving..." / "Saved" indicators
- Section reordering with up/down buttons
- Quality review panel with overall score (color-coded), section scores, and issues list
- Issues display with severity badges and rewrite suggestions
- Funder analysis panel with strategy brief, giving patterns, priorities, submission preferences
- ProPublica 990 data display with revenue, assets, NTEE code, and filing history table
- Trigger buttons for quality review and funder analysis workflows
- Zero TypeScript errors after all changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Build proposal detail page with accordion sections and Tiptap inline editor** - `8bed057` (feat)
2. **Task 2: Build quality review display and funder analysis panels** - `53a9008` (feat)

## Files Created/Modified

- `app/(dashboard)/proposals/[id]/page.tsx` - Server component fetching proposal, sections, grant, funder data
- `app/(dashboard)/proposals/[id]/components/proposal-detail-client.tsx` - Client wrapper with Realtime subscriptions and two-column layout
- `app/(dashboard)/proposals/[id]/components/proposal-sections.tsx` - Accordion with section editors and reorder buttons
- `app/(dashboard)/proposals/[id]/components/section-editor.tsx` - Tiptap editor with debounced autosave
- `app/(dashboard)/proposals/[id]/components/quality-review.tsx` - Quality score, section scores, issues display
- `app/(dashboard)/proposals/[id]/components/funder-analysis.tsx` - Strategy brief, giving patterns, 990 data display

## Decisions Made

1. **All sections expanded by default:** Using `type="multiple"` and `defaultValue` set to all section IDs gives users immediate visibility into all proposal content without clicking to expand.

2. **Section editor matches narrative editor patterns:** Following Phase 3's narrative-editor.tsx exactly for consistency: `immediatelyRender: false` for SSR, same toolbar structure, same extensions.

3. **2-second debounced autosave:** Balances responsiveness (not too long) with efficiency (not too frequent). Prevents server overload during active typing.

4. **Realtime subscriptions on both tables:** Subscribing to `proposals` table for quality review updates and `proposal_sections` table for new sections ensures UI stays in sync when n8n completes workflows.

5. **Color-coded quality review display:** Score color (green/yellow/red) and issue severity borders provide instant visual feedback on proposal quality.

6. **ProPublica 990 data in separate card:** Keeping financial data separate from strategic information makes both easier to scan and reference.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - all functionality ready to use once proposals exist in database.

## Next Phase Readiness

- Proposal detail page complete and ready for user editing
- Quality review and funder analysis panels ready to display n8n workflow results
- Autosave prevents data loss during editing
- Realtime updates ensure UI stays current with background processing
- Ready for 04-02 (Proposal Builder UI) and 05-01 (Budget Builder)

## Self-Check: PASSED

All files and commits verified:
- ✓ app/(dashboard)/proposals/[id]/page.tsx exists
- ✓ app/(dashboard)/proposals/[id]/components/proposal-detail-client.tsx exists
- ✓ app/(dashboard)/proposals/[id]/components/proposal-sections.tsx exists
- ✓ app/(dashboard)/proposals/[id]/components/section-editor.tsx exists
- ✓ app/(dashboard)/proposals/[id]/components/quality-review.tsx exists
- ✓ app/(dashboard)/proposals/[id]/components/funder-analysis.tsx exists
- ✓ commit 8bed057 exists
- ✓ commit 53a9008 exists

---
*Phase: 04-eligibility-screening-proposal-generation*
*Completed: 2026-02-13*
