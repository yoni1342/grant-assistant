# Phase 3: Document Vault & Narrative Library - Research

**Researched:** 2026-02-13
**Domain:** File upload/management, rich text editing, document categorization, data tables with search/filter
**Confidence:** HIGH

## Summary

Phase 3 implements two critical document management features: a document vault for uploading/browsing organizational files (PDFs, DOCX, XLSX, images) and a narrative library for creating/editing reusable content blocks. Both features require robust file handling, AI-powered categorization via n8n webhooks, and sophisticated UI components for browsing/filtering.

**Key technical challenges:**
1. File uploads in Next.js 15 with Server Actions (no external libraries needed)
2. Rich text editing that works with React 19 and Next.js App Router
3. Private Supabase Storage buckets with RLS for document security
4. n8n webhook integration for async AI categorization
5. Data tables with search/filter/sort using shadcn/ui + TanStack Table

**Primary recommendation:** Use Supabase Storage for documents (not Google Drive), implement fire-and-forget n8n webhook pattern for AI categorization, use Tiptap for rich text editing (client component only), and build data tables with shadcn/ui + TanStack Table for search/filter functionality.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Storage | Built into @supabase/supabase-js | File storage with CDN, RLS, signed URLs | Standard storage solution for Supabase projects, integrates with existing auth |
| Tiptap | @tiptap/react ^2.x + @tiptap/starter-kit | Rich text editor (WYSIWYG) | Most popular React editor for 2026, modular, extensible, works with Next.js |
| TanStack Table | @tanstack/react-table ^8.x | Headless table library with sorting/filtering | Industry standard for data tables, pairs perfectly with shadcn/ui |
| React Hook Form | @refinedev/react-hook-form ^7.x + Zod | Form state and validation | Already in stack (from Phase 2), handles file inputs elegantly |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tiptap/pm | ^2.x | ProseMirror core (Tiptap dependency) | Required for Tiptap |
| @tanstack/react-query | ^5.x (optional) | Client-side cache for n8n status polling | If Realtime subscriptions insufficient for workflow status |
| date-fns | ^4.x | Date formatting for "uploaded 2 days ago" | Already in stack, use for document timestamps |
| lucide-react | ^0.x | Icons for upload, delete, edit actions | Already in stack (shadcn dependency) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tiptap | Lexical + LexKit | Lexical is Meta's editor (type-safe, modern), but Tiptap has better ecosystem/extensions in 2026 |
| Tiptap | BlockNote | BlockNote is block-based (Notion-like), overkill for simple narrative blocks |
| Tiptap | Quill | Quill is older, less modular, harder to customize with React |
| Supabase Storage | Google Drive API | Drive has better versioning but requires OAuth setup, loses RLS integration, more complex |
| TanStack Table | AG Grid | AG Grid is enterprise-grade but heavy, paid for full features, overkill for this use case |

**Installation:**

```bash
# File uploads (already have React Hook Form + Zod from Phase 2)
# No new dependencies needed

# Rich text editor
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-placeholder

# Data tables
npm install @tanstack/react-table

# shadcn/ui components (add new ones)
npx shadcn@latest add table dropdown-menu command popover

# Utilities (already installed)
# date-fns, lucide-react
```

## Architecture Patterns

### Recommended Project Structure

```
app/
├── (dashboard)/
│   ├── documents/
│   │   ├── page.tsx                    # Document vault main page (server component)
│   │   ├── components/
│   │   │   ├── document-table.tsx      # Data table with search/filter (client)
│   │   │   ├── upload-dialog.tsx       # File upload form (client)
│   │   │   ├── document-row-actions.tsx # Delete/download actions (client)
│   │   │   └── columns.tsx             # TanStack Table column definitions
│   │   └── actions.ts                  # Server actions: upload, delete
│   ├── narratives/
│   │   ├── page.tsx                    # Narrative library main page (server)
│   │   ├── components/
│   │   │   ├── narrative-list.tsx      # List view with search/filter (client)
│   │   │   ├── narrative-editor.tsx    # Tiptap editor (client)
│   │   │   ├── narrative-dialog.tsx    # Create/edit modal (client)
│   │   │   └── ai-customize-button.tsx # Trigger n8n customization (client)
│   │   └── actions.ts                  # Server actions: create, update, delete, trigger AI
lib/
├── supabase/
│   ├── storage.ts                      # Storage helpers (upload, delete, getSignedUrl)
│   └── client.ts / server.ts           # (already exist)
components/
└── ui/
    ├── table.tsx                        # shadcn table (already exists)
    ├── dropdown-menu.tsx                # shadcn dropdown (already exists)
    ├── command.tsx                      # shadcn command palette (NEW)
    └── popover.tsx                      # shadcn popover (NEW)
```

