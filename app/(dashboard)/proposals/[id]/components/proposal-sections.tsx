'use client'

import { useMemo, useState, useLayoutEffect, useRef, useCallback, useEffect } from 'react'

interface ChapterItem {
  chapter: string
  sort_order: number
}

interface Section {
  id: string
  title: string
  created_at: string
  content: ChapterItem[] | null
  header1: ChapterItem[] | null
  header2: ChapterItem[] | null
  tabulation: ChapterItem[] | null
}

interface ProposalSectionsProps {
  sections: Section[]
}

// A4 page content area: 1123px total − 96px top pad − 100px bottom pad
const PAGE_CONTENT_HEIGHT = 927

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

  return tagged
    .map((item) => {
      switch (item.type) {
        case 'header1': return `<h2>${item.chapter}</h2>`
        case 'header2': return `<h3>${item.chapter}</h3>`
        case 'content': return `<p>${item.chapter}</p>`
        case 'tabulation': return parseTabulation(item.chapter)
        default: return `<p>${item.chapter}</p>`
      }
    })
    .join('')
}

export function ProposalSections({ sections }: ProposalSectionsProps) {
  const measureRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const thumbRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const [contentPages, setContentPages] = useState<string[][]>([])
  const [activePage, setActivePage] = useState(0)

  const { standalonePages, contentItems } = useMemo(() => {
    if (sections.length === 0) return { standalonePages: [] as string[], contentItems: [] as string[] }

    const sorted = [...sections].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const standalonePages: string[] = []
    const contentSections: Section[] = []

    for (const section of sorted) {
      if (/^\d+\./.test(section.title)) {
        contentSections.push(section)
      } else {
        standalonePages.push(`<h1>${section.title}</h1>` + buildSectionHtml(section))
      }
    }

    const contentItems: string[] = []
    for (const section of contentSections) {
      contentItems.push(`<h1>${section.title}</h1>`)

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
        switch (item.type) {
          case 'header1': contentItems.push(`<h2>${item.chapter}</h2>`); break
          case 'header2': contentItems.push(`<h3>${item.chapter}</h3>`); break
          case 'content': contentItems.push(`<p>${item.chapter}</p>`); break
          case 'tabulation': contentItems.push(parseTabulation(item.chapter)); break
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

      if (currentHeight + totalHeight > PAGE_CONTENT_HEIGHT && currentPage.length > 0) {
        pages.push(currentPage)
        currentPage = []
        currentHeight = 0
      }

      currentPage.push(contentItems[i])
      currentHeight += totalHeight
    }

    if (currentPage.length > 0) {
      pages.push(currentPage)
    }

    setContentPages(pages)
  }, [contentItems])

  const totalPages = standalonePages.length + contentPages.length

  // Track which page is in view using IntersectionObserver
  useEffect(() => {
    if (totalPages === 0 || !contentRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry with the highest intersection ratio
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
  }, [totalPages, contentPages.length])

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

  if (sections.length === 0) {
    return (
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
        <style jsx global>{viewerStyles}</style>
      </div>
    )
  }

  return (
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
            <div className="pdf-thumb-page">
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
      <div className="pdf-content" ref={contentRef}>
        {allPages.map((html, i) => (
          <div
            key={i}
            ref={(el) => setPageRef(i, el)}
            data-page-idx={i}
            className="doc-page"
          >
            <div className="doc-page-number">
              Page {i + 1} of {totalPages}
            </div>
            <div
              className="doc-page-content"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        ))}
      </div>

      <style jsx global>{viewerStyles}</style>
    </div>
  )
}

const viewerStyles = `
  /* ── PDF Browser Shell ── */
  .pdf-browser {
    display: flex;
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    overflow: hidden;
    height: 82vh;
    background: hsl(0 0% 92%);
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
    border-color: hsl(0 72% 51%);
    box-shadow: 0 0 0 1px hsl(0 72% 51%);
  }

  .pdf-thumb-content {
    transform: scale(0.12);
    transform-origin: top left;
    width: 794px;
    min-height: 1123px;
    padding: 96px 72px 100px;
    pointer-events: none;
  }

  .pdf-thumb-label {
    font-size: 0.65rem;
    color: hsl(var(--muted-foreground));
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .pdf-thumb-active .pdf-thumb-label {
    color: hsl(0 72% 51%);
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
  }

  /* Page number */
  .doc-page-number {
    position: absolute;
    bottom: 24px;
    right: 28px;
    font-size: 0.7rem;
    color: hsl(var(--muted-foreground) / 0.5);
    letter-spacing: 0.02em;
    pointer-events: none;
  }

  /* ── Content ── */
  .doc-page-content {
    display: flex;
    flex-direction: column;
  }

  /* ── Typography ── */
  .doc-page-content h1 {
    font-size: 1.45rem;
    font-weight: 700;
    margin: 1.5rem 0 0.5rem 0;
    color: hsl(var(--foreground));
    border-bottom: 2px solid hsl(var(--primary) / 0.15);
    padding-bottom: 0.4rem;
    line-height: 1.3;
  }
  .doc-page-content h1:first-child {
    margin-top: 0;
  }

  .doc-page-content h2 {
    font-size: 1.15rem;
    font-weight: 700;
    margin: 1rem 0 0.2rem 0;
    color: hsl(var(--foreground));
    line-height: 1.35;
  }

  .doc-page-content h3 {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0.6rem 0 0.1rem 0;
    color: hsl(var(--muted-foreground));
    line-height: 1.4;
  }

  .doc-page-content p {
    font-size: 0.875rem;
    margin: 0.25rem 0;
    line-height: 1.85;
    color: hsl(var(--foreground));
  }

  /* ── Tables ── */
  .doc-page-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0 0.3rem 0;
    font-size: 0.8rem;
  }

  .doc-page-content table th {
    background-color: hsl(var(--muted));
    font-weight: 600;
    text-align: left;
    padding: 0.5rem 0.75rem;
    border: 1px solid hsl(var(--border));
    color: hsl(var(--foreground));
  }

  .doc-page-content table td {
    padding: 0.45rem 0.75rem;
    border: 1px solid hsl(var(--border));
    color: hsl(var(--foreground));
  }

  .doc-page-content table tr:nth-child(even) td {
    background-color: hsl(var(--muted) / 0.25);
  }
`
