'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Heading2, List, ListOrdered, Quote } from 'lucide-react'

interface NarrativeEditorProps {
  content: string
  onUpdate: (html: string) => void
  placeholder?: string
  editable?: boolean
}

export function NarrativeEditor({
  content,
  onUpdate,
  placeholder = "Start writing your narrative...",
  editable = true
}: NarrativeEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML())
    },
  })

  if (!editor) {
    return null
  }

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Toolbar */}
      {editable && (
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
        </div>
      )}

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[200px] focus-within:outline-none"
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
  )
}
