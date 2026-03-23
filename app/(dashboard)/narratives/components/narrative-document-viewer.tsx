'use client'

import { useMemo, useState, useLayoutEffect, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useExportPdf } from '@/app/(dashboard)/proposals/[id]/components/use-export-pdf'

export interface NarrativeDocumentViewerHandle {
  exportPdf: () => Promise<void>
}

interface NarrativeDocumentViewerProps {
  title: string
  content: string
  category?: string | null
}

const PAGE_CONTENT_HEIGHT = 927

function formatInlineMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

export const NarrativeDocumentViewer = forwardRef<NarrativeDocumentViewerHandle, NarrativeDocumentViewerProps>(function NarrativeDocumentViewer({ title, content, category }, ref) {
  const measureRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const thumbRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const [contentPages, setContentPages] = useState<string[][]>([])
  const [activePage, setActivePage] = useState(0)

  // Build cover page HTML
  const coverHtml = useMemo(() => {
    const categoryLabel = category
      ? `<p>${category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>`
      : ''
    return `<h1>Organization Narrative</h1><p>${title}</p>${categoryLabel}`
  }, [title, category])

  // Parse content into individual elements for pagination
  const contentItems = useMemo(() => {
    if (!content) return []

    // If content is HTML, parse it into individual block elements
    const tmp = document.createElement('div')
    tmp.innerHTML = content

    const items: string[] = []

    // Walk through child nodes
    const walk = (node: Node) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement
          const tag = el.tagName.toLowerCase()

          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'ul', 'ol', 'table', 'blockquote', 'pre'].includes(tag)) {
            items.push(el.outerHTML)
          } else if (tag === 'br') {
            // skip standalone br
          } else {
            items.push(el.outerHTML)
          }
        } else if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent?.trim()
          if (text) {
            items.push(`<p>${formatInlineMarkdown(text)}</p>`)
          }
        }
      }
    }

    walk(tmp)

    // If no block elements were found, treat the whole content as paragraphs
    if (items.length === 0 && content.trim()) {
      const paragraphs = content.split(/\n\n+/).filter(p => p.trim())
      for (const p of paragraphs) {
        const lines = p.split(/\n/).filter(l => l.trim())
        for (const line of lines) {
          items.push(`<p>${formatInlineMarkdown(line)}</p>`)
        }
      }
    }

    return items
  }, [content])

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

      currentPage.push(contentItems[i])
      currentHeight += totalHeight

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

  // Build all page HTML arrays
  const allPages = useMemo(() => {
    const pages: string[] = [coverHtml]
    for (const pageHtml of contentPages) {
      pages.push(pageHtml.join(''))
    }
    return pages
  }, [coverHtml, contentPages])

  const totalPages = allPages.length

  // PDF export
  const { exportPdf } = useExportPdf()

  useImperativeHandle(ref, () => ({
    exportPdf: async () => {
      await exportPdf({
        allPages,
        coverTitle: 'Organization Narrative',
        totalPages,
        proposalTitle: title,
      })
    },
  }), [exportPdf, allPages, totalPages, title])

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

  // Scroll the active thumbnail into view
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

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Select a narrative to view its content.</p>
      </div>
    )
  }

  return (
    <div>
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
        <div className="pdf-content" ref={contentRef}>
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
                    <span className="doc-page-header-title">{title}</span>
                  </div>
                )}
                <div
                  className="doc-page-content"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
                {!isCover && (
                  <div className="doc-page-footer">
                    <span className="doc-page-footer-title">{title}</span>
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

  .doc-cover-thumb::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 50%, #1e3a5f 100%);
    z-index: 1;
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

  /* ══════════════════════════════════════════
     COVER PAGE
     ══════════════════════════════════════════ */
  .doc-cover-page {
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
  }

  .doc-cover-page::before {
    content: '';
    display: block;
    width: 100%;
    height: 8px;
    background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 50%, #1e3a5f 100%);
    flex-shrink: 0;
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

  .doc-cover-page .doc-page-content h1 {
    font-size: 1.15rem;
    font-weight: 600;
    color: #5a6a7a;
    border-bottom: none;
    padding-bottom: 0;
    margin: 0 0 0.4rem 0;
    line-height: 1.3;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .doc-cover-page .doc-page-content h1::after {
    display: none;
  }

  .doc-cover-page .doc-page-content p:first-of-type {
    font-size: 2rem;
    font-weight: 800;
    color: #1a2b42;
    margin: 0 0 1.5rem 0;
    line-height: 1.25;
    letter-spacing: -0.02em;
  }

  .doc-cover-page .doc-page-content p:first-of-type::after {
    content: '';
    display: block;
    width: 80px;
    height: 3px;
    background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%);
    margin: 1.25rem auto 0;
    border-radius: 2px;
  }

  .doc-cover-page .doc-page-content p {
    font-size: 0.95rem;
    color: #5a6a7a;
    margin: 0.35rem 0;
    line-height: 1.7;
    letter-spacing: 0.01em;
  }

  .doc-cover-page .doc-page-content h2 {
    font-size: 1.2rem;
    font-weight: 600;
    color: #2d5a8e;
    margin: 1rem 0 0.3rem 0;
    text-align: center;
  }

  .doc-cover-page .doc-page-content h3 {
    font-size: 1rem;
    font-weight: 500;
    color: #5a6a7a;
    text-align: center;
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
    border-bottom: 1px solid #e0e4e8;
    pointer-events: none;
  }

  .doc-page-header-title {
    font-size: 0.7rem;
    font-weight: 600;
    color: #8a95a5;
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
    border-top: 1px solid #e0e4e8;
    pointer-events: none;
  }

  .doc-page-footer-title {
    font-size: 0.65rem;
    color: #a0a8b4;
    letter-spacing: 0.02em;
    max-width: 60%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .doc-page-footer-number {
    font-size: 0.65rem;
    color: #a0a8b4;
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
  }

  .doc-page-number {
    display: none;
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
    color: #1a2b42;
    border-bottom: 2px solid #e0e4e8;
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
    color: #1a2b42;
    line-height: 1.35;
  }

  .doc-page-content h3 {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0.6rem 0 0.1rem 0;
    color: #4a5568;
    line-height: 1.4;
  }

  .doc-page-content p {
    font-size: 0.875rem;
    margin: 0.25rem 0;
    line-height: 1.85;
    color: #1a1a1a;
  }

  /* ── Tables ── */
  .doc-page-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0 0.3rem 0;
    font-size: 0.8rem;
  }

  .doc-page-content table th {
    background-color: #f0f3f7;
    font-weight: 600;
    text-align: left;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d8dde4;
    color: #1a2b42;
  }

  .doc-page-content table td {
    padding: 0.45rem 0.75rem;
    border: 1px solid #d8dde4;
    color: #1a1a1a;
  }

  .doc-page-content table tr:nth-child(even) td {
    background-color: #f8f9fb;
  }

  /* ── Lists ── */
  .doc-page-content ul,
  .doc-page-content ol {
    font-size: 0.875rem;
    margin: 0.25rem 0;
    padding-left: 1.5rem;
    line-height: 1.85;
    color: #1a1a1a;
  }

  .doc-page-content li {
    margin: 0.15rem 0;
  }
`