### Pattern 1: File Upload with Server Actions

**What:** Upload files using Next.js 15 Server Actions with FormData (no external upload library needed)

**When to use:** All file uploads in Phase 3 (document vault)

**Example:**

```typescript
// Source: https://strapi.io/blog/epic-next-js-15-tutorial-part-5-file-upload-using-server-actions
// app/(dashboard)/documents/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient()

  // Extract file from FormData
  const file = formData.get('file') as File
  if (!file) {
    return { error: 'No file provided' }
  }

  // Validate file type and size
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png', 'image/jpeg']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Invalid file type. Only PDF, DOCX, XLSX, PNG, JPG allowed.' }
  }

  const maxSize = 25 * 1024 * 1024 // 25MB
  if (file.size > maxSize) {
    return { error: 'File too large. Maximum size is 25MB.' }
  }

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Generate unique file path
  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/${Date.now()}.${fileExt}`

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) {
    return { error: uploadError.message }
  }

  // Insert metadata into documents table
  const { data: docData, error: dbError } = await supabase
    .from('documents')
    .insert({
      org_id: user.user_metadata.org_id,
      name: file.name,
      file_path: uploadData.path,
      file_type: file.type,
      file_size: file.size,
      category: null, // Will be set by n8n webhook
    })
    .select()
    .single()

  if (dbError) {
    // Rollback: delete uploaded file
    await supabase.storage.from('documents').remove([uploadData.path])
    return { error: dbError.message }
  }

  // Trigger n8n AI categorization (fire-and-forget)
  fetch(`${process.env.N8N_WEBHOOK_URL}/get-documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET!
    },
    body: JSON.stringify({ document_id: docData.id })
  }).catch(err => console.error('n8n webhook failed:', err))

  revalidatePath('/documents')
  return { data: docData }
}
```

**Client-side usage:**

```typescript
// app/(dashboard)/documents/components/upload-dialog.tsx
'use client'

import { uploadDocument } from '../actions'
import { useState } from 'react'

export function UploadDialog() {
  const [uploading, setUploading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setUploading(true)
    const result = await uploadDocument(formData)
    setUploading(false)

    if (result.error) {
      alert(result.error)
    } else {
      // Close dialog, show success toast
    }
  }

  return (
    <form action={handleSubmit}>
      <input
        type="file"
        name="file"
        accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
        required
      />
      <button type="submit" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  )
}
```

### Pattern 2: Private Storage Bucket with RLS

**What:** Supabase Storage bucket with RLS policies to restrict access to authenticated users

**When to use:** Document vault (Phase 3)

**Example:**

```sql
-- Source: https://supabase.com/docs/guides/storage/buckets/fundamentals
-- Create private bucket (buckets are private by default)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- RLS policy: Users can only upload their own files
CREATE POLICY "Users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policy: Users can view their own org's files
CREATE POLICY "Users can view org documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.file_path = name
      AND d.org_id = (SELECT user_metadata->>'org_id' FROM auth.users WHERE id = auth.uid())
  )
);

-- RLS policy: Users can delete their own uploads
CREATE POLICY "Users can delete own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  owner = auth.uid()
);
```

**Accessing private files:**

```typescript
// lib/supabase/storage.ts
import { createClient } from '@/lib/supabase/server'

export async function getDocumentSignedUrl(filePath: string) {
  const supabase = await createClient()

  // Generate signed URL (valid for 1 hour)
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, 3600)

  if (error) throw error
  return data.signedUrl
}
```

### Pattern 3: Tiptap Rich Text Editor (Client Component)

**What:** Tiptap editor for narrative blocks (must be client component due to DOM manipulation)

**When to use:** Narrative library editor (Phase 3)

**Example:**

```typescript
// Source: https://tiptap.dev/docs/editor/getting-started/install/nextjs
// app/(dashboard)/narratives/components/narrative-editor.tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

interface NarrativeEditorProps {
  content: string
  onUpdate: (content: string) => void
  placeholder?: string
}

export function NarrativeEditor({ content, onUpdate, placeholder }: NarrativeEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || 'Start writing your narrative...',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML())
    },
    immediatelyRender: false, // CRITICAL: prevents SSR hydration mismatch
  })

  if (!editor) {
    return null
  }

  return (
    <div className="border rounded-md">
      {/* Toolbar */}
      <div className="border-b p-2 flex gap-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'font-bold' : ''}
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'italic' : ''}
        >
          Italic
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'font-bold' : ''}
        >
          Bullet List
        </button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="prose p-4" />
    </div>
  )
}
```

**Usage in form:**

```typescript
// app/(dashboard)/narratives/components/narrative-dialog.tsx
'use client'

import { NarrativeEditor } from './narrative-editor'
import { useState } from 'react'
import { createNarrative } from '../actions'

export function NarrativeDialog() {
  const [content, setContent] = useState('')

  async function handleSubmit(formData: FormData) {
    formData.set('content', content)
    await createNarrative(formData)
  }

  return (
    <form action={handleSubmit}>
      <input name="title" placeholder="Title" required />
      <NarrativeEditor
        content={content}
        onUpdate={setContent}
        placeholder="Write your narrative block..."
      />
      <button type="submit">Save</button>
    </form>
  )
}
```

### Pattern 4: Data Table with Search/Filter (TanStack Table + shadcn/ui)

**What:** Searchable, filterable data table using TanStack Table (headless) + shadcn/ui components

**When to use:** Document vault table, narrative list (Phase 3)

**Example:**

```typescript
// Source: https://ui.shadcn.com/docs/components/radix/data-table
// app/(dashboard)/documents/components/columns.tsx
'use client'

import { ColumnDef } from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal } from 'lucide-react'
import { DocumentRowActions } from './document-row-actions'

export type Document = {
  id: string
  name: string
  file_type: string
  file_size: number
  category: string | null
  ai_category: string | null
  created_at: string
}

export const columns: ColumnDef<Document>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const fileType = row.original.file_type
      const icon = fileType.includes('pdf') ? '📄' :
                   fileType.includes('image') ? '🖼️' : '📊'
      return (
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="font-medium">{row.getValue('name')}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => {
      const category = row.original.ai_category || row.original.category
      return category ? (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
          {category}
        </span>
      ) : (
        <span className="text-muted-foreground">Uncategorized</span>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Uploaded',
    cell: ({ row }) => {
      return formatDistanceToNow(new Date(row.getValue('created_at')), { addSuffix: true })
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <DocumentRowActions document={row.original} />,
  },
]
```

```typescript
// app/(dashboard)/documents/components/document-table.tsx
'use client'

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DocumentTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    state: {
      columnFilters,
    },
  })

  return (
    <div>
      {/* Search input */}
      <div className="flex items-center py-4">
        <Input
          placeholder="Search documents..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No documents found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

### Pattern 5: Fire-and-Forget n8n Webhook for AI Categorization

**What:** Server action triggers n8n webhook for document categorization without waiting for response

**When to use:** AI document categorization after upload (Phase 3)

**Example:**

```typescript
// Source: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
// app/(dashboard)/documents/actions.ts (excerpt)
'use server'

export async function uploadDocument(formData: FormData) {
  // ... upload file, insert metadata ...

  // Fire-and-forget: trigger n8n categorization
  // Don't await this - let it run in background
  triggerDocumentCategorization(docData.id).catch(err => {
    console.error('n8n categorization webhook failed:', err)
  })

  return { data: docData }
}

async function triggerDocumentCategorization(documentId: string) {
  const response = await fetch(`${process.env.N8N_WEBHOOK_URL}/categorize-document`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET!,
    },
    body: JSON.stringify({ document_id: documentId }),
  })

  if (!response.ok) {
    throw new Error(`n8n webhook returned ${response.status}`)
  }
}
```

**n8n workflow structure:**
1. Webhook trigger node (receives `document_id`)
2. Supabase node: Get document by ID
3. Supabase Storage node: Download file
4. OpenAI/Anthropic node: Categorize document ("budget", "narrative", "financials", etc.)
5. Supabase node: Update document record with `ai_category`

**UI shows progress via Realtime:**

```typescript
// app/(dashboard)/documents/components/document-table.tsx (excerpt)
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function DocumentTable({ initialData }) {
  const [documents, setDocuments] = useState(initialData)
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to document updates (AI categorization completes)
    const channel = supabase
      .channel('documents')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'documents' },
        (payload) => {
          setDocuments(prev => prev.map(doc =>
            doc.id === payload.new.id ? payload.new : doc
          ))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ... render table ...
}
```

### Anti-Patterns to Avoid

- **Don't use `'use client'` on server actions**: Server actions MUST be in server components or files with `'use server'` directive
- **Don't import Tiptap in server components**: Rich text editors require client-side DOM APIs — always use `'use client'`
- **Don't skip file validation**: Always validate file type AND size on both client (UX) and server (security)
- **Don't use Supabase `download()` for large files**: For files >5MB, use signed URLs to let browser download directly from CDN
- **Don't wait for n8n webhook responses in upload flow**: Use fire-and-forget + Realtime to avoid timeouts

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rich text editor | Custom contentEditable wrapper | Tiptap | ContentEditable is deceptively complex — handling selection, undo/redo, paste, keyboard shortcuts requires thousands of lines. Tiptap/ProseMirror handles all edge cases |
| File type validation | Regex on file extension | File.type + server-side magic number check | Extensions can be spoofed. MIME type + magic bytes (first bytes of file) is the secure way |
| Data table pagination/sort | Manual array slicing | TanStack Table | Server-side pagination, virtual scrolling, complex filtering — TanStack handles all performance optimizations |
| Signed URL generation | Manual JWT signing | Supabase Storage `.createSignedUrl()` | Supabase's signed URLs are time-limited, scoped to bucket/path, and use storage service's internal key |
| Document thumbnail generation | Server-side PDF rendering | Browser's native PDF viewer + preview links | Server-side rendering (Puppeteer, ImageMagick) is slow and resource-heavy. Use signed URLs to let browser handle it |

**Key insight:** File handling and rich text editing have decades of edge cases (character encodings, browser quirks, security exploits). Use battle-tested libraries that have already solved these problems.

## Common Pitfalls

### Pitfall 1: Hydration Mismatch with Tiptap

**What goes wrong:** Tiptap manipulates DOM directly. If server renders initial HTML and client tries to hydrate, React throws hydration errors.

**Why it happens:** Server components render HTML on server. Tiptap expects to control the DOM from mount, not rehydrate existing markup.

**How to avoid:**
- Set `immediatelyRender: false` in `useEditor()` config
- Use dynamic import with `ssr: false` if still seeing issues: `const Editor = dynamic(() => import('./editor'), { ssr: false })`
- Mark editor components with `'use client'` directive

**Warning signs:** React hydration errors in console, blank editor on first load, works after client-side navigation

### Pitfall 2: File Upload Without Rollback

**What goes wrong:** File uploads to Supabase Storage succeed, but database insert fails. Orphaned files accumulate in storage bucket.

**Why it happens:** Storage and database are separate systems. One can succeed while the other fails.

**How to avoid:**
- Always wrap upload + DB insert in try/catch
- If DB insert fails, delete the uploaded file: `await supabase.storage.from('bucket').remove([filePath])`
- Consider using database transactions for critical uploads (upload metadata first, then file)

**Warning signs:** Storage bucket has files not referenced in `documents` table, storage costs exceed data volume

### Pitfall 3: RLS Policies Don't Match Application Logic

**What goes wrong:** User uploads document successfully, but can't view it in the table. Or worse: can view other orgs' documents.

**Why it happens:** RLS policies on `storage.objects` and `documents` table don't align. E.g., storage policy checks `owner = auth.uid()` but table policy checks `org_id`.

**How to avoid:**
- Design RLS policies TOGETHER for `storage.objects` and `documents` table
- Use consistent org_id checks: both should reference `user_metadata->>'org_id'`
- Test with multiple users: upload as User A, verify User B in same org can see, User C in different org cannot

**Warning signs:** Documents appear/disappear randomly, file downloads fail with 403, users report "I uploaded this but can't find it"

### Pitfall 4: n8n Webhook Categorization Fails Silently

**What goes wrong:** Document uploads succeed, but AI categorization never happens. Documents stay in "Uncategorized" state forever.

**Why it happens:** n8n webhook fails (network error, rate limit, AI API down), but app doesn't retry or notify user.

**How to avoid:**
- Store categorization status in `documents` table: `categorization_status: 'pending' | 'completed' | 'failed'`
- n8n workflow writes `'completed'` or `'failed'` status back to DB
- UI shows status: "Categorizing..." → "Finance" or "Categorization failed (click to retry)"
- Add retry button that re-triggers webhook

**Warning signs:** Many documents stuck in "pending" state, n8n logs show errors but UI doesn't reflect it

### Pitfall 5: Search/Filter Breaks with Special Characters

**What goes wrong:** User uploads file named "Q1 2024 (Final).pdf", search for "Q1 2024" returns no results.

**Why it happens:** TanStack Table's default filter uses strict equality. Parentheses, dashes, underscores in filenames break simple string matching.

**How to avoid:**
- Use fuzzy filter function: `filterFn: (row, id, value) => row.getValue(id).toLowerCase().includes(value.toLowerCase())`
- Normalize search query: remove special chars, trim whitespace
- For advanced search: use `fuse.js` for fuzzy matching

**Warning signs:** Users report "I know I uploaded this file but can't find it in search"

### Pitfall 6: Large File Downloads Timeout in Browser

**What goes wrong:** User clicks "Download" on 20MB PDF. Browser shows "Downloading..." for 30 seconds, then times out.

**Why it happens:** Using Supabase `.download()` method loads entire file into memory, then creates blob URL. For large files, this is slow.

**How to avoid:**
- For files >5MB: use `.createSignedUrl()` and render as `<a href={signedUrl} download>` — browser downloads directly from CDN
- For previews: use signed URLs in `<embed>` or `<object>` tags for PDFs
- For images: use Supabase's image transformation API to generate thumbnails

**Warning signs:** Long download times, browser memory spikes, mobile users complain downloads never complete

## Code Examples

Verified patterns from official sources:

### Uploading File with Server Action

```typescript
// Source: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
// app/(dashboard)/documents/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function uploadDocument(formData: FormData) {
  const file = formData.get('file') as File

  // File validation
  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Invalid file type' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const fileName = `${user.id}/${Date.now()}-${file.name}`

  const { error } = await supabase.storage
    .from('documents')
    .upload(fileName, file)

  if (error) return { error: error.message }

  return { success: true, fileName }
}
```

### Creating Signed URL for Download

```typescript
// Source: https://supabase.com/docs/guides/storage/buckets/fundamentals
// lib/supabase/storage.ts
import { createClient } from './server'

