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
          return `
            <div class="doc-page">
              <div class="doc-page-content">
                ${html}
              </div>
              <div class="doc-page-footer">
                <span>${coverTitle} | Page ${i + 1}</span>
              </div>
            </div>`
        })
        .join('')

      const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${proposalTitle || 'Proposal'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
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
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .doc-page {
      width: 210mm;
      min-height: 297mm;
      padding: 25mm 25mm 28mm;
      position: relative;
      background: white;
      page-break-after: always;
      overflow: hidden;
    }

    .doc-page:last-child {
      page-break-after: auto;
    }

    /* ── Cover Banner ── */
    .cover-banner {
      margin: -25mm -25mm 6mm -25mm;
      padding: 14mm 25mm 10mm;
      background: #1B3A5C;
      text-align: center;
      border-bottom: 1.5mm solid #C5960C;
    }

    .cover-label {
      font-family: 'Inter', sans-serif;
      font-size: 13pt;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }

    .cover-org {
      font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
      font-size: 22pt;
      font-weight: 700;
      color: #C5960C;
      margin-bottom: 4px;
      line-height: 1.3;
    }

    .cover-project {
      font-family: 'Inter', sans-serif;
      font-size: 11pt;
      font-weight: 400;
      color: #ffffff;
      line-height: 1.4;
    }

    .cover-meta {
      font-family: 'Inter', sans-serif;
      font-size: 9pt;
      color: #555555;
      margin: 2px 0;
      line-height: 1.5;
      text-align: right;
      font-style: italic;
    }

    /* ── Page footer ── */
    .doc-page-footer {
      position: absolute;
      bottom: 8mm;
      left: 25mm;
      right: 25mm;
      text-align: center;
      padding-top: 2.5mm;
      border-top: 0.5px solid #CCCCCC;
    }

    .doc-page-footer span {
      font-family: 'Inter', sans-serif;
      font-size: 7pt;
      color: #555555;
      letter-spacing: 0.02em;
    }

    /* ── Content typography ── */
    .doc-page-content {
      display: flex;
      flex-direction: column;
    }

    .doc-page-content h1 {
      font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
      font-size: 14pt;
      font-weight: 700;
      color: #1B3A5C;
      margin: 20px 0 8px 0;
      padding-bottom: 4px;
      border-bottom: 2px solid #C5960C;
      line-height: 1.3;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .doc-page-content h1:first-child {
      margin-top: 0;
    }

    .doc-page-content h2 {
      font-family: 'Playfair Display', serif;
      font-size: 13pt;
      font-weight: 700;
      margin: 16px 0 4px 0;
      padding-bottom: 3px;
      border-bottom: 2px solid #C5960C;
      color: #1B3A5C;
      line-height: 1.35;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .doc-page-content h3 {
      font-family: 'Inter', sans-serif;
      font-size: 11pt;
      font-weight: 700;
      font-style: italic;
      margin: 10px 0 2px 0;
      color: #1a1a1a;
      line-height: 1.4;
    }

    .doc-page-content p {
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 10pt;
      margin: 3px 0;
      line-height: 1.75;
      color: #1a1a1a;
      text-align: justify;
    }

    .doc-page-content strong {
      font-weight: 600;
    }

    /* ── Bullet lists ── */
    .doc-page-content ul {
      list-style: none;
      padding: 0;
      margin: 5px 0 5px 3px;
    }

    .doc-page-content ul li {
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      line-height: 1.75;
      color: #1a1a1a;
      padding-left: 18px;
      position: relative;
      margin-bottom: 4px;
    }

    .doc-page-content ul li::before {
      content: '\\2022';
      position: absolute;
      left: 3px;
      color: #1a1a1a;
      font-weight: 700;
      font-size: 11pt;
    }

    /* ── Bullet items (individual <p> elements) ── */
    .doc-page-content p.bullet-item {
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      line-height: 1.75;
      color: #1a1a1a;
      padding-left: 18px;
      position: relative;
      margin: 0 0 4px 3px;
      text-align: left;
    }

    .doc-page-content p.bullet-item::before {
      content: '\\2022';
      position: absolute;
      left: 3px;
      color: #1a1a1a;
      font-weight: 700;
      font-size: 11pt;
    }

    /* ── Tables ── */
    .doc-page-content table {
      border-collapse: collapse;
      width: 100%;
      margin: 6px 0;
      font-family: 'Inter', sans-serif;
      font-size: 9pt;
      border: 1px solid #CCCCCC;
    }

    .doc-page-content table th {
      background-color: #1B3A5C;
      font-weight: 600;
      text-align: left;
      text-transform: uppercase;
      font-size: 8pt;
      letter-spacing: 0.04em;
      padding: 8px 12px;
      border: 1px solid #1B3A5C;
      border-bottom: 2px solid #C5960C;
      color: #ffffff;
    }

    .doc-page-content table td {
      padding: 8px 12px;
      border: 1px solid #E0E0E0;
      color: #1a1a1a;
      vertical-align: top;
    }

    .doc-page-content .kv-table {
      border-top: 3px solid #C5960C;
    }

    .doc-page-content .kv-table .kv-label {
      font-weight: 600;
      color: #ffffff;
      background-color: #1B3A5C;
      width: 30%;
      white-space: nowrap;
      border: 1px solid #1B3A5C;
    }

    .doc-page-content .kv-table .kv-value {
      color: #1a1a1a;
      background-color: #ffffff;
    }

    .doc-page-content table tbody tr:last-child td {
      border-bottom: 1px solid #CCCCCC;
    }

    /* ── Signature block ── */
    .signature-block {
      margin-top: 24px;
      padding-top: 12px;
    }

    .signature-block p {
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      color: #1a1a1a;
      margin: 2px 0;
      line-height: 1.75;
    }

    .signature-block p:first-child {
      font-style: italic;
      margin-bottom: 18px;
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
