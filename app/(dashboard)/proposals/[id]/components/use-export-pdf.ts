'use client'

import { useState, useCallback } from 'react'

interface ExportPdfOptions {
  allPages: string[]
  coverTitle: string
  totalPages: number
  proposalTitle: string
}

export function useExportPdf() {
  const [isExporting, setIsExporting] = useState(false)

  const exportPdf = useCallback(async (options: ExportPdfOptions) => {
    const { allPages, coverTitle, totalPages, proposalTitle } = options
    if (allPages.length === 0) return

    setIsExporting(true)

    try {
      // Build the full HTML document for printing
      const pagesHtml = allPages
        .map((html, i) => {
          const isCover = i === 0
          if (isCover) {
            return `
              <div class="doc-page doc-cover-page">
                <div class="accent-bar"></div>
                <div class="doc-page-content cover-content">
                  ${html}
                </div>
              </div>`
          }
          return `
            <div class="doc-page">
              <div class="doc-page-header">
                <span>${coverTitle}</span>
              </div>
              <div class="doc-page-content">
                ${html}
              </div>
              <div class="doc-page-footer">
                <span class="footer-title">${coverTitle}</span>
                <span class="footer-number">Page ${i + 1} of ${totalPages}</span>
              </div>
            </div>`
        })
        .join('')

      const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${proposalTitle || 'Proposal'}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .doc-page {
      width: 210mm;
      min-height: 297mm;
      padding: 25mm 18mm 28mm;
      position: relative;
      background: white;
      page-break-after: always;
      overflow: hidden;
    }

    .doc-page:last-child {
      page-break-after: auto;
    }

    /* Cover page */
    .doc-cover-page {
      padding: 0;
      display: flex;
      flex-direction: column;
    }

    .accent-bar {
      width: 100%;
      height: 8px;
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 50%, #1e3a5f 100%);
      flex-shrink: 0;
    }

    .cover-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 20mm 18mm 28mm;
    }

    .cover-content h1 {
      font-size: 24pt;
      font-weight: 800;
      color: #1a2b42;
      margin: 0 0 1.5rem 0;
      line-height: 1.25;
      letter-spacing: -0.02em;
      border-bottom: none;
      padding-bottom: 0;
    }

    .cover-content p {
      font-size: 11pt;
      color: #5a6a7a;
      margin: 0.35rem 0;
      line-height: 1.7;
    }

    .cover-content h2 {
      font-size: 14pt;
      font-weight: 600;
      color: #2d5a8e;
      margin: 1rem 0 0.3rem 0;
    }

    .cover-content h3 {
      font-size: 12pt;
      font-weight: 500;
      color: #5a6a7a;
    }

    /* Page header */
    .doc-page-header {
      position: absolute;
      top: 8mm;
      left: 18mm;
      right: 18mm;
      padding-bottom: 2.5mm;
      border-bottom: 1px solid #e0e4e8;
    }

    .doc-page-header span {
      font-size: 7pt;
      font-weight: 600;
      color: #8a95a5;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    /* Page footer */
    .doc-page-footer {
      position: absolute;
      bottom: 8mm;
      left: 18mm;
      right: 18mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 2.5mm;
      border-top: 1px solid #e0e4e8;
    }

    .footer-title {
      font-size: 6.5pt;
      color: #a0a8b4;
      letter-spacing: 0.02em;
      max-width: 60%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .footer-number {
      font-size: 6.5pt;
      color: #a0a8b4;
      letter-spacing: 0.02em;
    }

    /* Content typography */
    .doc-page-content {
      display: flex;
      flex-direction: column;
    }

    .doc-page-content h1 {
      font-size: 16pt;
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
      font-size: 13pt;
      font-weight: 700;
      margin: 1rem 0 0.2rem 0;
      color: #1a2b42;
      line-height: 1.35;
    }

    .doc-page-content h3 {
      font-size: 11pt;
      font-weight: 600;
      margin: 0.6rem 0 0.1rem 0;
      color: #4a5568;
      line-height: 1.4;
    }

    .doc-page-content p {
      font-size: 10pt;
      margin: 0.25rem 0;
      line-height: 1.85;
      color: #1a1a1a;
    }

    /* Tables */
    .doc-page-content table {
      border-collapse: collapse;
      width: 100%;
      margin: 0.5rem 0 0.3rem 0;
      font-size: 9pt;
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
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`

      // Open a new window and trigger print (Save as PDF)
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('Pop-up blocked. Please allow pop-ups for this site.')
      }

      printWindow.document.write(printHtml)
      printWindow.document.close()

      // Wait for content to render, then print
      printWindow.onload = () => {
        printWindow.focus()
        printWindow.print()
      }

      // Fallback if onload doesn't fire (already loaded)
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
      }, 500)
    } catch (error) {
      console.error('PDF export failed:', error)
      throw error
    } finally {
      setIsExporting(false)
    }
  }, [])

  return { exportPdf, isExporting }
}
