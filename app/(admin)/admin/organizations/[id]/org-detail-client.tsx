"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ArrowLeft, FileText, Download, Loader2 } from "lucide-react";
import {
  approveOrganization,
  rejectOrganization,
  getAdminDocumentUrl,
} from "../actions";

interface DocumentItem {
  id: string;
  title: string | null;
  name: string | null;
  category: string | null;
  ai_category: string | null;
  file_type: string | null;
  file_size: number | null;
  file_path: string | null;
  extraction_status: string | null;
  extracted_text: string | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
}

interface OrgDetailClientProps {
  organization: {
    id: string;
    name: string;
    status: string;
    sector: string | null;
    mission: string | null;
    ein: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    founding_year: number | null;
    description: string | null;
    geographic_focus: string[] | null;
    created_at: string | null;
    rejection_reason: string | null;
  };
  profiles: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    created_at: string | null;
  }>;
  grants: Array<{
    id: string;
    title: string;
    funder_name: string | null;
    stage: string | null;
    amount: string | null;
    created_at: string | null;
  }>;
  proposals: Array<{
    id: string;
    title: string | null;
    status: string | null;
    quality_score: number | null;
    created_at: string | null;
  }>;
  workflowExecutions: Array<{
    id: string;
    workflow_name: string;
    status: string | null;
    created_at: string | null;
    completed_at: string | null;
  }>;
  activityLog: Array<{
    id: string;
    action: string;
    created_at: string | null;
  }>;
  documents: DocumentItem[];
  budgets: Record<string, unknown>[];
  narratives: Record<string, unknown>[];
}

function groupByMonth(items: Array<{ created_at: string | null }>, months = 6) {
  const now = new Date();
  const result: Record<string, number> = {};

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    result[key] = 0;
  }

  for (const item of items) {
    if (!item.created_at) continue;
    const d = new Date(item.created_at);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    if (key in result) result[key]++;
  }

  return Object.entries(result).map(([month, count]) => ({ month, count }));
}

const grantsChartConfig: ChartConfig = {
  count: { label: "Grants", color: "hsl(142, 70%, 45%)" },
};

const proposalsChartConfig: ChartConfig = {
  count: { label: "Proposals", color: "hsl(280, 70%, 50%)" },
};

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400">
          Pending
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="border-green-300 text-green-700 dark:text-green-400">
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-400">
          Rejected
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeCategory(cat: string): string {
  if (cat.startsWith("narrative")) return "narrative";
  if (cat.startsWith("budget")) return "budget";
  return cat;
}

function categoryBadge(category: string | null, aiCategory?: string | null) {
  const raw = aiCategory || category || "other";
  const label = normalizeCategory(raw);
  const colorMap: Record<string, string> = {
    budget: "border-emerald-300 text-emerald-700 dark:text-emerald-400",
    narrative: "border-blue-300 text-blue-700 dark:text-blue-400",
    supporting: "border-gray-300 text-gray-700 dark:text-gray-400",
    impact_metrics: "border-green-300 text-green-700",
    "501c3_letter": "border-amber-300 text-amber-700",
    board_roster: "border-purple-300 text-purple-700",
    financial_statement: "border-orange-300 text-orange-700",
  };
  return (
    <Badge variant="outline" className={`text-xs ${colorMap[label] || ""}`}>
      {label.replace(/_/g, " ")}
    </Badge>
  );
}

// Build HTML from extracted text — handles both structured (tabs/newlines) and flat text
function buildExtractedHtml(text: string): string {
  // If text has tabs or newlines, use structured parsing
  if (text.includes('\t') || text.includes('\n')) {
    return buildStructuredHtml(text);
  }
  // Otherwise, parse the flat space-separated text
  return buildFlatHtml(text);
}

