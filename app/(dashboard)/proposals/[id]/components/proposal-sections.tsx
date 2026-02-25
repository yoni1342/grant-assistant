'use client'

import { useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'

interface ChapterItem {
  chapter: string
  sort_order: number
}

interface Section {
  id: string
  title: string
  sort_order?: number
  content: ChapterItem[] | null
  header1: ChapterItem[] | null
  header2: ChapterItem[] | null
  tabulation: ChapterItem[] | null
}

interface ProposalSectionsProps {
  sections: Section[]
}

function parseTabulation(text: string): string {
  const lines = text.split('\n').filter((l) => l.trim())
  if (lines.length === 0) return ''

  const rows = lines.map((line) =>
    line.split('|').map((cell) => cell.trim())
  )

  const headerCells = rows[0]
    .map((cell) => `<th>${cell}</th>`)
    .join('')
  const headerRow = `<tr>${headerCells}</tr>`

  const bodyRows = rows
    .slice(1)
    .map((row) => {
      const cells = row.map((cell) => `<td>${cell}</td>`).join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  return `<table><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>`
}

function buildSectionHtml(section: Section): string {
  type TaggedItem = ChapterItem & { type: 'header1' | 'header2' | 'content' | 'tabulation' }

  const items: TaggedItem[] = []

  const addItems = (arr: ChapterItem[] | null, type: TaggedItem['type']) => {
    if (!Array.isArray(arr)) return
    arr.forEach((item) => items.push({ ...item, type }))
  }

  addItems(section.header1, 'header1')
  addItems(section.header2, 'header2')
  addItems(section.content, 'content')
  addItems(section.tabulation, 'tabulation')

  items.sort((a, b) => a.sort_order - b.sort_order)

  const body = items
    .map((item) => {
      switch (item.type) {
        case 'header1':
          return `<h2>${item.chapter}</h2>`
        case 'header2':
          return `<h3>${item.chapter}</h3>`
        case 'content':
          return `<p>${item.chapter}</p>`
        case 'tabulation':
          return parseTabulation(item.chapter)
        default:
          return `<p>${item.chapter}</p>`
      }
    })
    .join('')

  return `<h1>${section.title}</h1>${body}`
}

function buildDocumentHtml(sections: Section[]): string {
  const sorted = [...sections].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  )
  return sorted.map(buildSectionHtml).join('<hr />')
}

export function ProposalSections({ sections }: ProposalSectionsProps) {
  const html = useMemo(() => buildDocumentHtml(sections), [sections])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: html,
    editable: false,
  })

  // Update editor content when sections change
  useMemo(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(html)
    }
  }, [editor, html])

  if (sections.length === 0) {
    return (
      <div className="border rounded-md p-8 text-center text-muted-foreground">
        No sections yet. Proposal sections will appear here after generation completes.
      </div>
    )
  }

  if (!editor) {
    return null
  }

  return (
    <div className="proposal-document-preview">
      <div className="proposal-document-page">
        <EditorContent
          editor={editor}
          className="prose prose-sm dark:prose-invert max-w-none"
        />
      </div>

      <style jsx global>{`
        .proposal-document-preview {
          display: flex;
          justify-content: center;
        }

        .proposal-document-page {
          background: hsl(var(--background));
          max-width: 816px;
          width: 100%;
          padding: 2.5rem 2.5rem;
          box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.08),
            0 4px 12px rgba(0, 0, 0, 0.06);
          border: 1px solid hsl(var(--border));
          border-radius: 4px;
        }

        .proposal-document-page .ProseMirror {
          outline: none;
        }

        .proposal-document-page .ProseMirror h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          color: hsl(var(--foreground));
          border-bottom: 2px solid hsl(var(--primary) / 0.2);
          padding-bottom: 0.35rem;
        }

        .proposal-document-page .ProseMirror h1:first-child {
          margin-top: 0;
        }

        .proposal-document-page .ProseMirror h2 {
          font-size: 1.2rem;
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          color: hsl(var(--foreground));
        }

        .proposal-document-page .ProseMirror h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.25rem;
          color: hsl(var(--muted-foreground));
        }

        .proposal-document-page .ProseMirror p {
          margin-top: 0.4rem;
          margin-bottom: 0.4rem;
          line-height: 1.75;
          color: hsl(var(--foreground));
        }

        .proposal-document-page .ProseMirror hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 2rem 0;
        }

        .proposal-document-page .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
          font-size: 0.875rem;
        }

        .proposal-document-page .ProseMirror table th {
          background-color: hsl(var(--muted));
          font-weight: 600;
          text-align: left;
          padding: 0.5rem 0.75rem;
          border: 1px solid hsl(var(--border));
        }

        .proposal-document-page .ProseMirror table td {
          padding: 0.5rem 0.75rem;
          border: 1px solid hsl(var(--border));
        }

        .proposal-document-page .ProseMirror table tr:nth-child(even) td {
          background-color: hsl(var(--muted) / 0.3);
        }
      `}</style>
    </div>
  )
}
