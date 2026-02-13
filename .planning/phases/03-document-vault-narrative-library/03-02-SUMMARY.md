---
phase: 03-document-vault-narrative-library
plan: 02
subsystem: documents-ui
tags: [tanstack-table, realtime, data-table, file-upload, n8n-webhook]

# Dependency graph
requires:
  - phase: 03-document-vault-narrative-library
    plan: 01
    provides: Storage infrastructure, server actions, dependencies
provides:
  - Document vault page with searchable, filterable data table
  - Upload dialog with client-side validation
  - Row actions (download via signed URL, delete with confirmation)
  - Real-time updates via Supabase Realtime
  - n8n webhook handler for AI categorization updates
affects: [03-03-narrative-library, phase-04-proposals]

# Tech tracking
tech-stack:
  added: [date-fns]
  patterns: [Realtime subscription with cleanup, server action wrapper for client components, global filter with TanStack Table]

key-files:
  created:
    - app/(dashboard)/documents/page.tsx
    - app/(dashboard)/documents/components/columns.tsx
    - app/(dashboard)/documents/components/document-table.tsx
    - app/(dashboard)/documents/components/upload-dialog.tsx
    - app/(dashboard)/documents/components/document-row-actions.tsx
  modified:
    - app/(dashboard)/documents/actions.ts
    - app/api/webhook/route.ts
    - package.json
    - package-lock.json

key-decisions:
  - "Created getDownloadUrl server action wrapper to avoid importing server-side storage helpers in client components"
  - "Global filter only applies to name column for intuitive search behavior"
  - "Added 'Categorizing...' state for recently uploaded documents (< 5 min) without AI category"
  - "Realtime subscription handles INSERT, UPDATE, DELETE for complete real-time sync"
  - "File type icons with color coding: red PDF, blue Word, green Excel, purple images"

patterns-established:
  - "Server action wrapper pattern: wrap storage helpers for client component access"
  - "Realtime cleanup pattern: removeChannel in useEffect cleanup to prevent memory leaks"
  - "Empty state differentiation: distinguish between truly empty and filtered-to-empty"

# Metrics
duration: 4min
completed: 2026-02-13
---

# Phase 03 Plan 02: Document Vault UI Summary

**Complete Document Vault with searchable data table, upload dialog, row actions, and real-time AI categorization updates**

## Performance

- **Duration:** 4 minutes
- **Started:** 2026-02-13T10:59:30Z
- **Completed:** 2026-02-13T11:03:34Z
- **Tasks:** 2
- **Files created:** 5
- **Files modified:** 4

## Accomplishments

- Full-featured document vault page replacing Phase 3 placeholder
- TanStack Table with search by name and filter by file type
- Upload dialog with client-side file type and size validation
- Download documents via signed URLs (1-hour expiry)
- Delete documents with confirmation dialog
- Real-time UI updates when documents are inserted, updated, or deleted
- n8n webhook endpoint for AI categorization results
- AI categorization status shows "Categorizing..." for recently uploaded documents

## Task Commits

Each task was committed atomically:

1. **Task 1: Build document vault page with data table, search, filter, and row actions** - `3e3247e` (feat)
2. **Task 2: Add Realtime subscription and n8n webhook for live document updates** - `4ed90c4` (feat)

## Files Created/Modified

**Created:**
- `app/(dashboard)/documents/page.tsx` - Server component that fetches documents and renders table with upload dialog
- `app/(dashboard)/documents/components/columns.tsx` - TanStack Table column definitions with file type icons, category logic, helpers
- `app/(dashboard)/documents/components/document-table.tsx` - Client component with TanStack Table, search, filter, Realtime subscription
- `app/(dashboard)/documents/components/upload-dialog.tsx` - Upload dialog with validation, loading states, useTransition
- `app/(dashboard)/documents/components/document-row-actions.tsx` - Dropdown menu with download and delete actions

