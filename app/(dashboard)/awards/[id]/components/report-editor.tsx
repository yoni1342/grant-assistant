"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useDebouncedCallback } from 'use-debounce'
import { Bold, Italic, Heading2, List, ListOrdered, Quote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { updateReport } from '../../reports-actions'

interface Report {
  id: string
  title: string
  report_type: 'interim' | 'final'
  due_date: string
  status: string
  content: string | null
  submitted_at: string | null
}

interface ReportEditorProps {
  report: Report
}

export function ReportEditor({ report }: ReportEditorProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const debouncedSave = useDebouncedCallback(
    async (html: string) => {
      setSaving(true)
      setSaved(false)
      await updateReport(report.id, { content: html })
      setSaving(false)
      setSaved(true)

      // Hide "Saved" message after 2 seconds
      setTimeout(() => {
        setSaved(false)
      }, 2000)
    },
    2000 // 2 second debounce
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your report...',
      }),
    ],
    content: report.content || '',
    editable: true,
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getHTML())
    },
  })

  const handleMarkAsSubmitted = async () => {
    const result = await updateReport(report.id, {
      status: 'submitted',
    })

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success("Report marked as submitted")
    router.refresh()
  }

  if (!editor) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium">{report.title}</h2>
          <Badge
            variant={report.report_type === 'final' ? 'destructive' : 'secondary'}
          >
            {report.report_type}
          </Badge>
        </div>
        <Button
          onClick={handleMarkAsSubmitted}
          disabled={report.status === 'submitted'}
        >
          {report.status === 'submitted' ? 'Submitted' : 'Mark as Submitted'}
        </Button>
      </div>

      {/* Editor */}
      <div className="border rounded-md overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
              editor.isActive('bold')
                ? 'bg-zinc-200 dark:bg-zinc-700'
                : ''
            }`}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
              editor.isActive('italic')
                ? 'bg-zinc-200 dark:bg-zinc-700'
                : ''
            }`}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-zinc-200 dark:bg-zinc-700'
                : ''
            }`}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
              editor.isActive('bulletList')
                ? 'bg-zinc-200 dark:bg-zinc-700'
                : ''
            }`}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
              editor.isActive('orderedList')
                ? 'bg-zinc-200 dark:bg-zinc-700'
                : ''
            }`}
            title="Ordered List"
          >
            <ListOrdered className="h-4 w-4" />
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
              editor.isActive('blockquote')
                ? 'bg-zinc-200 dark:bg-zinc-700'
                : ''
            }`}
            title="Blockquote"
          >
            <Quote className="h-4 w-4" />
          </button>

          {/* Save status indicator */}
          <div className="ml-auto text-xs text-muted-foreground">
            {saving && 'Saving...'}
            {saved && 'Saved'}
          </div>
        </div>

        {/* Editor Content */}
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none p-4 min-h-[400px] focus-within:outline-none"
        />

        <style jsx global>{`
          .ProseMirror:focus {
            outline: none;
          }

          .ProseMirror p.is-editor-empty:first-child::before {
            color: #adb5bd;
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
          }
        `}</style>
      </div>
    </div>
  )
}