// Parse text that has tabs and newlines preserving table structure
function buildStructuredHtml(text: string): string {
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
    if (!trimmed) {
      if (inTable) flushTable();
      continue;
    }

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

// Parse flat text (no tabs/newlines) by detecting $amounts, %values, and section headers
function buildFlatHtml(text: string): string {
  // Tokenize: split before known section headers and before table header patterns
  // Strategy: use regex to find all the "tokens" — amounts, headers, labels
  const htmlParts: string[] = [];

  // Split into segments at section-header boundaries
  // A section header is a capitalized phrase right before a known table-header pattern
  // Known table headers: "Category Annual Budget", "Position Type Annual Cost", "Item Annual Cost", "Source Amount % of Budget"
  const sectionPattern = /(?=(?:Budget Overview|Personnel|Clinical Supplies|Mobile Clinic|Revenue Sources|Maternal Health|Rural Health|Marketing|General Administration)[^$]*(?:\$|$))/g;

  // First extract the document title (everything before first section)
  const titleMatch = text.match(/^(.*?)(?=Budget Overview|Personnel|Clinical Supplies|Mobile Clinic|Revenue Sources)/);
  const titleText = titleMatch ? titleMatch[1].trim() : '';

  if (titleText) {
    // Split title into main title and subtitle parts
    const dashMatch = titleText.match(/^(.+?)\s+—\s+(.+?)(?:\s+(FY\S+))?$/);
    if (dashMatch) {
      htmlParts.push(`<h1>${dashMatch[1].trim()}</h1>`);
      htmlParts.push(`<h2>${dashMatch[2].trim()}</h2>`);
      if (dashMatch[3]) htmlParts.push(`<p>${dashMatch[3]}</p>`);
    } else {
      htmlParts.push(`<h1>${titleText}</h1>`);
    }
  }

  // Extract the rest after title
  const bodyText = titleText ? text.slice(titleText.length).trim() : text;

  // Split body by section headers — a section header is a short capitalized phrase
  // that appears before table data. We detect them by finding text between $amount sequences.
  // New approach: scan through and classify each segment

  // Regex to find all $amounts and %amounts with their preceding text
  const rowPattern = /([A-Za-z][A-Za-z&;/() ,.\u2014\u2013-]+?)\s+\$([\d,]+(?:\.\d+)?)/g;
  const pctRowPattern = /([A-Za-z][A-Za-z&;/() ,.\u2014\u2013-]+?)\s+\$([\d,]+(?:\.\d+)?)\s+(\d+(?:\.\d+)?%)/g;

  // Find all matches with their positions to figure out what's between them
  interface RowMatch { label: string; values: string[]; start: number; end: number }
  const rows: RowMatch[] = [];

  // First try 3-column matches (label $amount percentage)
  let m: RegExpExecArray | null;
  const usedRanges: Array<[number, number]> = [];
  const pctRegex = new RegExp(pctRowPattern.source, 'g');
  while ((m = pctRegex.exec(bodyText)) !== null) {
    rows.push({ label: m[1].trim(), values: ['$' + m[2], m[3]], start: m.index, end: m.index + m[0].length });
    usedRanges.push([m.index, m.index + m[0].length]);
  }

  // Then 2-column matches (label $amount) — skip already matched ranges
  const dollarRegex = new RegExp(rowPattern.source, 'g');
  while ((m = dollarRegex.exec(bodyText)) !== null) {
    const overlaps = usedRanges.some(([s, e]) => m!.index >= s && m!.index < e);
    if (!overlaps) {
      rows.push({ label: m[1].trim(), values: ['$' + m[2]], start: m.index, end: m.index + m[0].length });
    }
  }

  // Sort by position
  rows.sort((a, b) => a.start - b.start);

  // Now build HTML by walking through the text
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
    // Text between last row end and this row start = potential header/section
    const between = bodyText.substring(lastEnd, row.start).trim();

    if (between) {
      // Check if this gap text contains a section header
      // Split the between text to separate headers from table column headers
      const colCount = row.values.length + 1;

      // Check if between text ends with table column headers
      // e.g. "Budget Overview Category Annual Budget" → section="Budget Overview", headers=["Category", "Annual Budget"]
      // e.g. "Personnel Position Type Annual Cost" → section="Personnel", headers=["Position", "Type", "Annual Cost"]
      const words = between.split(/\s+/);

      // Detect known column header words at the end
      const headerWords: string[] = [];
      const headerKeywords = ['Category', 'Annual', 'Budget', 'Position', 'Type', 'Cost', 'Item', 'Source', 'Amount'];
      let wi = words.length - 1;

      // Walk backwards collecting header words
      let headerColsFound = 0;
      const tempHeaders: string[] = [];
      while (wi >= 0 && headerColsFound < colCount) {
        const w = words[wi];
        if (headerKeywords.includes(w) || /^[A-Z][a-z]+$/.test(w) || w === '%' || w === 'of') {
          tempHeaders.unshift(w);
          wi--;
        } else {
          break;
        }
      }

      // Group consecutive header words into column names
      // We need `colCount` columns from these words
      if (tempHeaders.length > 0) {
        // The section name is everything before the header words
        const sectionName = words.slice(0, wi + 1).join(' ');
        const headerText = tempHeaders.join(' ');

        if (sectionName) {
          flushTable();
          htmlParts.push(`<h2>${sectionName.replace(/&amp;/g, '&')}</h2>`);
        }

        // Build smart column headers based on data column count
        if (colCount === 2) {
          // 2-col table: split header into 2 parts at the middle-ish word boundary
          const midIdx = Math.ceil(tempHeaders.length / 2);
          const h1 = tempHeaders.slice(0, midIdx).join(' ');
          const h2 = tempHeaders.slice(midIdx).join(' ');
          tableHtml += `<thead><tr><th>${h1}</th><th>${h2}</th></tr></thead>`;
        } else if (colCount === 3) {
          // 3-col: try known patterns
          if (headerText.includes('Type')) {
            tableHtml += `<thead><tr><th>Position</th><th>Type</th><th>Annual Cost</th></tr></thead>`;
          } else if (headerText.includes('Amount')) {
            tableHtml += `<thead><tr><th>Source</th><th>Amount</th><th>% of Budget</th></tr></thead>`;
          } else {
            const perCol = Math.ceil(tempHeaders.length / colCount);
            const cols: string[] = [];
            for (let c = 0; c < colCount; c++) {
              cols.push(tempHeaders.slice(c * perCol, (c + 1) * perCol).join(' '));
            }
            tableHtml += `<thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;
          }
        }
        currentTableColCount = colCount;
      } else {
        flushTable();
        htmlParts.push(`<h2>${between.replace(/&amp;/g, '&')}</h2>`);
      }
    }

    // Check if column count changed (different table)
    if (currentTableColCount > 0 && row.values.length + 1 !== currentTableColCount) {
      flushTable();
    }

    // Handle multi-word labels that contain a middle column (like "Full-time", "Part-time", "Contract")
    const label = row.label.replace(/&amp;/g, '&');
    if (row.values.length === 1 && currentTableColCount === 3) {
      // 3-col table but only got $amount — the label probably contains the middle column
      const typeMatch = label.match(/^(.+?)\s+(Full-time|Part-time|Contract|Permanent|Temporary)\s*$/i);
      if (typeMatch) {
        tableHtml += `<tr><td>${typeMatch[1]}</td><td>${typeMatch[2]}</td><td>${row.values[0]}</td></tr>`;
      } else {
        tableHtml += `<tr><td>${label}</td><td></td><td>${row.values[0]}</td></tr>`;
      }
    } else {
      const tds = [label, ...row.values].map(v => `<td>${v}</td>`).join('');
      tableHtml += `<tr>${tds}</tr>`;
    }
    currentTableColCount = row.values.length + 1;
    lastEnd = row.end;
  }

  // Flush final table
  flushTable();

  // Any remaining text after the last row
  const remaining = bodyText.substring(lastEnd).trim();
  if (remaining) {
    htmlParts.push(`<p>${remaining.replace(/&amp;/g, '&')}</p>`);
  }

  return htmlParts.join('\n');
}

function ExtractedTextViewer({
  text,
  title,
  category,
  signedUrl,
}: {
  text: string;
  title: string;
  category: string | null;
  signedUrl: string | null;
}) {
  const contentHtml = useMemo(() => buildExtractedHtml(text), [text]);
  const categoryLabel = category ? category.replace(/_/g, " ") : null;

  // Strip file extension from title for cover page
  const displayTitle = title.replace(/\.\w{2,5}$/, '');

  // Cover page HTML
  const coverHtml = `<h1>${displayTitle}</h1>` +
    (categoryLabel ? `<p>${categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1)}</p>` : '') +
    `<p>Extracted Document Preview</p>`;

  return (
    <div>
      <div className="extracted-viewer">
        {/* Main scrollable content */}
        <div className="extracted-content">
          {/* Cover page */}
          <div className="doc-page doc-cover-page">
            <div
              className="doc-page-content"
              dangerouslySetInnerHTML={{ __html: coverHtml }}
            />
          </div>

          {/* Content page */}
          <div className="doc-page">
            <div className="doc-page-header">
              <span className="doc-page-header-title">{title}</span>
            </div>
            <div
              className="doc-page-content"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
            <div className="doc-page-footer">
              <span className="doc-page-footer-title">{title}</span>
              <span className="doc-page-footer-number">{text.length.toLocaleString()} characters</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{extractedViewerStyles}</style>
    </div>
  );
}

const extractedViewerStyles = `
  .extracted-viewer {
    display: flex;
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    overflow: hidden;
    height: 100%;
    min-height: 500px;
    background: hsl(0 0% 75%);
    position: relative;
  }

  .extracted-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    background: hsl(0 0% 75%);
  }

  .extracted-content::-webkit-scrollbar { width: 8px; }
  .extracted-content::-webkit-scrollbar-track { background: transparent; }
  .extracted-content::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.25);
    border-radius: 4px;
  }

  .extracted-content .doc-page {
    background: white;
    width: 100%;
    max-width: 794px;
    min-height: 1123px;
    padding: 96px 72px 100px;
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.08),
      0 4px 16px rgba(0, 0, 0, 0.06);
    border: 1px solid hsl(var(--border) / 0.5);
    position: relative;
    overflow-wrap: break-word;
  }

  .extracted-content .doc-cover-page {
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
  }

  .extracted-content .doc-cover-page::before {
    content: '';
    display: block;
    width: 100%;
    height: 8px;
    background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 50%, #1e3a5f 100%);
    flex-shrink: 0;
  }

  .extracted-content .doc-cover-page .doc-page-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 80px 72px 100px;
  }

  .extracted-content .doc-cover-page .doc-page-content h1 {
    font-size: 2rem;
    font-weight: 800;
    color: #1a2b42;
    border-bottom: none;
    padding-bottom: 0;
    margin: 0 0 1.5rem 0;
    line-height: 1.25;
    letter-spacing: -0.02em;
  }

  .extracted-content .doc-cover-page .doc-page-content h1::after {
    content: '';
    display: block;
    width: 80px;
    height: 3px;
    background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%);
    margin: 1.25rem auto 0;
    border-radius: 2px;
  }

  .extracted-content .doc-cover-page .doc-page-content p {
    font-size: 0.95rem;
    color: #5a6a7a;
    margin: 0.35rem 0;
    line-height: 1.7;
    letter-spacing: 0.01em;
  }

  .extracted-content .doc-page-header {
    position: absolute;
    top: 32px;
    left: 72px;
    right: 72px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e0e4e8;
  }

  .extracted-content .doc-page-header-title {
    font-size: 0.7rem;
    font-weight: 600;
    color: #8a95a5;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .extracted-content .doc-page-footer {
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

  .extracted-content .doc-page-footer-title {
    font-size: 0.65rem;
    color: #a0a8b4;
    letter-spacing: 0.02em;
    max-width: 60%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .extracted-content .doc-page-footer-number {
    font-size: 0.65rem;
    color: #a0a8b4;
    letter-spacing: 0.02em;
  }

  .extracted-content .doc-page-content {
    display: flex;
    flex-direction: column;
  }

  .extracted-content .doc-page-content h1 {
    font-size: 1.45rem;
    font-weight: 700;
    margin: 1.5rem 0 0.5rem 0;
    color: #1a2b42;
    border-bottom: 2px solid #e0e4e8;
    padding-bottom: 0.4rem;
    line-height: 1.3;
  }
  .extracted-content .doc-page-content h1:first-child {
    margin-top: 0;
  }

  .extracted-content .doc-page-content h2 {
    font-size: 1.15rem;
    font-weight: 700;
    margin: 1rem 0 0.2rem 0;
    color: #1a2b42;
    line-height: 1.35;
  }

  .extracted-content .doc-page-content h3 {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0.6rem 0 0.1rem 0;
    color: #4a5568;
    line-height: 1.4;
  }

  .extracted-content .doc-page-content p {
    font-size: 0.875rem;
    margin: 0.25rem 0;
    line-height: 1.85;
    color: #1a1a1a;
  }

  .extracted-content .doc-page-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0 0.3rem 0;
    font-size: 0.8rem;
  }

  .extracted-content .doc-page-content table th {
    background-color: #f0f3f7;
    font-weight: 600;
    text-align: left;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d8dde4;
    color: #1a2b42;
  }

  .extracted-content .doc-page-content table td {
    padding: 0.45rem 0.75rem;
    border: 1px solid #d8dde4;
    color: #1a1a1a;
  }

  .extracted-content .doc-page-content table td:not(:first-child) {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    white-space: nowrap;
  }

  .extracted-content .doc-page-content table th:not(:first-child) {
    text-align: right;
  }

  .extracted-content .doc-page-content table tr:nth-child(even) td {
    background-color: #f8f9fb;
  }
`;

// Document Viewer component with side panel
function DocumentViewer({ documents }: { documents: DocumentItem[] }) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    documents[0]?.id || null
  );
  const [urlCache, setUrlCache] = useState<Record<string, string | null>>({});
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || null;

  // Derive signedUrl and urlLoading from cache
  const signedUrl = selectedDocId && selectedDocId in urlCache ? urlCache[selectedDocId] : null;
  const urlLoading = loadingDocId === selectedDocId;

  // Load signed URL when selected document changes
  const loadDocumentUrl = useCallback(async (filePath: string) => {
    const result = await getAdminDocumentUrl(filePath);
    return result.url ?? null;
  }, []);

  useEffect(() => {
    const docId = selectedDoc?.id;
    const filePath = selectedDoc?.file_path;

    if (!docId || !filePath) return;
    if (docId in urlCache) return;

    let cancelled = false;
    setLoadingDocId(docId);

    loadDocumentUrl(filePath).then((url) => {
      if (!cancelled) {
        setUrlCache((prev) => ({ ...prev, [docId]: url }));
        setLoadingDocId(null);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- urlCache is intentionally excluded to avoid re-fetching cached URLs
  }, [selectedDoc?.id, selectedDoc?.file_path, loadDocumentUrl]);

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No documents uploaded
      </div>
    );
  }

  const isPdf = selectedDoc?.file_type === "application/pdf";
  const isImage = selectedDoc?.file_type?.startsWith("image/");

  return (
    <div className="flex gap-4 min-h-[600px]">
      {/* Side panel - document list */}
      <div className="w-64 shrink-0 border rounded-lg overflow-hidden">
        <div className="p-3 border-b bg-muted/50">
          <p className="text-sm font-medium">
            Documents ({documents.length})
          </p>
        </div>
        <div className="divide-y overflow-y-auto max-h-[560px]">
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDocId(doc.id)}
              className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${
                selectedDocId === doc.id
                  ? "bg-primary/5 border-l-2 border-l-primary"
                  : ""
              }`}
            >
              <p className="text-sm font-medium truncate">
                {doc.title || doc.name || "Untitled"}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {categoryBadge(doc.category, doc.ai_category)}
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(doc.file_size)}
                </span>
              </div>
              {doc.extraction_status && (
                <Badge
                  variant="outline"
                  className={`text-xs mt-1 ${
                    doc.extraction_status === "completed"
                      ? "border-green-300 text-green-700"
                      : doc.extraction_status === "failed"
                        ? "border-red-300 text-red-700"
                        : "border-amber-300 text-amber-700"
                  }`}
                >
                  {doc.extraction_status}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main content area - document preview */}
      <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
        {selectedDoc ? (
          <>
            {/* Document header */}
            <div className="p-4 border-b bg-muted/50 flex items-center justify-between">
              <div>
                <h3 className="font-medium">
                  {selectedDoc.title || selectedDoc.name || "Untitled"}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {categoryBadge(selectedDoc.category, selectedDoc.ai_category)}
                  <span className="text-xs text-muted-foreground">
                    {selectedDoc.file_type?.split("/").pop()?.toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(selectedDoc.file_size)}
                  </span>
                </div>
              </div>
              {signedUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer" download>
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download
                  </a>
                </Button>
              )}
            </div>

            {/* Document content */}
            <div className="flex-1 overflow-auto">
              {urlLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : signedUrl && isPdf ? (
                <iframe
                  src={signedUrl}
                  className="w-full h-full min-h-[500px]"
                  title={selectedDoc.title || selectedDoc.name || "Document"}
                />
              ) : signedUrl && isImage ? (
                <div className="p-4 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed URL from Supabase storage; next/image cannot optimize dynamic external URLs */}
                  <img
                    src={signedUrl}
                    alt={selectedDoc.title || selectedDoc.name || "Document"}
                    className="max-w-full max-h-[500px] rounded-md"
                  />
                </div>
              ) : selectedDoc.extracted_text ? (
                <ExtractedTextViewer
                  text={selectedDoc.extracted_text}
                  title={selectedDoc.title || selectedDoc.name || "Document"}
                  category={selectedDoc.ai_category || selectedDoc.category}
                  signedUrl={signedUrl}
                />
              ) : !selectedDoc.file_path ? (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground italic">
                    This document was created from questionnaire input (no file uploaded).
                  </p>
                  {selectedDoc.extracted_text && (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed mt-2">
                      {selectedDoc.extracted_text}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm">Unable to preview this file type. Use download button.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Select a document to preview</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function OrgDetailClient({
  organization,
  profiles,
  grants,
  proposals,
  workflowExecutions,
  activityLog,
  documents,
}: OrgDetailClientProps) {
  const [loading, setLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const owner = profiles.find((p) => p.role === "owner") || profiles[0];

  const grantsData = useMemo(() => groupByMonth(grants), [grants]);
  const proposalsData = useMemo(() => groupByMonth(proposals), [proposals]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of grants) {
      const stage = g.stage || "unknown";
      counts[stage] = (counts[stage] || 0) + 1;
    }
    return Object.entries(counts).map(([stage, count]) => ({ stage, count }));
  }, [grants]);

  const proposalStatusCounts = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0, other: 0 };
    for (const p of proposals) {
      const s = p.status || "other";
      if (s in counts) counts[s as keyof typeof counts]++;
      else counts.other++;
    }
    return counts;
  }, [proposals]);

  const avgQualityScore = useMemo(() => {
    const scored = proposals.filter((p) => p.quality_score != null);
    if (scored.length === 0) return null;
    return (
      scored.reduce((sum, p) => sum + (p.quality_score || 0), 0) / scored.length
    ).toFixed(1);
  }, [proposals]);

  const workflowStats = useMemo(() => {
    const counts = { running: 0, completed: 0, failed: 0 };
    for (const w of workflowExecutions) {
      const s = w.status || "running";
      if (s in counts) counts[s as keyof typeof counts]++;
    }
    const lastExecution = workflowExecutions[0]?.completed_at || workflowExecutions[0]?.created_at;
    return { ...counts, lastExecution };
  }, [workflowExecutions]);

  const stageChartConfig: ChartConfig = {
    count: { label: "Grants", color: "hsl(220, 70%, 50%)" },
  };

  async function handleApprove() {
    setLoading(true);
    await approveOrganization(organization.id);
    setLoading(false);
  }

  async function handleReject() {
    setLoading(true);
    await rejectOrganization(organization.id, rejectReason || undefined);
    setRejectDialogOpen(false);
    setLoading(false);
  }

  const orgFields = [
    { label: "Mission", value: organization.mission },
    { label: "Sector", value: organization.sector },
    { label: "EIN", value: organization.ein },
    { label: "Address", value: organization.address },
    { label: "Phone", value: organization.phone },
    { label: "Email", value: organization.email },
    { label: "Website", value: organization.website },
    { label: "Founding Year", value: organization.founding_year?.toString() },
    { label: "Geographic Focus", value: organization.geographic_focus?.join(", ") },
    { label: "Description", value: organization.description },
  ];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Organizations
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold">{organization.name}</h2>
            {statusBadge(organization.status)}
          </div>
          <div className="flex items-center gap-2">
            {owner && (
              <span className="text-sm text-muted-foreground">
                Registered{" "}
                {organization.created_at
                  ? new Date(organization.created_at).toLocaleDateString()
                  : ""}
                {owner.full_name && ` by ${owner.full_name}`}
                {owner.email && ` (${owner.email})`}
              </span>
            )}
            {organization.status === "pending" && (
              <div className="flex gap-2 ml-4">
                <Button
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                  onClick={handleApprove}
                  disabled={loading}
                >
                  {loading ? "..." : "Approve"}
                </Button>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={loading}
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
          {organization.status === "rejected" && organization.rejection_reason && (
            <p className="text-sm text-red-600">
              Reason: {organization.rejection_reason}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Organization Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Organization Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            {orgFields.map(
              (field) =>
                field.value && (
                  <div key={field.label}>
                    <p className="text-muted-foreground">{field.label}</p>
                    <p className="font-medium">{field.value}</p>
                  </div>
                )
            )}
          </div>
          {orgFields.every((f) => !f.value) && (
            <p className="text-sm text-muted-foreground">
              No profile details available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Documents Viewer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentViewer documents={documents} />
        </CardContent>
      </Card>

      {/* Usage Graphs */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Grants Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={grantsChartConfig} className="h-[200px] w-full">
              <BarChart data={grantsData}>
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Proposals Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={proposalsChartConfig} className="h-[200px] w-full">
              <BarChart data={proposalsData}>
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Grants Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Grants Overview ({grants.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stageCounts.length > 0 && (
            <ChartContainer config={stageChartConfig} className="h-[150px] w-full">
              <BarChart data={stageCounts} layout="vertical">
                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="stage" type="category" fontSize={12} tickLine={false} axisLine={false} width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          )}
          {grants.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Funder</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grants.slice(0, 10).map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.title}</TableCell>
                    <TableCell>{g.funder_name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{g.stage || "-"}</Badge>
                    </TableCell>
                    <TableCell>{g.amount || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {grants.length === 0 && (
            <p className="text-sm text-muted-foreground">No grants</p>
          )}
        </CardContent>
      </Card>

      {/* Proposals Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Proposals Summary ({proposals.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Avg Quality Score</p>
              <p className="text-lg font-semibold">
                {avgQualityScore || "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Pending</p>
              <p className="text-lg font-semibold text-amber-600">
                {proposalStatusCounts.pending}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Approved</p>
              <p className="text-lg font-semibold text-green-600">
                {proposalStatusCounts.approved}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Rejected</p>
              <p className="text-lg font-semibold text-red-600">
                {proposalStatusCounts.rejected}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Running</p>
              <p className="text-lg font-semibold text-blue-600">
                {workflowStats.running}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Completed</p>
              <p className="text-lg font-semibold text-green-600">
                {workflowStats.completed}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Failed</p>
              <p className="text-lg font-semibold text-red-600">
                {workflowStats.failed}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Execution</p>
              <p className="text-sm font-medium">
                {workflowStats.lastExecution
                  ? new Date(workflowStats.lastExecution).toLocaleString()
                  : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Team Members ({profiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                    No team members
                  </TableCell>
                </TableRow>
              ) : (
                profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.full_name || "-"}
                    </TableCell>
                    <TableCell>{p.email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.role || "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {activityLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate">{entry.action}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {entry.created_at
                      ? new Date(entry.created_at).toLocaleDateString()
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Organization</DialogTitle>
            <DialogDescription>
              Provide an optional reason for rejecting this organization.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading}
            >
              {loading ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
