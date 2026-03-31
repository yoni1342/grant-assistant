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
      font-family: 'Inter', 'Open Sans', -apple-system, sans-serif;
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

    /* ── Cover page ── */
    .doc-cover-page {
      padding: 0;
      display: flex;
      flex-direction: column;
    }

    .cover-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 25mm;
    }

    .cover-label {
      font-family: 'Inter', sans-serif;
      font-size: 14pt;
      font-weight: 600;
      color: #4A4A4A;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 24px;
    }

    .cover-org {
      font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
      font-size: 24pt;
      font-weight: 700;
      color: #B8860B;
      margin-bottom: 16px;
      line-height: 1.3;
    }

    .cover-project {
      font-family: 'Playfair Display', 'Times New Roman', Georgia, serif;
      font-size: 18pt;
      font-weight: 700;
      color: #222222;
      margin-bottom: 24px;
      line-height: 1.35;
    }

    .cover-divider {
      width: 100%;
      height: 2px;
      background: #B8860B;
      margin-bottom: 24px;
    }

    .cover-meta-line {
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      color: #4A4A4A;
      margin: 3px 0;
      line-height: 1.6;
    }

    /* ── TOC ── */
    .toc-title {
      font-family: 'Playfair Display', serif;
      font-size: 16pt;
      font-weight: 700;
      color: #B8860B;
      margin: 0 0 8px 0;
      padding-bottom: 6px;
      border-bottom: none;
    }

    .toc-divider {
      width: 100%;
      height: 1px;
      background: #B8860B;
      margin-bottom: 18px;
    }

    .toc-item {
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      color: #222222;
      padding: 7px 0;
      border-bottom: 1px solid #E0E0E0;
      line-height: 1.5;
    }

    .toc-item:last-child { border-bottom: none; }

    /* ── Page header ── */
    .doc-page-header {
      position: absolute;
      top: 8mm;
      left: 25mm;
      right: 25mm;
      padding-bottom: 2.5mm;
      border-bottom: 0.5px solid #4A4A4A;
    }

    .doc-page-header span {
      font-family: 'Inter', sans-serif;
      font-size: 7pt;
      font-weight: 600;
      color: #4A4A4A;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    /* ── Page footer ── */
    .doc-page-footer {
      position: absolute;
      bottom: 8mm;
      left: 25mm;
      right: 25mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 2.5mm;
      border-top: 0.5px solid #4A4A4A;
    }

    .footer-title {
      font-family: 'Inter', sans-serif;
      font-size: 9pt;
      color: #4A4A4A;
      letter-spacing: 0.02em;
      max-width: 60%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .footer-number {
      font-family: 'Inter', sans-serif;
      font-size: 9pt;
      color: #4A4A4A;
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
      color: #B8860B;
      margin: 20px 0 12px 0;
      padding-bottom: 4px;
      border-bottom: 1px solid #B8860B;
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
      margin: 12px 0 3px 0;
      color: #222222;
      line-height: 1.35;
    }

    .doc-page-content h3 {
      font-family: 'Playfair Display', serif;
      font-size: 11pt;
      font-weight: 600;
      margin: 10px 0 2px 0;
      color: #222222;
      line-height: 1.4;
    }

    .doc-page-content p {
      font-family: 'Inter', 'Open Sans', sans-serif;
      font-size: 10pt;
      margin: 3px 0;
      line-height: 1.6;
      color: #222222;
    }

    .doc-page-content strong {
      font-weight: 600;
    }

    /* ── Bullet lists ── */
    .doc-page-content ul {
      list-style: none;
      padding: 0;
      margin: 4px 0 4px 3px;
    }

    .doc-page-content ul li {
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      line-height: 1.6;
      color: #222222;
      padding-left: 16px;
      position: relative;
      margin-bottom: 3px;
    }

    .doc-page-content ul li::before {
      content: '•';
      position: absolute;
      left: 0;
      color: #B8860B;
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
    }

    .doc-page-content table th {
      background-color: #F5F5F5;
      font-weight: 600;
      text-align: left;
      text-transform: uppercase;
      font-size: 8pt;
      letter-spacing: 0.04em;
      padding: 12px 16px;
      border: none;
      border-bottom: 1px solid #E0E0E0;
      color: #4A4A4A;
    }

    .doc-page-content table td {
      padding: 12px 16px;
      border: none;
      border-bottom: 1px solid #E0E0E0;
      color: #222222;
      vertical-align: top;
    }

    .doc-page-content table tbody tr:nth-child(even) td {
      background-color: #FFFDF0;
    }

    .doc-page-content .kv-table .kv-label {
      font-weight: 600;
      color: #4A4A4A;
      width: 35%;
      white-space: nowrap;
    }

    .doc-page-content .kv-table .kv-value {
      color: #222222;
    }

    .doc-page-content table tbody tr:last-child td {
      font-weight: 700;
      border-top: 2px solid #B8860B;
      border-bottom: none;
    }

    /* ── Signature block ── */
    .signature-block {
      margin-top: 24px;
      padding-top: 12px;
    }

    .signature-block p {
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      color: #222222;
      margin: 2px 0;
      line-height: 1.6;
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
