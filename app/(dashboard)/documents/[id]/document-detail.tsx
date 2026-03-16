"use client"

import { useState, useTransition, useMemo, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileImage,
  File as FileIcon,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Document, formatFileSize, getFileTypeLabel } from "../components/columns"
import { deleteDocument, getDownloadUrl, updateDocumentCategory } from "../actions"
import { DOCUMENT_CATEGORIES, CATEGORY_LABELS } from "../constants"

interface DocumentDetailProps {
  document: Document
  signedUrl: string | null
  linkedGrant: { id: string; title: string } | null
}

function getFileTypeIcon(mimeType: string | null) {
  if (!mimeType) return <FileIcon className="h-5 w-5 text-muted-foreground" />
  if (mimeType === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return <FileIcon className="h-5 w-5 text-blue-500" />
  if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return <FileSpreadsheet className="h-5 w-5 text-green-500" />
  if (mimeType?.startsWith("image/")) return <FileImage className="h-5 w-5 text-purple-500" />
  return <FileIcon className="h-5 w-5 text-muted-foreground" />
}

function DocumentViewer({ document, signedUrl }: { document: Document; signedUrl: string | null }) {
  if (!signedUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <FileIcon className="h-16 w-16" />
        <p>Unable to preview this document</p>
      </div>
    )
  }

  const fileType = document.file_type

  // PDF — use browser's built-in viewer
  if (fileType === "application/pdf") {
    return (
      <iframe
        src={signedUrl}
        className="w-full h-full rounded-lg border"
        title={document.name || undefined}
      />
    )
  }

  // Images
  if (fileType?.startsWith("image/")) {
    return (
      <div className="flex items-center justify-center h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signedUrl}
          alt={document.name || ""}
          className="max-w-full max-h-full object-contain rounded-lg border"
        />
      </div>
    )
  }

  // Other file types — show extracted text if available, otherwise download prompt
  if (document.extracted_text) {
    return <ExtractedTextViewer document={document} signedUrl={signedUrl} />
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
      {getFileTypeIcon(fileType)}
      <div className="text-center">
        <p className="font-medium text-foreground">{document.name}</p>
        <p className="text-sm mt-1">Preview not available for {getFileTypeLabel(fileType)} files</p>
      </div>
      <Button asChild variant="outline">
        <a href={signedUrl} target="_blank" rel="noopener noreferrer">
          <Download className="mr-2 h-4 w-4" />
          Download to view
        </a>
      </Button>
    </div>
  )
}

