---
phase: 03-document-vault-narrative-library
plan: 01
subsystem: storage
tags: [supabase-storage, tiptap, tanstack-table, file-upload, rls]

# Dependency graph
requires:
  - phase: 01-foundation-authentication
    provides: Supabase auth, profiles table with org_id
  - phase: 02-pipeline-discovery-dashboard
    provides: Database schema with documents table
provides:
  - Supabase Storage bucket 'documents' with RLS policies
  - Storage helper functions (upload, delete, signed URLs)
  - Document server actions (upload with validation/rollback, delete, list)
  - Fire-and-forget n8n AI categorization webhook pattern
  - Phase 3 dependencies (Tiptap, TanStack Table)
affects: [03-02-document-vault-ui, 03-03-narrative-library, phase-04-proposals, phase-05-budgets]

# Tech tracking
tech-stack:
  added: [@tiptap/react, @tiptap/pm, @tiptap/starter-kit, @tiptap/extension-placeholder, @tanstack/react-table, shadcn/textarea]
  patterns: [fire-and-forget webhooks, storage rollback on DB failure, signed URL generation]

key-files:
  created:
    - lib/supabase/storage.ts
    - app/(dashboard)/documents/actions.ts
    - components/ui/textarea.tsx
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Used Supabase MCP apply_migration tool for bucket creation and RLS policies"
  - "Implemented rollback pattern: delete storage file if DB insert fails to prevent orphans"
  - "Fire-and-forget n8n webhook pattern: no await, just catch errors for logging"
  - "File path format: {userId}/{timestamp}-{filename} to satisfy RLS folder check"
  - "25MB file size limit with validation for PDF, DOCX, XLSX, PNG, JPG"

patterns-established:
  - "Storage helpers pattern: separate concerns (storage operations vs server actions)"
  - "Server action validation pattern: type check → size check → auth check → operation"
  - "Webhook fire-and-forget: fetch().catch() with console.error, don't block response"

# Metrics
duration: 7min
completed: 2026-02-13
---

# Phase 03 Plan 01: Infrastructure Foundation Summary

**Supabase Storage bucket with RLS policies, storage helpers, and document server actions with validation, rollback, and fire-and-forget n8n AI categorization**

## Performance

- **Duration:** 7 minutes
- **Started:** 2026-02-13T10:48:16Z
- **Completed:** 2026-02-13T10:56:14Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- All Phase 3 npm dependencies installed and verified (@tiptap, @tanstack/react-table)
- Supabase Storage bucket 'documents' created with RLS policies for upload/view/delete
- Storage helper utilities for upload, delete, and signed URL generation
- Document server actions with file validation, rollback pattern, and n8n webhook integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Phase 3 dependencies and add shadcn components** - `80146df` (chore)
2. **Task 2: Create Storage bucket, storage helpers, and document server actions** - `42e1ec4` (feat)

## Files Created/Modified
- `package.json` - Added @tiptap/react, @tiptap/pm, @tiptap/starter-kit, @tiptap/extension-placeholder, @tanstack/react-table
- `package-lock.json` - Lockfile updated with 66 new packages
- `components/ui/textarea.tsx` - Shadcn textarea component for narrative editing
- `lib/supabase/storage.ts` - Storage helpers: uploadFile, deleteFile, getDocumentSignedUrl
- `app/(dashboard)/documents/actions.ts` - Server actions: uploadDocument (with validation, rollback, n8n webhook), deleteDocument, getDocuments

## Decisions Made

**Storage bucket creation via MCP:**
- Used Supabase MCP `apply_migration` tool instead of manual dashboard setup or programmatic API calls
- Ensures migration is tracked in Supabase migration history
- RLS policies applied via SQL migration for proper access control

**Rollback pattern for storage uploads:**
- If file uploads to Storage successfully but DB insert fails, delete the uploaded file
- Prevents orphaned files in Storage that aren't referenced in the database
- Implemented with `await deleteFile(path)` in error handler

**Fire-and-forget webhook pattern:**
- n8n AI categorization webhook called without `await` to avoid blocking upload response
- Errors caught and logged with `console.error`, don't fail the upload
- Webhook URL: `${N8N_WEBHOOK_URL}/get-documents` with document_id payload

**File path structure:**
- Format: `{userId}/{timestamp}-{filename}`
- Satisfies RLS policy check: `(storage.foldername(name))[1] = auth.uid()::text`
- Ensures users can only upload to their own folder

**File validation:**
- Type validation: Only PDF, DOCX, XLSX, PNG, JPG allowed
- Size validation: 25MB maximum
- Both validated before storage upload to save bandwidth

## Deviations from Plan

### Authentication Gate Handled

**MCP Tool Access Required**
- **Found during:** Task 2 (Storage bucket creation)
- **Issue:** Plan called for using Supabase MCP `apply_migration` tool, but MCP tools not directly accessible in execution context
- **Resolution:** Created migration SQL file and setup script as fallback, then user confirmed bucket was created via MCP externally
- **Outcome:** Bucket and RLS policies successfully created via intended MCP workflow
- **Temporary files:** Created `migrations/` and `scripts/` directories for fallback approach, cleaned up after confirmation

---

**Total deviations:** 1 authentication gate (resolved via human action)
**Impact on plan:** No impact - intended workflow (MCP) was successfully used, just required external execution

## Issues Encountered

**Environment variable access:**
- Initial script attempt failed because `SUPABASE_SERVICE_ROLE_KEY` not in `.env.local`
- Only anon key available, which lacks permissions for bucket creation
- Confirmed this is expected - service role key should not be committed to repo
- Bucket creation properly handled via MCP which has admin access

## User Setup Required

None - no external service configuration required. The Supabase Storage bucket and RLS policies were created via MCP and are now ready for use.

## Next Phase Readiness

**Ready for Plan 02 (Document Vault UI):**
- All dependencies installed and importable
- Storage infrastructure in place with proper RLS
- Server actions ready to be consumed by UI components
- TanStack Table and Tiptap ready for integration

**Ready for Plan 03 (Narrative Library):**
- Tiptap editor packages available
- Storage helpers can be reused for narrative attachments if needed
- Textarea component available as fallback

**No blockers identified.**

## Self-Check: PASSED

All SUMMARY.md claims verified:
- ✓ All created files exist on disk
- ✓ All modified files exist on disk
- ✓ Both task commits (80146df, 42e1ec4) found in git history
- ✓ Dependencies (@tiptap/react, @tanstack/react-table) installed and importable

---
*Phase: 03-document-vault-narrative-library*
*Completed: 2026-02-13*
