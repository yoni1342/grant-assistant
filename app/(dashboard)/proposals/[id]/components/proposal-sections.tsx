'use client'

import { useMemo, useState, useLayoutEffect, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Button } from "@/components/ui/button"
import { Pencil, Save, RotateCcw, Loader2 } from "lucide-react"
import { updateProposalSections } from '../../actions'
import { useExportPdf } from './use-export-pdf'

interface ChapterItem {
  chapter: string
  sort_order: number
  type?: string
}

interface Section {
  id: string
  title: string
  created_at: string
  sort_order: number
  content: ChapterItem[] | null
  header1: ChapterItem[] | null
  header2: ChapterItem[] | null
  tabulation: ChapterItem[] | null
}

export interface ProposalSectionsHandle {
  exportPdf: () => Promise<void>
  startEdit: () => void
  resetEdit: () => void
  saveEdit: () => Promise<void>
  isEditing: boolean
  isSaving: boolean
}

interface ProposalSectionsProps {
  sections: Section[]
  proposalId: string
  proposalTitle?: string
}

// A4 page content area: 1123px total − 96px top pad − 100px bottom pad
const PAGE_CONTENT_HEIGHT = 927

function parseTabulation(text: string): string {
  const lines = text.split('\n').filter((l) => l.trim())
  if (lines.length === 0) return ''

  const rows = lines.map((line) =>
    line.split('|').map((cell) => cell.trim())
  )

  const colCount = rows[0]?.length || 0

  // 2-column tables are key-value (e.g., Grant Application Summary) — no header row
  if (colCount <= 2) {
    const bodyRows = rows
      .map((row) => {
        const label = `<td class="kv-label">${row[0] || ''}</td>`
        const value = `<td class="kv-value">${row[1] || ''}</td>`
        return `<tr>${label}${value}</tr>`
      })
      .join('')
    return `<table class="kv-table"><tbody>${bodyRows}</tbody></table>`
  }

  // 3+ column tables have a header row (e.g., Budget)
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

function formatInlineMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function renderContentHtml(chapter: string, attrs: string): string {
  const lines = chapter.split('\n').filter(l => l.trim())
  const isBulletList = lines.length > 0 && lines.every(l => /^[•\-]\s/.test(l.trim()))

  if (isBulletList) {
    const items = lines
      .map(l => `<li>${formatInlineMarkdown(l.replace(/^[•\-]\s*/, '').trim())}</li>`)
      .join('')
    return `<ul ${attrs}>${items}</ul>`
  }

  // Signature block
  if (chapter.startsWith('Respectfully Submitted')) {
    const sigLines = lines.map(l => `<p>${formatInlineMarkdown(l)}</p>`).join('')
    return `<div class="signature-block" ${attrs}>${sigLines}</div>`
  }

  return `<p ${attrs}>${formatInlineMarkdown(chapter)}</p>`
}

function buildSectionHtml(section: Section): string {
  type TaggedItem = ChapterItem & { type: string }
  const tagged: TaggedItem[] = []

  const add = (arr: ChapterItem[] | null, fallbackType: string) => {
    if (!Array.isArray(arr)) return
    arr.forEach((item) => tagged.push({ ...item, type: item.type || fallbackType }))
  }

  add(section.header1, 'header1')
  add(section.header2, 'header2')
  add(section.content, 'content')
  add(section.tabulation, 'tabulation')
  tagged.sort((a, b) => a.sort_order - b.sort_order)

  return tagged
    .map((item) => {
      const attrs = `data-section-id="${section.id}" data-type="${item.type}" data-sort-order="${item.sort_order}"`
      switch (item.type) {
        case 'header1': return `<h2 ${attrs}>${formatInlineMarkdown(item.chapter)}</h2>`
        case 'header2': return `<h3 ${attrs}>${formatInlineMarkdown(item.chapter)}</h3>`
        case 'tabulation':
        case 'table': return `<div ${attrs} class="table-wrap">${parseTabulation(item.chapter)}</div>`
        default: return renderContentHtml(item.chapter, attrs)
      }
    })
    .join('')
}

function extractEditedSections(
  container: HTMLDivElement,
  originalSections: Section[]
): { id: string; title: string; content: ChapterItem[] | null; header1: ChapterItem[] | null; header2: ChapterItem[] | null; tabulation: ChapterItem[] | null }[] {
  const sectionMap = new Map<string, {
    title: string
    content: ChapterItem[]
    header1: ChapterItem[]
    header2: ChapterItem[]
    tabulation: ChapterItem[]
  }>()

  for (const s of originalSections) {
    sectionMap.set(s.id, {
      title: s.title,
      content: [],
      header1: [],
      header2: [],
      tabulation: [],
    })
  }

  const elements = container.querySelectorAll('[data-section-id]')

  for (const el of elements) {
    const sectionId = el.getAttribute('data-section-id')
    const type = el.getAttribute('data-type')
    const sortOrder = parseInt(el.getAttribute('data-sort-order') || '0', 10)

    if (!sectionId || !type) continue

    if (!sectionMap.has(sectionId)) {
      sectionMap.set(sectionId, { title: '', content: [], header1: [], header2: [], tabulation: [] })
    }

    const section = sectionMap.get(sectionId)!

    if (type === 'title') {
      section.title = el.textContent?.trim() || section.title
    } else if (type === 'tabulation') {
      const table = el.querySelector('table')
      if (table) {
        const rows = Array.from(table.rows)
        const pipeText = rows
          .map(row => Array.from(row.cells).map(cell => cell.textContent?.trim() || '').join(' | '))
          .join('\n')
        section.tabulation.push({ chapter: pipeText, sort_order: sortOrder })
      }
    } else if (type === 'content') {
      section.content.push({ chapter: el.textContent?.trim() || '', sort_order: sortOrder })
    } else if (type === 'header1') {
      section.header1.push({ chapter: el.textContent?.trim() || '', sort_order: sortOrder })
    } else if (type === 'header2') {
      section.header2.push({ chapter: el.textContent?.trim() || '', sort_order: sortOrder })
    }
  }

  return Array.from(sectionMap.entries()).map(([id, data]) => ({
    id,
    title: data.title,
    content: data.content.length > 0 ? data.content : null,
    header1: data.header1.length > 0 ? data.header1 : null,
    header2: data.header2.length > 0 ? data.header2 : null,
    tabulation: data.tabulation.length > 0 ? data.tabulation : null,
  }))
}

export const ProposalSections = forwardRef<ProposalSectionsHandle, ProposalSectionsProps>(function ProposalSections({ sections, proposalId, proposalTitle }, ref) {
  const measureRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const thumbRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const [contentPages, setContentPages] = useState<string[][]>([])
  const [activePage, setActivePage] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [renderKey, setRenderKey] = useState(0)
  const { exportPdf } = useExportPdf()

  // Store latest values in a ref so the imperative handle always has current data
  const exportDataRef = useRef({ allPages: [] as string[], coverTitle: '', totalPages: 0, proposalTitle: '' })

  useImperativeHandle(ref, () => ({
    exportPdf: () => exportPdf(exportDataRef.current),
    startEdit: handleEdit,
    resetEdit: handleReset,
    saveEdit: handleSave,
    isEditing,
    isSaving,
  }), [exportPdf, isEditing, isSaving])

  const { standalonePages, contentItems } = useMemo(() => {
    if (sections.length === 0) return { standalonePages: [] as string[], contentItems: [] as string[] }

    const sorted = [...sections].sort((a, b) => a.sort_order - b.sort_order)

    const standalonePages: string[] = []
    const contentSections: Section[] = []

    for (let idx = 0; idx < sorted.length; idx++) {
      const section = sorted[idx]
      const isCover = idx === 0 || section.title === 'Cover Page' || (section as any).sectionType === 'cover'
      const isToc = /table of contents/i.test(section.title)

      if (isCover) {
        // Build cover page with specific structure
        const coverItems = (section.content || []).sort((a, b) => a.sort_order - b.sort_order)
        const orgName = coverItems[0]?.chapter || ''
        const projectTitle = coverItems[1]?.chapter || ''
        const metaItems = coverItems.slice(2)

        standalonePages.push(`
          <div class="cover-label">GRANT PROPOSAL</div>
          <div class="cover-org" data-section-id="${section.id}" data-type="content" data-sort-order="${coverItems[0]?.sort_order || 1}">${orgName}</div>
          <div class="cover-project" data-section-id="${section.id}" data-type="content" data-sort-order="${coverItems[1]?.sort_order || 2}">${projectTitle}</div>
          <div class="cover-divider"></div>
          ${metaItems.map(item =>
            `<p class="cover-meta-line" data-section-id="${section.id}" data-type="content" data-sort-order="${item.sort_order}">${item.chapter}</p>`
          ).join('')}
        `)
      } else if (isToc) {
        const tocItems = (section.content || []).sort((a, b) => a.sort_order - b.sort_order)
        standalonePages.push(`
          <h1 class="toc-title" data-section-id="${section.id}" data-type="title">Table of Contents</h1>
          <div class="toc-divider"></div>
          <div class="toc-list">
            ${tocItems.map(item =>
              `<div class="toc-item" data-section-id="${section.id}" data-type="content" data-sort-order="${item.sort_order}">${item.chapter}</div>`
            ).join('')}
          </div>
        `)
      } else {
        contentSections.push(section)
      }
    }

    const contentItems: string[] = []
    for (const section of contentSections) {
      contentItems.push(`<h1 data-section-id="${section.id}" data-type="title">${section.title}</h1>`)

      type TaggedItem = ChapterItem & { type: 'header1' | 'header2' | 'content' | 'tabulation' }
      const tagged: TaggedItem[] = []
      const add = (arr: ChapterItem[] | null, type: TaggedItem['type']) => {
        if (!Array.isArray(arr)) return
        arr.forEach((item) => tagged.push({ ...item, type }))
      }
      add(section.header1, 'header1')
      add(section.header2, 'header2')
      add(section.content, 'content')
      add(section.tabulation, 'tabulation')
      tagged.sort((a, b) => a.sort_order - b.sort_order)

      for (const item of tagged) {
        const attrs = `data-section-id="${section.id}" data-type="${item.type}" data-sort-order="${item.sort_order}"`
        switch (item.type) {
          case 'header1': contentItems.push(`<h2 ${attrs}>${formatInlineMarkdown(item.chapter)}</h2>`); break
          case 'header2': contentItems.push(`<h3 ${attrs}>${formatInlineMarkdown(item.chapter)}</h3>`); break
          case 'tabulation': contentItems.push(`<div ${attrs} class="table-wrap">${parseTabulation(item.chapter)}</div>`); break
          default: contentItems.push(renderContentHtml(item.chapter, attrs)); break
        }
      }
    }

    return { standalonePages, contentItems }
  }, [sections])

  // Measure actual rendered heights and paginate
  useLayoutEffect(() => {
    if (!measureRef.current || contentItems.length === 0) {
      setContentPages([])
      return
    }

    const container = measureRef.current
    const children = Array.from(container.children) as HTMLElement[]

    if (children.length !== contentItems.length) {
      setContentPages([contentItems])
      return
    }

    const pages: string[][] = []
    let currentPage: string[] = []
    let currentHeight = 0

    for (let i = 0; i < children.length; i++) {
      const el = children[i]
      const style = window.getComputedStyle(el)
      const mt = parseFloat(style.marginTop) || 0
      const mb = parseFloat(style.marginBottom) || 0
      const totalHeight = mt + el.offsetHeight + mb

      // Add the element to the current page first
      currentPage.push(contentItems[i])
      currentHeight += totalHeight

      // Break AFTER adding — so every closed page is full (no bottom whitespace)
      if (currentHeight >= PAGE_CONTENT_HEIGHT && i < children.length - 1) {
        pages.push(currentPage)
        currentPage = []
        currentHeight = 0
      }
    }

    if (currentPage.length > 0) {
      pages.push(currentPage)
    }

    setContentPages(pages)
  }, [contentItems])

  const totalPages = standalonePages.length + contentPages.length

  // Extract cover info for headers and footers
  const coverTitle = useMemo(() => {
    if (sections.length === 0) return ''
    const sorted = [...sections].sort((a, b) => a.sort_order - b.sort_order)
    // Use first content item (org name) from cover section for footer
    const coverSection = sorted[0]
    const orgName = coverSection?.content?.[0]?.chapter || ''
    return orgName ? `${orgName} | Grant Proposal` : sorted[0]?.title || ''
  }, [sections])

  // Track which page is in view using IntersectionObserver
  useEffect(() => {
    if (totalPages === 0 || !contentRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIdx = activePage
        let bestRatio = 0
        for (const entry of entries) {
          const idx = Number(entry.target.getAttribute('data-page-idx'))
          if (!isNaN(idx) && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio
            bestIdx = idx
          }
        }
        if (bestRatio > 0) {
          setActivePage(bestIdx)
        }
      },
      {
        root: contentRef.current,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      }
    )

    pageRefs.current.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [totalPages, contentPages.length, activePage])

  // Scroll the active thumbnail into view in the sidebar
  useEffect(() => {
    const thumb = thumbRefs.current.get(activePage)
    if (thumb && sidebarRef.current) {
      thumb.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activePage])

  const scrollToPage = useCallback((pageIdx: number) => {
    const el = pageRefs.current.get(pageIdx)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const setPageRef = useCallback((idx: number, el: HTMLDivElement | null) => {
    if (el) pageRefs.current.set(idx, el)
    else pageRefs.current.delete(idx)
  }, [])

  const setThumbRef = useCallback((idx: number, el: HTMLButtonElement | null) => {
    if (el) thumbRefs.current.set(idx, el)
    else thumbRefs.current.delete(idx)
  }, [])

  // Build all page HTML arrays for rendering
  const allPages = useMemo(() => {
    const pages: string[] = []
    for (const html of standalonePages) {
      pages.push(html)
    }
    for (const pageHtml of contentPages) {
      pages.push(pageHtml.join(''))
    }
    return pages
  }, [standalonePages, contentPages])

  // Keep export data ref in sync for imperative handle
  exportDataRef.current = {
    allPages,
    coverTitle,
    totalPages,
    proposalTitle: proposalTitle || coverTitle || 'Proposal',
  }

  // Toggle contenteditable on elements when edit mode changes
  useEffect(() => {
    if (!contentRef.current) return
    const elements = contentRef.current.querySelectorAll('[data-section-id]')
    elements.forEach(el => {
      const type = el.getAttribute('data-type')
      if (isEditing) {
        if (type === 'tabulation') {
          el.querySelectorAll('td, th').forEach(cell => {
            cell.setAttribute('contenteditable', 'true')
          })
        } else {
          el.setAttribute('contenteditable', 'true')
        }
      } else {
        el.removeAttribute('contenteditable')
        if (type === 'tabulation') {
          el.querySelectorAll('td, th').forEach(cell => {
            cell.removeAttribute('contenteditable')
          })
        }
      }
    })
  }, [isEditing, allPages, renderKey])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleReset = () => {
    setRenderKey(k => k + 1)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!contentRef.current) return
    setIsSaving(true)
    try {
      const updated = extractEditedSections(contentRef.current, sections)

      // Find the cover page title (first non-numbered section) to update proposals table
      const coverSection = updated.find(s => !/^\d+\./.test(s.title))
      const proposalTitle = coverSection?.title || undefined

      const result = await updateProposalSections(proposalId, updated, proposalTitle)
      if (result.error) {
        console.error('Save failed:', result.error)
      }
      setIsEditing(false)
      window.location.reload()
    } finally {
      setIsSaving(false)
    }
  }

  if (sections.length === 0) {
    return (
      <div>
        <div className="pdf-browser">
          <div className="pdf-content">
            <div className="doc-page">
              <div className="doc-page-content">
                <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                  No sections yet. Proposal sections will appear here after generation completes.
                </p>
              </div>
            </div>
          </div>
        </div>
        <style jsx global>{viewerStyles}</style>
      </div>
    )
  }

  return (
    <div>
      {/* Editing mode banner */}
      {isEditing && (
        <div className="flex items-center gap-2 px-4 py-2.5 mb-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Pencil className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm font-medium text-amber-800">Editing Mode</span>
          <span className="text-sm text-amber-600">— Click on any text to edit. Save when done or Reset to discard changes.</span>
        </div>
      )}

      <div className="pdf-browser">
        {/* Hidden measuring container */}
        <div
          ref={measureRef}
          className="doc-page-content"
          style={{
            position: 'absolute',
            visibility: 'hidden',
            width: '650px',
            left: '-9999px',
          }}
          dangerouslySetInnerHTML={{ __html: contentItems.join('') }}
        />

        {/* Left sidebar — Thumbnail navigation */}
        <div className="pdf-sidebar" ref={sidebarRef}>
          {allPages.map((html, i) => (
            <button
              key={i}
              ref={(el) => setThumbRef(i, el)}
              className={`pdf-thumb${activePage === i ? ' pdf-thumb-active' : ''}`}
              onClick={() => scrollToPage(i)}
              aria-label={`Go to page ${i + 1}`}
            >
              <div className={`pdf-thumb-page${i === 0 ? ' doc-cover-thumb' : ''}`}>
                <div
                  className="doc-page-content pdf-thumb-content"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
              <span className="pdf-thumb-label">{i + 1}</span>
            </button>
          ))}
        </div>

        {/* Main content area */}
        <div className="pdf-content" ref={contentRef} key={renderKey}>
          {allPages.map((html, i) => {
            const isCover = i === 0
            return (
              <div
                key={i}
                ref={(el) => setPageRef(i, el)}
                data-page-idx={i}
                className={`doc-page${isCover ? ' doc-cover-page' : ''}`}
              >
                {!isCover && (
                  <div className="doc-page-header">
                    <span className="doc-page-header-title">{coverTitle}</span>
                  </div>
                )}
                <div
                  className="doc-page-content"
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: html }}
                />
                {!isCover && (
                  <div className="doc-page-footer">
                    <span className="doc-page-footer-title">{coverTitle}</span>
                    <span className="doc-page-footer-number">Page {i + 1} of {totalPages}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <style jsx global>{viewerStyles}</style>
      </div>
    </div>
  )
})

const viewerStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');

  /* ── PDF Browser Shell ── */
  .pdf-browser {
    display: flex;
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    overflow: hidden;
    height: 82vh;
    background: hsl(0 0% 92%);
    position: relative;
  }

  /* ── Sidebar ── */
  .pdf-sidebar {
    width: 120px;
    min-width: 120px;
    background: hsl(0 0% 96%);
    border-right: 1px solid hsl(var(--border));
    overflow-y: auto;
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .pdf-sidebar::-webkit-scrollbar { width: 4px; }
  .pdf-sidebar::-webkit-scrollbar-track { background: transparent; }
  .pdf-sidebar::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.2);
    border-radius: 2px;
  }

  /* ── Thumbnail ── */
  .pdf-thumb {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    width: 100%;
    flex-shrink: 0;
  }

  .pdf-thumb-page {
    width: 96px;
    height: 136px;
    background: white;
    border: 2px solid hsl(var(--border));
    border-radius: 2px;
    overflow: hidden;
    position: relative;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .pdf-thumb:hover .pdf-thumb-page {
    border-color: hsl(var(--muted-foreground) / 0.5);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  .pdf-thumb-active .pdf-thumb-page {
    border-color: #B8860B;
    box-shadow: 0 0 0 1px #B8860B;
  }

  .pdf-thumb-content {
    transform: scale(0.12);
    transform-origin: top left;
    width: 794px;
    min-height: 1123px;
    padding: 96px 72px 100px;
    pointer-events: none;
  }

  /* Cover page thumbnail accent */
  .doc-cover-thumb::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: #B8860B;
    z-index: 1;
  }

  .pdf-thumb-label {
    font-size: 0.65rem;
    color: hsl(var(--muted-foreground));
    font-variant-numeric: tabular-nums;
    line-height: 1;
    font-family: 'Inter', sans-serif;
  }

  .pdf-thumb-active .pdf-thumb-label {
    color: #B8860B;
    font-weight: 600;
  }

  /* ── Main Content Area ── */
  .pdf-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    background: hsl(0 0% 75%);
  }

  .pdf-content::-webkit-scrollbar { width: 8px; }
  .pdf-content::-webkit-scrollbar-track { background: transparent; }
  .pdf-content::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.25);
    border-radius: 4px;
  }
  .pdf-content::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground) / 0.4);
  }

  /* ── Paper Page (A4) ── */
  .doc-page {
    background: white;
    width: 100%;
    max-width: 794px;
    min-height: 1123px;
    padding: 96px 72px 100px;
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.08),
      0 4px 16px rgba(0, 0, 0, 0.06);
    border: 1px solid hsl(var(--border) / 0.5);
    border-radius: 0;
    position: relative;
    overflow-wrap: break-word;
    word-wrap: break-word;
    font-family: 'Inter', 'Open Sans', -apple-system, sans-serif;
  }

  /* ══════════════════════════════════════════
     COVER PAGE
     ══════════════════════════════════════════ */
  .doc-cover-page {
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
  }

  .doc-cover-page .doc-page-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 80px 72px 100px;
  }

  .cover-label {
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: #4A4A4A;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 2rem;
  }

  .cover-org {
    font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
    font-size: 1.75rem;
    font-weight: 700;
    color: #B8860B;
    margin-bottom: 1rem;
    line-height: 1.3;
  }

  .cover-project {
    font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: #222222;
    margin-bottom: 2rem;
    line-height: 1.35;
  }

  .cover-divider {
    width: 100%;
    height: 2px;
    background: #B8860B;
    margin-bottom: 2rem;
  }

  .cover-meta-line {
    font-family: 'Inter', sans-serif;
    font-size: 0.85rem;
    color: #4A4A4A;
    margin: 0.3rem 0;
    line-height: 1.6;
  }

  /* ══════════════════════════════════════════
     TABLE OF CONTENTS
     ══════════════════════════════════════════ */
  .toc-title {
    font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
    font-size: 1.45rem;
    font-weight: 700;
    color: #B8860B;
    margin: 0 0 0.75rem 0;
    padding-bottom: 0.5rem;
  }

  .toc-divider {
    width: 100%;
    height: 1px;
    background: #B8860B;
    margin-bottom: 1.5rem;
  }

  .toc-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .toc-item {
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    color: #222222;
    padding: 0.6rem 0;
    border-bottom: 1px solid #E0E0E0;
    line-height: 1.5;
  }

  .toc-item:last-child {
    border-bottom: none;
  }

  /* ══════════════════════════════════════════
     CONTENT PAGE HEADER
     ══════════════════════════════════════════ */
  .doc-page-header {
    position: absolute;
    top: 32px;
    left: 72px;
    right: 72px;
    padding-bottom: 10px;
    border-bottom: 0.5px solid #4A4A4A;
    pointer-events: none;
  }

  .doc-page-header-title {
    font-family: 'Inter', sans-serif;
    font-size: 0.6rem;
    font-weight: 600;
    color: #4A4A4A;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  /* ══════════════════════════════════════════
     CONTENT PAGE FOOTER
     ══════════════════════════════════════════ */
  .doc-page-footer {
    position: absolute;
    bottom: 32px;
    left: 72px;
    right: 72px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 10px;
    border-top: 0.5px solid #4A4A4A;
    pointer-events: none;
  }

  .doc-page-footer-title {
    font-family: 'Inter', sans-serif;
    font-size: 0.56rem;
    color: #4A4A4A;
    letter-spacing: 0.02em;
    max-width: 60%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .doc-page-footer-number {
    font-family: 'Inter', sans-serif;
    font-size: 0.56rem;
    color: #4A4A4A;
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
  }

  .doc-page-number { display: none; }

  /* ── Content ── */
  .doc-page-content {
    display: flex;
    flex-direction: column;
  }

  /* ══════════════════════════════════════════
     TYPOGRAPHY — Section Titles (H1)
     ══════════════════════════════════════════ */
  .doc-page-content h1 {
    font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: #B8860B;
    margin: 2rem 0 0.75rem 0;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid #B8860B;
    line-height: 1.3;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .doc-page-content h1:first-child {
    margin-top: 0;
  }

  /* Sub-section headers (H2) */
  .doc-page-content h2 {
    font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
    font-size: 1rem;
    font-weight: 700;
    margin: 1rem 0 0.2rem 0;
    color: #222222;
    line-height: 1.35;
  }

  /* Sub-sub-headers (H3) — used for bold sub-section names */
  .doc-page-content h3 {
    font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0.85rem 0 0.15rem 0;
    color: #222222;
    line-height: 1.4;
  }

  /* Body paragraphs */
  .doc-page-content p {
    font-family: 'Inter', 'Open Sans', sans-serif;
    font-size: 0.82rem;
    margin: 0.3rem 0;
    line-height: 1.6;
    color: #222222;
  }

  .doc-page-content strong {
    font-weight: 600;
    color: #222222;
  }

  /* ══════════════════════════════════════════
     BULLET LISTS
     ══════════════════════════════════════════ */
  .doc-page-content ul {
    list-style: none;
    padding: 0;
    margin: 0.3rem 0 0.3rem 0.25rem;
  }

  .doc-page-content ul li {
    font-family: 'Inter', 'Open Sans', sans-serif;
    font-size: 0.82rem;
    line-height: 1.6;
    color: #222222;
    padding-left: 1.25rem;
    position: relative;
    margin-bottom: 0.25rem;
  }

  .doc-page-content ul li::before {
    content: '•';
    position: absolute;
    left: 0;
    color: #B8860B;
    font-weight: 700;
    font-size: 0.9rem;
  }

  /* ══════════════════════════════════════════
     TABLES — No vertical borders, gold-tinted alternating rows
     ══════════════════════════════════════════ */
  .doc-page-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0 0.5rem 0;
    font-family: 'Inter', sans-serif;
    font-size: 0.78rem;
  }

  /* Standard data tables (3+ columns) */
  .doc-page-content table th {
    background-color: #F5F5F5;
    font-weight: 600;
    text-align: left;
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.04em;
    padding: 0.75rem 1rem;
    border: none;
    border-bottom: 1px solid #E0E0E0;
    color: #4A4A4A;
  }

  .doc-page-content table td {
    padding: 0.75rem 1rem;
    border: none;
    border-bottom: 1px solid #E0E0E0;
    color: #222222;
    vertical-align: top;
  }

  .doc-page-content table tbody tr:nth-child(even) td {
    background-color: #FFFDF0;
  }

  /* Key-value tables (2-column summary tables) */
  .doc-page-content .kv-table .kv-label {
    font-weight: 600;
    color: #4A4A4A;
    width: 35%;
    white-space: nowrap;
  }

  .doc-page-content .kv-table .kv-value {
    color: #222222;
  }

  /* Last row in tables — no bottom border */
  .doc-page-content table tbody tr:last-child td {
    border-bottom: none;
  }

  /* TOTAL row styling */
  .doc-page-content table tbody tr:last-child td {
    font-weight: 700;
    border-top: 2px solid #B8860B;
    border-bottom: none;
  }

  /* ══════════════════════════════════════════
     SIGNATURE BLOCK
     ══════════════════════════════════════════ */
  .signature-block {
    margin-top: 2rem;
    padding-top: 1rem;
  }

  .signature-block p {
    font-family: 'Inter', sans-serif;
    font-size: 0.82rem;
    color: #222222;
    margin: 0.15rem 0;
    line-height: 1.6;
  }

  .signature-block p:first-child {
    font-style: italic;
    margin-bottom: 1.5rem;
  }

  /* ══════════════════════════════════════════
     EDITABLE ELEMENTS
     ══════════════════════════════════════════ */
  .doc-page-content [contenteditable="true"] {
    outline: none;
    cursor: text;
    transition: background 0.15s ease, box-shadow 0.15s ease;
    border-radius: 2px;
  }

  .doc-page-content [contenteditable="true"]:hover:not(:focus) {
    background: #FFFDF0;
  }

  .doc-page-content [contenteditable="true"]:focus {
    background: hsl(45 100% 95%);
    box-shadow: inset 0 0 0 1px #B8860B;
  }
`