export async function getDocumentUrl(filePath: string, expiresIn = 3600) {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, expiresIn)

  if (error) throw error

  return data.signedUrl
}
```

### TanStack Table with Filtering

```typescript
// Source: https://ui.shadcn.com/docs/components/radix/data-table
'use client'

import { useReactTable, getCoreRowModel, getFilteredRowModel } from '@tanstack/react-table'
import { useState } from 'react'

export function DocumentTable({ data, columns }) {
  const [columnFilters, setColumnFilters] = useState([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    state: { columnFilters },
  })

  return (
    <div>
      <input
        placeholder="Search..."
        value={table.getColumn('name')?.getFilterValue() ?? ''}
        onChange={(e) => table.getColumn('name')?.setFilterValue(e.target.value)}
      />
      {/* Render table rows */}
    </div>
  )
}
```

### Supabase Realtime for Document Updates

```typescript
// Source: https://supabase.com/docs/guides/realtime
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useDocumentUpdates(initialDocs) {
  const [documents, setDocuments] = useState(initialDocs)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('documents')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'documents' },
        (payload) => {
          setDocuments(prev => prev.map(doc =>
            doc.id === payload.new.id ? payload.new : doc
          ))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return documents
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom file upload with XMLHttpRequest | Server Actions with FormData | Next.js 13 (2023), refined in v15 (2024) | No need for API routes, built-in CSRF protection, works without JS |
| Quill / Draft.js for rich text | Tiptap / Lexical | 2023-2024 | Better React integration, TypeScript support, modular extensions |
| Google Drive links in DB | Supabase Storage with signed URLs | Ongoing (Supabase Storage matured 2023) | RLS integration, no OAuth flow, CDN built-in |
| Synchronous n8n webhook calls | Fire-and-forget + Realtime | Best practice emerged 2024-2025 | No timeouts, better UX with progress indicators |
| AG Grid / Material Table | TanStack Table + shadcn/ui | 2024-2025 | Headless library = full control, smaller bundle, no licensing |

**Deprecated/outdated:**
- **@supabase/auth-helpers-nextjs**: Deprecated. Use `@supabase/ssr` instead (since mid-2024)
- **Draft.js**: Facebook no longer maintains it. Use Tiptap or Lexical
- **middleware.ts for Next.js auth**: Next.js 16 renamed to `proxy.ts` (November 2025)
- **Client-side file uploads with progress bars**: Server Actions handle this natively with React's `useFormStatus` hook

## Open Questions

1. **Should we support file versioning?**
   - What we know: Supabase Storage supports upsert (overwrite), but no built-in versioning
   - What's unclear: Do users need to upload multiple versions of the same document (e.g., "Budget_v1.pdf", "Budget_v2.pdf")?
   - Recommendation: Start without versioning. Use `{name}_v{number}.{ext}` naming convention if users upload manually. Add proper versioning in v2 if needed

2. **How to handle document deletion when referenced by grants?**
   - What we know: `documents` table has nullable `grant_id` column
   - What's unclear: If a document is attached to a grant, should deletion be blocked? Or cascade delete? Or soft delete?
   - Recommendation: Soft delete (add `deleted_at` column). Never hard-delete documents to preserve grant history. UI shows deleted docs as "Removed (2024-01-15)"

3. **Should AI categorization be required or optional?**
   - What we know: n8n webhook categorizes documents automatically
   - What's unclear: If webhook fails, do we block the user? Or let them set category manually?
   - Recommendation: Make AI categorization optional. Show "Categorizing..." state, fall back to manual category selection if fails after 30 seconds

4. **How many narrative categories do we need?**
   - What we know: Schema has `category` enum with: mission, impact, methods, evaluation, sustainability, capacity, budget_narrative, other
   - What's unclear: Is this list sufficient? Too restrictive?
   - Recommendation: Start with these 8. Add `custom_category` text field for user-defined categories. Analyze usage in v1, promote common custom categories to enum in v2

## Sources

### Primary (HIGH confidence)

- [Supabase Storage Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) - Storage access models, RLS patterns
- [Supabase Storage Quickstart](https://supabase.com/docs/guides/storage/quickstart) - Upload/download examples
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) - RLS policies for storage.objects
- [Next.js Forms Guide](https://nextjs.org/docs/app/guides/forms) - Server Actions with FormData
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) - File upload patterns
- [Tiptap Next.js Guide](https://tiptap.dev/docs/editor/getting-started/install/nextjs) - Next.js integration, hydration fixes
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/radix/data-table) - TanStack Table implementation
- [n8n Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) - Webhook triggers, binary data

### Secondary (MEDIUM confidence)

- [Next.js 15 File Upload Tutorial (Strapi Blog, 2026)](https://strapi.io/blog/epic-next-js-15-tutorial-part-5-file-upload-using-server-actions) - Server Actions file upload examples
- [Next.js 15 Server Actions Guide (Medium, Jan 2026)](https://medium.com/@saad.minhas.codes/next-js-15-server-actions-complete-guide-with-real-examples-2026-6320fbfa01c3) - FormData handling
- [Rich Text Editor Comparison (Liveblocks, 2025)](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025) - Tiptap vs Lexical vs BlockNote
- [Tiptap with Next.js Discussion (GitHub, 2024)](https://github.com/ueberdosis/tiptap/discussions/2786) - Hydration issues, solutions
- [OpenStatus Data Table Filters](https://data-table.openstatus.dev/) - Advanced TanStack Table patterns
- [tablecn (GitHub)](https://github.com/sadmann7/tablecn) - shadcn/ui table with server-side operations

### Tertiary (LOW confidence)

- [n8n AI File Storage Guide (Fast.io, 2026)](https://fast.io/resources/n8n-ai-file-storage/) - n8n document processing workflows
- [React Rich Text Editors Comparison (Contentful)](https://www.contentful.com/blog/react-rich-text-editor/) - Editor library overview

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified in official docs, widely used in 2026
- Architecture patterns: HIGH - Patterns verified with official Next.js, Supabase, Tiptap docs
- Pitfalls: MEDIUM-HIGH - Based on known issues from docs + community reports

**Research date:** 2026-02-13
**Valid until:** 2026-04-13 (60 days for stable stack, Next.js 16 is current, Tiptap actively maintained)