// Build HTML from extracted text — handles both structured (tabs/newlines) and flat text
function buildExtractedHtmlForDoc(text: string): string {
  if (text.includes('\t') || text.includes('\n')) {
    // Structured text with tabs/newlines
    const lines = text.split('\n');
    const htmlParts: string[] = [];
    let inTable = false;
    let tableHtml = '';
    let isFirstTableRow = true;

    function flushTable() {
      if (tableHtml) {
        htmlParts.push(`<table>${tableHtml}</table>`);
        tableHtml = '';
      }
      inTable = false;
      isFirstTableRow = true;
    }

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) { if (inTable) flushTable(); continue; }

      const hasTabs = trimmed.includes('\t');
      const cells = hasTabs ? trimmed.split('\t').map(c => c.trim()).filter(c => c) : null;

      if (cells && cells.length >= 2) {
        if (!inTable) { inTable = true; isFirstTableRow = true; }
        const hasValues = /\$[\d,]|\d+%/.test(trimmed);
        if (isFirstTableRow && !hasValues) {
          const ths = cells.map(c => `<th>${c}</th>`).join('');
          tableHtml += `<thead><tr>${ths}</tr></thead><tbody>`;
          isFirstTableRow = false;
          continue;
        }
        isFirstTableRow = false;
        const tds = cells.map(c => `<td>${c}</td>`).join('');
        tableHtml += `<tr>${tds}</tr>`;
        continue;
      }

      if (inTable) flushTable();

      const isHeader = /^[A-Z][A-Za-z\s&/()—–,.-]+$/.test(trimmed) && trimmed.length < 80 && !/\$[\d,]|\d+%/.test(trimmed);
      if (isHeader) {
        htmlParts.push(`<h2>${trimmed}</h2>`);
      } else {
        htmlParts.push(`<p>${trimmed}</p>`);
      }
    }
    if (inTable) flushTable();
    return htmlParts.join('\n').replace(/<tbody>([^]*?)<\/table>/g, '<tbody>$1</tbody></table>');
  }

  // Flat text — detect $amounts and %values to build tables
  const htmlParts: string[] = [];
  const titleMatch = text.match(/^(.*?)(?=Budget Overview|Personnel|Clinical Supplies|Mobile Clinic|Revenue Sources)/);
  const titleText = titleMatch ? titleMatch[1].trim() : '';

  if (titleText) {
    const dashMatch = titleText.match(/^(.+?)\s+—\s+(.+?)(?:\s+(FY\S+))?$/);
    if (dashMatch) {
      htmlParts.push(`<h1>${dashMatch[1].trim()}</h1>`);
      htmlParts.push(`<h2>${dashMatch[2].trim()}</h2>`);
      if (dashMatch[3]) htmlParts.push(`<p>${dashMatch[3]}</p>`);
    } else {
      htmlParts.push(`<h1>${titleText}</h1>`);
    }
  }

  const bodyText = titleText ? text.slice(titleText.length).trim() : text;

  const rowPattern = /([A-Za-z][A-Za-z&;/() ,.\u2014\u2013-]+?)\s+\$([\d,]+(?:\.\d+)?)/g;
  const pctRowPattern = /([A-Za-z][A-Za-z&;/() ,.\u2014\u2013-]+?)\s+\$([\d,]+(?:\.\d+)?)\s+(\d+(?:\.\d+)?%)/g;

  interface RowMatch { label: string; values: string[]; start: number; end: number }
  const rows: RowMatch[] = [];

  let m: RegExpExecArray | null;
  const usedRanges: Array<[number, number]> = [];
  const pctRegex = new RegExp(pctRowPattern.source, 'g');
  while ((m = pctRegex.exec(bodyText)) !== null) {
    rows.push({ label: m[1].trim(), values: ['$' + m[2], m[3]], start: m.index, end: m.index + m[0].length });
    usedRanges.push([m.index, m.index + m[0].length]);
  }

  const dollarRegex = new RegExp(rowPattern.source, 'g');
  while ((m = dollarRegex.exec(bodyText)) !== null) {
    const overlaps = usedRanges.some(([s, e]) => m!.index >= s && m!.index < e);
    if (!overlaps) {
      rows.push({ label: m[1].trim(), values: ['$' + m[2]], start: m.index, end: m.index + m[0].length });
    }
  }

  rows.sort((a, b) => a.start - b.start);

  let lastEnd = 0;
  let currentTableColCount = 0;
  let tableHtml = '';

  function flushTable() {
    if (tableHtml) {
      htmlParts.push(`<table><tbody>${tableHtml}</tbody></table>`);
      tableHtml = '';
      currentTableColCount = 0;
    }
  }

  for (const row of rows) {
    const between = bodyText.substring(lastEnd, row.start).trim();
    if (between) {
      const colCount = row.values.length + 1;
      const words = between.split(/\s+/);
      const headerKeywords = ['Category', 'Annual', 'Budget', 'Position', 'Type', 'Cost', 'Item', 'Source', 'Amount'];
      let wi = words.length - 1;
      const tempHeaders: string[] = [];
      let headerColsFound = 0;
      while (wi >= 0 && headerColsFound < colCount) {
        const w = words[wi];
        if (headerKeywords.includes(w) || /^[A-Z][a-z]+$/.test(w) || w === '%' || w === 'of') {
          tempHeaders.unshift(w); wi--;
        } else { break; }
      }

      if (tempHeaders.length > 0) {
        const sectionName = words.slice(0, wi + 1).join(' ');
        if (sectionName) {
          flushTable();
          htmlParts.push(`<h2>${sectionName.replace(/&amp;/g, '&')}</h2>`);
        }
        const headerText = tempHeaders.join(' ');
        if (colCount === 2) {
          const midIdx = Math.ceil(tempHeaders.length / 2);
          tableHtml += `<thead><tr><th>${tempHeaders.slice(0, midIdx).join(' ')}</th><th>${tempHeaders.slice(midIdx).join(' ')}</th></tr></thead>`;
        } else if (colCount === 3) {
          if (headerText.includes('Type')) {
            tableHtml += `<thead><tr><th>Position</th><th>Type</th><th>Annual Cost</th></tr></thead>`;
          } else if (headerText.includes('Amount')) {
            tableHtml += `<thead><tr><th>Source</th><th>Amount</th><th>% of Budget</th></tr></thead>`;
          } else {
            const perCol = Math.ceil(tempHeaders.length / colCount);
            const cols: string[] = [];
            for (let c = 0; c < colCount; c++) cols.push(tempHeaders.slice(c * perCol, (c + 1) * perCol).join(' '));
            tableHtml += `<thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;
          }
        }
        currentTableColCount = colCount;
      } else {
        flushTable();
        htmlParts.push(`<h2>${between.replace(/&amp;/g, '&')}</h2>`);
      }
    }

    if (currentTableColCount > 0 && row.values.length + 1 !== currentTableColCount) flushTable();

    const label = row.label.replace(/&amp;/g, '&');
    if (row.values.length === 1 && currentTableColCount === 3) {
      const typeMatch = label.match(/^(.+?)\s+(Full-time|Part-time|Contract|Permanent|Temporary)\s*$/i);
      if (typeMatch) {
        tableHtml += `<tr><td>${typeMatch[1]}</td><td>${typeMatch[2]}</td><td>${row.values[0]}</td></tr>`;
      } else {
        tableHtml += `<tr><td>${label}</td><td></td><td>${row.values[0]}</td></tr>`;
      }
    } else {
      tableHtml += `<tr>${[label, ...row.values].map(v => `<td>${v}</td>`).join('')}</tr>`;
    }
    currentTableColCount = row.values.length + 1;
    lastEnd = row.end;
  }

  flushTable();

  const remaining = bodyText.substring(lastEnd).trim();
  if (remaining) htmlParts.push(`<p>${remaining.replace(/&amp;/g, '&')}</p>`);

  return htmlParts.join('\n');
}

function ExtractedTextViewer({ document, signedUrl }: { document: Document; signedUrl: string | null }) {
  const contentHtml = useMemo(() => buildExtractedHtmlForDoc(document.extracted_text || ''), [document.extracted_text]);
  const title = document.name || 'Document';
  const displayTitle = title.replace(/\.\w{2,5}$/, '');
  const categoryLabel = document.ai_category ? (CATEGORY_LABELS[document.ai_category] || document.ai_category) : null;

  const coverHtml = `<h1>${displayTitle}</h1>` +
    (categoryLabel ? `<p>${categoryLabel}</p>` : '') +
    `<p>Extracted Document Preview</p>`;

  const pages = useMemo(() => [
    { html: coverHtml, isCover: true },
    { html: contentHtml, isCover: false },
  ], [coverHtml, contentHtml]);

  const contentRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const thumbRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [activePage, setActivePage] = useState(0);

  useEffect(() => {
    if (!contentRef.current || pages.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let bestIdx = 0;
        let bestRatio = 0;
        for (const entry of entries) {
          const idx = Number(entry.target.getAttribute('data-page-idx'));
          if (!isNaN(idx) && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIdx = idx;
          }
        }
        if (bestRatio > 0) setActivePage(bestIdx);
      },
      { root: contentRef.current, threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    pageRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pages.length]);

  useEffect(() => {
    const thumb = thumbRefs.current.get(activePage);
    if (thumb && sidebarRef.current) {
      thumb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activePage]);

  const scrollToPage = useCallback((idx: number) => {
    pageRefs.current.get(idx)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div>
      <div className="doc-extracted-viewer">
        {/* Thumbnail sidebar */}
        <div className="doc-thumb-sidebar" ref={sidebarRef}>
          {pages.map((page, i) => (
            <button
              key={i}
              ref={(el) => { if (el) thumbRefs.current.set(i, el); else thumbRefs.current.delete(i); }}
              className={`doc-thumb${activePage === i ? ' doc-thumb-active' : ''}`}
              onClick={() => scrollToPage(i)}
              aria-label={`Go to page ${i + 1}`}
            >
              <div className={`doc-thumb-page${page.isCover ? ' doc-cover-thumb' : ''}`}>
                <div className="doc-page-content doc-thumb-content" dangerouslySetInnerHTML={{ __html: page.html }} />
              </div>
              <span className="doc-thumb-label">{i + 1}</span>
            </button>
          ))}
        </div>

        {/* Main scrollable content */}
        <div className="doc-extracted-content" ref={contentRef}>
          {pages.map((page, i) => (
            <div
              key={i}
              ref={(el) => { if (el) pageRefs.current.set(i, el); else pageRefs.current.delete(i); }}
              data-page-idx={i}
              className={`doc-page${page.isCover ? ' doc-cover-page' : ''}`}
            >
              {!page.isCover && (
                <div className="doc-page-header">
                  <span className="doc-page-header-title">{title}</span>
                </div>
              )}
              <div className="doc-page-content" dangerouslySetInnerHTML={{ __html: page.html }} />
              {!page.isCover && (
                <div className="doc-page-footer">
                  <span className="doc-page-footer-title">{title}</span>
                  <span className="doc-page-footer-number">{(document.extracted_text || '').length.toLocaleString()} characters</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {signedUrl && (
          <div className="doc-extracted-download">
            <a href={signedUrl} target="_blank" rel="noopener noreferrer">
              <Download className="h-3.5 w-3.5 mr-1.5 inline" />
              Download Original
            </a>
          </div>
        )}
      </div>
      <style jsx global>{docExtractedStyles}</style>
    </div>
  );
}

const docExtractedStyles = `
  .doc-extracted-viewer {
    display: flex;
    flex-direction: row;
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    overflow: hidden;
    height: 100%;
    min-height: 500px;
    background: hsl(0 0% 75%);
    position: relative;
  }

  /* ── Thumbnail Sidebar ── */
  .doc-thumb-sidebar {
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
  .doc-thumb-sidebar::-webkit-scrollbar { width: 4px; }
  .doc-thumb-sidebar::-webkit-scrollbar-track { background: transparent; }
  .doc-thumb-sidebar::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.2);
    border-radius: 2px;
  }
  .doc-thumb {
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
  .doc-thumb-page {
    width: 96px;
    height: 136px;
    background: white;
    border: 2px solid hsl(var(--border));
    border-radius: 2px;
    overflow: hidden;
    position: relative;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .doc-thumb:hover .doc-thumb-page {
    border-color: hsl(var(--muted-foreground) / 0.5);
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  }
  .doc-thumb-active .doc-thumb-page {
    border-color: hsl(0 72% 51%);
    box-shadow: 0 0 0 1px hsl(0 72% 51%);
  }
  .doc-thumb-content {
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
    top: 0; left: 0; right: 0;
    height: 4px;
    background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 50%, #1e3a5f 100%);
    z-index: 1;
  }
  .doc-thumb-label {
    font-size: 0.65rem;
    color: hsl(var(--muted-foreground));
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .doc-thumb-active .doc-thumb-label {
    color: hsl(0 72% 51%);
    font-weight: 600;
  }

  .doc-extracted-download {
    position: absolute;
    top: 8px;
    right: 12px;
    z-index: 10;
  }

  .doc-extracted-download a {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    font-size: 0.8rem;
    background: white;
    border: 1px solid hsl(var(--border));
    border-radius: 6px;
    color: hsl(var(--foreground));
    text-decoration: none;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }

  .doc-extracted-download a:hover {
    background: hsl(var(--muted));
  }

  .doc-extracted-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    background: hsl(0 0% 75%);
  }

  .doc-extracted-content::-webkit-scrollbar { width: 8px; }
  .doc-extracted-content::-webkit-scrollbar-track { background: transparent; }
  .doc-extracted-content::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.25);
    border-radius: 4px;
  }

  .doc-extracted-content .doc-page {
    background: white;
    width: 100%;
    max-width: 794px;
    min-height: 1123px;
    padding: 96px 72px 100px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06);
    border: 1px solid hsl(var(--border) / 0.5);
    position: relative;
    overflow-wrap: break-word;
  }

  .doc-extracted-content .doc-cover-page {
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
  }

  .doc-extracted-content .doc-cover-page::before {
    content: '';
    display: block;
    width: 100%;
    height: 8px;
    background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 50%, #1e3a5f 100%);
    flex-shrink: 0;
  }

  .doc-extracted-content .doc-cover-page .doc-page-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 80px 72px 100px;
  }

  .doc-extracted-content .doc-cover-page .doc-page-content h1 {
    font-size: 2rem;
    font-weight: 800;
    color: #1a2b42;
    border-bottom: none;
    padding-bottom: 0;
    margin: 0 0 1.5rem 0;
    line-height: 1.25;
    letter-spacing: -0.02em;
  }

  .doc-extracted-content .doc-cover-page .doc-page-content h1::after {
    content: '';
    display: block;
    width: 80px;
    height: 3px;
    background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%);
    margin: 1.25rem auto 0;
    border-radius: 2px;
  }

  .doc-extracted-content .doc-cover-page .doc-page-content p {
    font-size: 0.95rem;
    color: #5a6a7a;
    margin: 0.35rem 0;
    line-height: 1.7;
  }

  .doc-extracted-content .doc-page-header {
    position: absolute;
    top: 32px;
    left: 72px;
    right: 72px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e0e4e8;
  }

  .doc-extracted-content .doc-page-header-title {
    font-size: 0.7rem;
    font-weight: 600;
    color: #8a95a5;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .doc-extracted-content .doc-page-footer {
    position: absolute;
    bottom: 32px;
    left: 72px;
    right: 72px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 10px;
    border-top: 1px solid #e0e4e8;
  }

  .doc-extracted-content .doc-page-footer-title {
    font-size: 0.65rem;
    color: #a0a8b4;
    max-width: 60%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .doc-extracted-content .doc-page-footer-number {
    font-size: 0.65rem;
    color: #a0a8b4;
  }

  .doc-extracted-content .doc-page-content {
    display: flex;
    flex-direction: column;
  }

  .doc-extracted-content .doc-page-content h1 {
    font-size: 1.45rem;
    font-weight: 700;
    margin: 1.5rem 0 0.5rem 0;
    color: #1a2b42;
    border-bottom: 2px solid #e0e4e8;
    padding-bottom: 0.4rem;
    line-height: 1.3;
  }
  .doc-extracted-content .doc-page-content h1:first-child { margin-top: 0; }

  .doc-extracted-content .doc-page-content h2 {
    font-size: 1.15rem;
    font-weight: 700;
    margin: 1rem 0 0.2rem 0;
    color: #1a2b42;
    line-height: 1.35;
  }

  .doc-extracted-content .doc-page-content h3 {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0.6rem 0 0.1rem 0;
    color: #4a5568;
    line-height: 1.4;
  }

  .doc-extracted-content .doc-page-content p {
    font-size: 0.875rem;
    margin: 0.25rem 0;
    line-height: 1.85;
    color: #1a1a1a;
  }

  .doc-extracted-content .doc-page-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0 0.3rem 0;
    font-size: 0.8rem;
  }

  .doc-extracted-content .doc-page-content table th {
    background-color: #f0f3f7;
    font-weight: 600;
    text-align: left;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d8dde4;
    color: #1a2b42;
  }

  .doc-extracted-content .doc-page-content table th:not(:first-child) {
    text-align: right;
  }

  .doc-extracted-content .doc-page-content table td {
    padding: 0.45rem 0.75rem;
    border: 1px solid #d8dde4;
    color: #1a1a1a;
  }

  .doc-extracted-content .doc-page-content table td:not(:first-child) {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    white-space: nowrap;
  }

  .doc-extracted-content .doc-page-content table tr:nth-child(even) td {
    background-color: #f8f9fb;
  }
`;

export function DocumentDetail({ document, signedUrl, linkedGrant }: DocumentDetailProps) {
  const router = useRouter()
  const [category, setCategory] = useState(document.ai_category || document.category || "")
  const [isSaving, startSaving] = useTransition()
  const [isDeleting, setIsDeleting] = useState(false)

  const initialCategory = document.ai_category || document.category || ""
  const hasUnsavedCategory = category !== initialCategory

  async function handleSaveCategory() {
    if (!category) return
    startSaving(async () => {
      const result = await updateDocumentCategory(document.id, category)
      if (result.error) {
        alert("Failed to update category: " + result.error)
      }
    })
  }

  async function handleDownload() {
    if (!document.file_path) return
    const { url, error } = await getDownloadUrl(document.file_path)
    if (error) {
      alert("Failed to generate download URL: " + error)
      return
    }
    if (url) {
      window.open(url, "_blank")
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const result = await deleteDocument(document.id)
      if (result.error) {
        alert("Failed to delete document: " + result.error)
        setIsDeleting(false)
      } else {
        router.push("/documents")
      }
    } catch {
      alert("Failed to delete document")
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/documents")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          {getFileTypeIcon(document.file_type)}
          <h1 className="text-xl font-semibold truncate">{document.name}</h1>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Left: Document Viewer (2/3) */}
        <div className="lg:col-span-2 min-h-[500px]">
          <DocumentViewer document={document} signedUrl={signedUrl} />
        </div>

        {/* Right: Metadata Sidebar (1/3) */}
        <div className="space-y-6">
          <div className="rounded-lg border p-4 space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Details</h2>

            {/* File type */}
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <Badge variant="secondary" className="mt-1">
                {getFileTypeLabel(document.file_type)}
              </Badge>
            </div>

            {/* Category (editable) */}
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <div className="flex gap-2 mt-1">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat] || cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasUnsavedCategory && (
                  <Button
                    size="sm"
                    onClick={handleSaveCategory}
                    disabled={isSaving}
                  >
                    {isSaving ? "..." : "Save"}
                  </Button>
                )}
              </div>
            </div>

            {/* AI Category (read-only) */}
            {document.ai_category && (
              <div>
                <p className="text-sm text-muted-foreground">AI Category</p>
                <p className="text-sm mt-1">{document.ai_category}</p>
              </div>
            )}

            {/* File size */}
            <div>
              <p className="text-sm text-muted-foreground">Size</p>
              <p className="text-sm mt-1">{formatFileSize(document.file_size)}</p>
            </div>

            {/* Upload date */}
            <div>
              <p className="text-sm text-muted-foreground">Uploaded</p>
              <p className="text-sm mt-1">
                {document.created_at
                  ? new Date(document.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Unknown"}
              </p>
            </div>

            {/* Linked grant */}
            {linkedGrant && (
              <div>
                <p className="text-sm text-muted-foreground">Linked Grant</p>
                <Link
                  href={`/pipeline/${linkedGrant.id}`}
                  className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  {linkedGrant.title}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete Document"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete document?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &ldquo;{document.name}&rdquo;. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  )
}