**Modified:**
- `app/(dashboard)/documents/actions.ts` - Added getDownloadUrl server action wrapper
- `app/api/webhook/route.ts` - Added update_document case for n8n AI categorization
- `package.json` - Added date-fns dependency
- `package-lock.json` - Updated with date-fns package

## Decisions Made

**Server action wrapper for client components:**
- Client components can't import server-side storage helpers directly (Next.js constraint)
- Created `getDownloadUrl` server action in actions.ts to wrap `createSignedUrl`
- Pattern: client component calls server action, server action uses server-side Supabase client
- Avoids "next/headers in client component" errors

**Global filter scoped to name column:**
- TanStack Table's global filter could apply to all columns by default
- Scoped it to only search the "name" column for intuitive behavior
- Type filter uses column filter (not global filter) for proper faceting

**"Categorizing..." state for AI processing:**
- Documents uploaded < 5 minutes ago without ai_category show "Categorizing..."
- Gives user feedback that n8n is processing the document
- State automatically resolves when webhook updates ai_category field via Realtime

**Realtime subscription cleanup:**
- useEffect cleanup calls `supabase.removeChannel(channel)` to prevent memory leaks
- Follows same pattern as Phase 2 pipeline Realtime implementation
- Handles INSERT, UPDATE, DELETE for complete real-time sync (not just AI categorization)

**File type visual hierarchy:**
- Icons with color coding: FileText (red) for PDF, FileIcon (blue) for Word, FileSpreadsheet (green) for Excel, FileImage (purple) for images
- Human-readable labels: "PDF", "Word", "Excel", "PNG", "JPEG" instead of MIME types
- Makes document types scannable at a glance

## Deviations from Plan

None - plan executed exactly as written. All features implemented as specified.

---

**Total deviations:** 0

## Issues Encountered

None - all tasks completed without errors or blockers.

## User Setup Required

**n8n webhook configuration (optional):**
- If n8n is configured with N8N_WEBHOOK_URL and N8N_WEBHOOK_SECRET env vars, AI categorization will work automatically
- n8n should POST to `/api/webhook` with:
  ```json
  {
    "action": "update_document",
    "data": {
      "id": "document-uuid",
      "ai_category": "budget"
    }
  }
  ```
- Header: `X-Webhook-Secret: <N8N_WEBHOOK_SECRET>`
- If n8n is not configured, documents will show "Uncategorized" (no errors)

## Next Phase Readiness

**Ready for Plan 03 (Narrative Library):**
- Document vault UI patterns established (table, dialogs, row actions)
- Realtime subscription pattern proven and reusable
- Storage and server action infrastructure available
- No blockers identified

**Integration notes:**
- Narratives can reference documents via grant_id foreign key
- Same Realtime patterns can be applied to narratives table
- Upload dialog pattern can be adapted for narrative attachments if needed

## Self-Check: PASSED

All SUMMARY.md claims verified:

**Files created (5):**
- ✓ app/(dashboard)/documents/page.tsx exists
- ✓ app/(dashboard)/documents/components/columns.tsx exists
- ✓ app/(dashboard)/documents/components/document-table.tsx exists
- ✓ app/(dashboard)/documents/components/upload-dialog.tsx exists
- ✓ app/(dashboard)/documents/components/document-row-actions.tsx exists

**Files modified (4):**
- ✓ app/(dashboard)/documents/actions.ts contains getDownloadUrl
- ✓ app/api/webhook/route.ts contains update_document case
- ✓ package.json contains date-fns
- ✓ package-lock.json updated

**Commits (2):**
- ✓ 3e3247e - feat(03-02): build document vault page (Task 1)
- ✓ 4ed90c4 - feat(03-02): add Realtime subscription and webhook (Task 2)

**Build verification:**
- ✓ npm run build completes successfully
- ✓ TypeScript compilation passes
- ✓ All 19 routes generated without errors

---
*Phase: 03-document-vault-narrative-library*
*Completed: 2026-02-13*
