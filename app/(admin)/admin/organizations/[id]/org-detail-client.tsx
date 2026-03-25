"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ArrowLeft,
  FileText,
  Download,
  Loader2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Search,
  ChevronDown,
  ChevronUp,
  Users,
  BarChart3,
  FolderOpen,
  CreditCard,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  approveOrganization,
  rejectOrganization,
  getAdminDocumentUrl,
  updateOrgPlan,
  cancelSubscription,
  extendTrial,
  updateSubscriptionStatus,
} from "../actions";
import { PLANS } from "@/lib/stripe/config";
import type { PlanId } from "@/lib/stripe/config";
import { ProposalSections } from "@/app/(dashboard)/proposals/[id]/components/proposal-sections";

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
    plan: string | null;
    subscription_status: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    trial_ends_at: string | null;
  };
  profiles: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    created_at: string | null;
  }>;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  grants: Array<any>;
  proposals: Array<any>;
  /* eslint-enable @typescript-eslint/no-explicit-any */
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

  const displayTitle = title.replace(/\.\w{2,5}$/, '');

  const coverHtml = `<h1>${displayTitle}</h1>` +
    (categoryLabel ? `<p>${categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1)}</p>` : '') +
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
      <div className="extracted-viewer">
        {/* Thumbnail sidebar */}
        <div className="ext-thumb-sidebar" ref={sidebarRef}>
          {pages.map((page, i) => (
            <button
              key={i}
              ref={(el) => { if (el) thumbRefs.current.set(i, el); else thumbRefs.current.delete(i); }}
              className={`ext-thumb${activePage === i ? ' ext-thumb-active' : ''}`}
              onClick={() => scrollToPage(i)}
              aria-label={`Go to page ${i + 1}`}
            >
              <div className={`ext-thumb-page${page.isCover ? ' doc-cover-thumb' : ''}`}>
                <div className="doc-page-content ext-thumb-content" dangerouslySetInnerHTML={{ __html: page.html }} />
              </div>
              <span className="ext-thumb-label">{i + 1}</span>
            </button>
          ))}
        </div>

        {/* Main scrollable content */}
        <div className="extracted-content" ref={contentRef}>
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
                  <span className="doc-page-footer-number">{text.length.toLocaleString()} characters</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{extractedViewerStyles}</style>
    </div>
  );
}

const extractedViewerStyles = `
  .extracted-viewer {
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
  .ext-thumb-sidebar {
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
  .ext-thumb-sidebar::-webkit-scrollbar { width: 4px; }
  .ext-thumb-sidebar::-webkit-scrollbar-track { background: transparent; }
  .ext-thumb-sidebar::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.2);
    border-radius: 2px;
  }
  .ext-thumb {
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
  .ext-thumb-page {
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
  .ext-thumb:hover .ext-thumb-page {
    border-color: hsl(var(--muted-foreground) / 0.5);
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  }
  .ext-thumb-active .ext-thumb-page {
    border-color: hsl(0 72% 51%);
    box-shadow: 0 0 0 1px hsl(0 72% 51%);
  }
  .ext-thumb-content {
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
  .ext-thumb-label {
    font-size: 0.65rem;
    color: hsl(var(--muted-foreground));
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .ext-thumb-active .ext-thumb-label {
    color: hsl(0 72% 51%);
    font-weight: 600;
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
              ) : selectedDoc.extracted_text ? (
                <ExtractedTextViewer
                  text={selectedDoc.extracted_text}
                  title={selectedDoc.title || selectedDoc.name || "Document"}
                  category={selectedDoc.ai_category || selectedDoc.category}
                  signedUrl={signedUrl}
                />

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

// Read-only grant detail dialog content
function GrantDetailView({ grant }: { grant: any }) { /* eslint-disable-line @typescript-eslint/no-explicit-any */
  const eligibility = grant.eligibility as {
    score?: string;
    indicator?: string;
    dimension_scores?: {
      mission_alignment?: number;
      target_population?: number;
      service_fit?: number;
      geographic_alignment?: number;
      organizational_capacity?: number;
    };
  } | null;
  const concerns = grant.concerns as string[] | null;
  const recommendations = grant.recommendations as { text?: string }[] | string[] | null;

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      {/* Grant Details */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Funder</p>
            <p className="font-medium">{grant.funder_name || "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Stage</p>
            <Badge variant="outline">{grant.stage || "-"}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Amount</p>
            <p className="font-medium">{grant.amount || "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Deadline</p>
            <p className="font-medium">
              {grant.deadline ? new Date(grant.deadline).toLocaleDateString() : "-"}
            </p>
          </div>
        </div>

        {grant.description && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="text-sm leading-relaxed rounded-lg border p-3 bg-muted/30">
              {grant.description}
            </p>
          </div>
        )}

        {grant.source_url && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Source:</span>
            <a
              href={grant.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              {grant.source_url.length > 60
                ? grant.source_url.slice(0, 60) + "..."
                : grant.source_url}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      {/* Screening Report */}
      {(grant.screening_score != null || grant.screening_notes || eligibility || concerns?.length || recommendations?.length) && (
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-semibold">Screening Report</h3>

          {grant.screening_score != null && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Score:</span>
              <Badge
                variant={
                  grant.screening_score >= 80
                    ? "default"
                    : grant.screening_score >= 50
                      ? "secondary"
                      : "destructive"
                }
                className="text-sm"
              >
                {grant.screening_score}%
              </Badge>
              {eligibility?.score && (
                <span className="text-sm text-muted-foreground">
                  ({eligibility.score})
                </span>
              )}
            </div>
          )}

          {eligibility?.dimension_scores && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Dimension Breakdown</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { label: "Mission Alignment", key: "mission_alignment" as const, max: 40 },
                  { label: "Target Population", key: "target_population" as const, max: 15 },
                  { label: "Service Fit", key: "service_fit" as const, max: 25 },
                  { label: "Geographic Alignment", key: "geographic_alignment" as const, max: 10 },
                  { label: "Org Capacity", key: "organizational_capacity" as const, max: 10 },
                ].map(({ label, key, max }) => {
                  const val = eligibility.dimension_scores?.[key] ?? 0;
                  const pct = Math.round((val / max) * 100);
                  return (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <span className="w-36 text-muted-foreground truncate">{label}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pct >= 75 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-muted-foreground">{val}/{max}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {grant.screening_notes && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Assessment</p>
              <p className="text-sm text-muted-foreground leading-relaxed rounded-lg border p-3 bg-muted/30">
                {grant.screening_notes}
              </p>
            </div>
          )}

          {concerns && concerns.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Concerns
              </p>
              <ul className="space-y-1">
                {concerns.map((concern: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">-</span>
                    {concern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendations && recommendations.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                Recommendations
              </p>
              <ul className="space-y-1">
                {recommendations.map((rec: string | { text?: string }, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">-</span>
                    {typeof rec === "string" ? rec : rec.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Read-only proposal detail dialog content
function ProposalDetailView({ proposal }: { proposal: any }) { /* eslint-disable-line @typescript-eslint/no-explicit-any */
  const sections = proposal.proposal_sections
    ? [...proposal.proposal_sections].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) /* eslint-disable-line @typescript-eslint/no-explicit-any */
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Grant: </span>
          <span className="font-medium">{proposal.grant?.title || "-"}</span>
        </div>
        {proposal.quality_score != null && (
          <Badge
            variant={
              proposal.quality_score >= 80
                ? "default"
                : proposal.quality_score >= 60
                  ? "secondary"
                  : "destructive"
            }
          >
            Quality: {proposal.quality_score}%
          </Badge>
        )}
      </div>
      <div className="h-[70vh]">
        <ProposalSections
          sections={sections}
          proposalId={proposal.id}
          proposalTitle={proposal.title}
        />
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
  const [billingLoading, setBillingLoading] = useState<string | null>(null);
  const [trialDaysInput, setTrialDaysInput] = useState("7");
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingSuccess, setBillingSuccess] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedGrant, setSelectedGrant] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);

  // Grants filtering & pagination
  const [grantSearch, setGrantSearch] = useState("");
  const [grantStageFilter, setGrantStageFilter] = useState<string>("all");
  const [grantSortField, setGrantSortField] = useState<"title" | "screening_score" | "created_at">("created_at");
  const [grantSortAsc, setGrantSortAsc] = useState(false);
  const [grantsVisible, setGrantsVisible] = useState(5);

  // Proposals filtering & pagination
  const [proposalSearch, setProposalSearch] = useState("");
  const [proposalStatusFilter, setProposalStatusFilter] = useState<string>("all");
  const [proposalSortField, setProposalSortField] = useState<"title" | "quality_score" | "created_at">("created_at");
  const [proposalSortAsc, setProposalSortAsc] = useState(false);
  const [proposalsVisible, setProposalsVisible] = useState(5);

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
    // Derive integration stats from activity_log since n8n writes there directly
    // and workflow_executions status may not get updated by n8n callbacks
    let running = 0;
    let completed = 0;
    let failed = 0;
    for (const entry of activityLog) {
      const a = entry.action;
      if (a.endsWith("_completed") || a === "proposal_generated") {
        completed++;
      } else if (a.endsWith("_failed") || a === "screening_failed" || a === "proposal_failed") {
        failed++;
      } else if (a.endsWith("_started") || a === "screening_started" || a === "proposal_started") {
        running++;
      }
    }
    // Subtract completed/failed from running since _started precedes _completed/_failed
    running = Math.max(0, running - completed - failed);
    const lastExecution = activityLog[0]?.created_at || null;
    return { running, completed, failed, lastExecution };
  }, [activityLog]);

  const stageChartConfig: ChartConfig = {
    count: { label: "Grants", color: "hsl(220, 70%, 50%)" },
  };

  const grantStages = useMemo(() => {
    const stages = new Set<string>();
    for (const g of grants) if (g.stage) stages.add(g.stage);
    return Array.from(stages).sort();
  }, [grants]);

  const filteredGrants = useMemo(() => {
    let result = [...grants];
    if (grantSearch) {
      const q = grantSearch.toLowerCase();
      result = result.filter(
        (g) =>
          g.title?.toLowerCase().includes(q) ||
          g.funder_name?.toLowerCase().includes(q)
      );
    }
    if (grantStageFilter !== "all") {
      result = result.filter((g) => g.stage === grantStageFilter);
    }
    result.sort((a, b) => {
      const av = a[grantSortField] ?? "";
      const bv = b[grantSortField] ?? "";
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return grantSortAsc ? cmp : -cmp;
    });
    return result;
  }, [grants, grantSearch, grantStageFilter, grantSortField, grantSortAsc]);

  const proposalStatuses = useMemo(() => {
    const statuses = new Set<string>();
    for (const p of proposals) if (p.status) statuses.add(p.status);
    return Array.from(statuses).sort();
  }, [proposals]);

  const filteredProposals = useMemo(() => {
    let result = [...proposals];
    if (proposalSearch) {
      const q = proposalSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.grant?.title?.toLowerCase().includes(q)
      );
    }
    if (proposalStatusFilter !== "all") {
      result = result.filter((p) => p.status === proposalStatusFilter);
    }
    result.sort((a, b) => {
      const av = a[proposalSortField] ?? "";
      const bv = b[proposalSortField] ?? "";
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return proposalSortAsc ? cmp : -cmp;
    });
    return result;
  }, [proposals, proposalSearch, proposalStatusFilter, proposalSortField, proposalSortAsc]);

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

  function toggleGrantSort(field: typeof grantSortField) {
    if (grantSortField === field) setGrantSortAsc(!grantSortAsc);
    else { setGrantSortField(field); setGrantSortAsc(false); }
  }

  function toggleProposalSort(field: typeof proposalSortField) {
    if (proposalSortField === field) setProposalSortAsc(!proposalSortAsc);
    else { setProposalSortField(field); setProposalSortAsc(false); }
  }

  const SortIcon = ({ field, currentField, asc }: { field: string; currentField: string; asc: boolean }) => (
    field === currentField
      ? asc ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />
      : null
  );

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
        <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
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

      {/* Summary stats row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Grants</p>
            <p className="text-2xl font-bold">{grants.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Proposals</p>
            <p className="text-2xl font-bold">{proposals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Documents</p>
            <p className="text-2xl font-bold">{documents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Team Members</p>
            <p className="text-2xl font-bold">{profiles.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="grants" className="gap-1.5">
            <FolderOpen className="h-4 w-4" />
            Grants
            <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{grants.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="proposals" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Proposals
            <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{proposals.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <Download className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5">
            <Users className="h-4 w-4" />
            Team & Activity
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* ===== OVERVIEW TAB ===== */}
        <TabsContent value="overview" className="space-y-4">
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
        </TabsContent>

        {/* ===== GRANTS TAB ===== */}
        <TabsContent value="grants" className="space-y-4">
          {/* Stage breakdown chart */}
          {stageCounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Grants by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={stageChartConfig} className="h-[150px] w-full">
                  <BarChart data={stageCounts} layout="vertical">
                    <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="stage" type="category" fontSize={12} tickLine={false} axisLine={false} width={100} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Search and filter bar */}
          <Card>
            <CardContent className="py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search grants..."
                    value={grantSearch}
                    onChange={(e) => { setGrantSearch(e.target.value); setGrantsVisible(5); }}
                    className="pl-9 h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Stage:</span>
                  <div className="flex gap-1 flex-wrap">
                    <Button
                      variant={grantStageFilter === "all" ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => { setGrantStageFilter("all"); setGrantsVisible(5); }}
                    >
                      All
                    </Button>
                    {grantStages.map((stage) => (
                      <Button
                        key={stage}
                        variant={grantStageFilter === stage ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => { setGrantStageFilter(stage); setGrantsVisible(5); }}
                      >
                        {stage}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              {(grantSearch || grantStageFilter !== "all") && (
                <p className="text-xs text-muted-foreground mt-2">
                  Showing {filteredGrants.length} of {grants.length} grants
                </p>
              )}
            </CardContent>
          </Card>

          {/* Grants table */}
          <Card>
            <CardContent className="p-0">
              {filteredGrants.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer select-none" onClick={() => toggleGrantSort("title")}>
                          Title <SortIcon field="title" currentField={grantSortField} asc={grantSortAsc} />
                        </TableHead>
                        <TableHead>Funder</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => toggleGrantSort("screening_score")}>
                          Score <SortIcon field="screening_score" currentField={grantSortField} asc={grantSortAsc} />
                        </TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGrants.slice(0, grantsVisible).map((g) => (
                        <TableRow key={g.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedGrant(g)}>
                          <TableCell className="font-medium max-w-[200px] truncate">{g.title}</TableCell>
                          <TableCell className="text-muted-foreground">{g.funder_name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              g.stage === "screened" ? "border-blue-300 text-blue-700 dark:text-blue-400" :
                              g.stage === "applied" ? "border-green-300 text-green-700 dark:text-green-400" :
                              g.stage === "discovered" ? "border-amber-300 text-amber-700 dark:text-amber-400" :
                              ""
                            }>
                              {g.stage || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {g.screening_score != null ? (
                              <Badge
                                variant={
                                  g.screening_score >= 80 ? "default" :
                                  g.screening_score >= 50 ? "secondary" : "destructive"
                                }
                                className="text-xs"
                              >
                                {g.screening_score}%
                              </Badge>
                            ) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>{g.amount || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {g.deadline ? new Date(g.deadline).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredGrants.length > grantsVisible && (
                    <div className="flex justify-center py-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setGrantsVisible((v) => v + 10)}
                        className="text-xs"
                      >
                        Show more ({filteredGrants.length - grantsVisible} remaining)
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FolderOpen className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">
                    {grants.length === 0 ? "No grants yet" : "No grants match your filters"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== PROPOSALS TAB ===== */}
        <TabsContent value="proposals" className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-muted-foreground">Avg Quality Score</p>
                <p className="text-2xl font-bold">{avgQualityScore || "-"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{proposalStatusCounts.pending}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{proposalStatusCounts.approved}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{proposalStatusCounts.rejected}</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and filter bar */}
          <Card>
            <CardContent className="py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search proposals..."
                    value={proposalSearch}
                    onChange={(e) => { setProposalSearch(e.target.value); setProposalsVisible(5); }}
                    className="pl-9 h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <div className="flex gap-1 flex-wrap">
                    <Button
                      variant={proposalStatusFilter === "all" ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => { setProposalStatusFilter("all"); setProposalsVisible(5); }}
                    >
                      All
                    </Button>
                    {proposalStatuses.map((status) => (
                      <Button
                        key={status}
                        variant={proposalStatusFilter === status ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => { setProposalStatusFilter(status); setProposalsVisible(5); }}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              {(proposalSearch || proposalStatusFilter !== "all") && (
                <p className="text-xs text-muted-foreground mt-2">
                  Showing {filteredProposals.length} of {proposals.length} proposals
                </p>
              )}
            </CardContent>
          </Card>

          {/* Proposals table */}
          <Card>
            <CardContent className="p-0">
              {filteredProposals.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer select-none" onClick={() => toggleProposalSort("title")}>
                          Title <SortIcon field="title" currentField={proposalSortField} asc={proposalSortAsc} />
                        </TableHead>
                        <TableHead>Grant</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => toggleProposalSort("quality_score")}>
                          Quality <SortIcon field="quality_score" currentField={proposalSortField} asc={proposalSortAsc} />
                        </TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => toggleProposalSort("created_at")}>
                          Created <SortIcon field="created_at" currentField={proposalSortField} asc={proposalSortAsc} />
                        </TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProposals.slice(0, proposalsVisible).map((p) => (
                        <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedProposal(p)}>
                          <TableCell className="font-medium max-w-[200px] truncate">{p.title || "Untitled"}</TableCell>
                          <TableCell className="text-muted-foreground max-w-[150px] truncate">{p.grant?.title || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              p.status === "approved" ? "border-green-300 text-green-700 dark:text-green-400" :
                              p.status === "rejected" ? "border-red-300 text-red-700 dark:text-red-400" :
                              p.status === "pending" ? "border-amber-300 text-amber-700 dark:text-amber-400" :
                              p.status === "draft" ? "border-gray-300 text-gray-600 dark:text-gray-400" :
                              ""
                            }>
                              {p.status || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {p.quality_score != null ? (
                              <Badge
                                variant={
                                  p.quality_score >= 80 ? "default" :
                                  p.quality_score >= 60 ? "secondary" : "destructive"
                                }
                                className="text-xs"
                              >
                                {p.quality_score}%
                              </Badge>
                            ) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const elig = p.grant?.eligibility as { confidence?: number } | null;
                              const confidence = elig?.confidence;
                              if (confidence == null) return <span className="text-muted-foreground">-</span>;
                              return (
                                <Badge
                                  variant={
                                    confidence >= 80 ? "default" :
                                    confidence >= 60 ? "secondary" : "destructive"
                                  }
                                  className="text-xs"
                                >
                                  {confidence}%
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredProposals.length > proposalsVisible && (
                    <div className="flex justify-center py-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setProposalsVisible((v) => v + 10)}
                        className="text-xs"
                      >
                        Show more ({filteredProposals.length - proposalsVisible} remaining)
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">
                    {proposals.length === 0 ? "No proposals yet" : "No proposals match your filters"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== DOCUMENTS TAB ===== */}
        <TabsContent value="documents">
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
        </TabsContent>

        {/* ===== TEAM & ACTIVITY TAB ===== */}
        <TabsContent value="team" className="space-y-4">
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
        </TabsContent>

        {/* ===== BILLING TAB ===== */}
        <TabsContent value="billing" className="space-y-4">
          {billingError && (
            <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
              {billingError}
            </div>
          )}
          {billingSuccess && (
            <div className="rounded-lg border border-green-300 bg-green-50 dark:bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              {billingSuccess}
            </div>
          )}

          {/* Current Billing Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Subscription Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Plan</p>
                  <p className="text-lg font-semibold">
                    {PLANS[organization.plan as PlanId]?.name || organization.plan || "Free"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Subscription Status</p>
                  <div className="mt-1">
                    {(() => {
                      const status = organization.subscription_status;
                      if (!status) return <Badge variant="outline">None</Badge>;
                      const colors: Record<string, string> = {
                        active: "border-green-300 text-green-700 dark:text-green-400 bg-green-500/10",
                        trialing: "border-amber-300 text-amber-700 dark:text-amber-400 bg-amber-500/10",
                        past_due: "border-red-300 text-red-700 dark:text-red-400 bg-red-500/10",
                        canceled: "border-gray-300 text-gray-700 dark:text-gray-400",
                        unpaid: "border-red-300 text-red-700 dark:text-red-400 bg-red-500/10",
                      };
                      return (
                        <Badge variant="outline" className={colors[status] || ""}>
                          {status.replace("_", " ")}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Monthly Price</p>
                  <p className="text-lg font-semibold">
                    {PLANS[organization.plan as PlanId]?.price === 0
                      ? "Free"
                      : `$${PLANS[organization.plan as PlanId]?.price || 0}`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trial Ends</p>
                  <p className="text-sm font-medium">
                    {organization.trial_ends_at
                      ? (() => {
                          const end = new Date(organization.trial_ends_at);
                          const now = new Date();
                          const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          return (
                            <>
                              {end.toLocaleDateString()}
                              {daysLeft > 0 ? (
                                <span className="text-amber-600 dark:text-amber-400 ml-1">
                                  ({daysLeft}d left)
                                </span>
                              ) : (
                                <span className="text-red-600 dark:text-red-400 ml-1">(expired)</span>
                              )}
                            </>
                          );
                        })()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stripe IDs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Stripe Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Customer ID</p>
                  <p className="font-mono text-xs mt-1">
                    {organization.stripe_customer_id || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Subscription ID</p>
                  <p className="font-mono text-xs mt-1">
                    {organization.stripe_subscription_id || "Not set"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Billing Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Change Plan */}
              <div className="space-y-2">
                <Label>Change Plan</Label>
                <div className="flex items-center gap-3">
                  <Select
                    defaultValue={organization.plan || "free"}
                    onValueChange={async (value) => {
                      setBillingLoading("plan");
                      setBillingError(null);
                      setBillingSuccess(null);
                      const result = await updateOrgPlan(organization.id, value as PlanId);
                      if (result.error) setBillingError(result.error);
                      else setBillingSuccess(`Plan updated to ${PLANS[value as PlanId]?.name || value}`);
                      setBillingLoading(null);
                    }}
                    disabled={billingLoading === "plan"}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(PLANS) as [PlanId, typeof PLANS[PlanId]][]).map(([id, plan]) => (
                        <SelectItem key={id} value={id}>
                          {plan.name} {plan.price > 0 ? `($${plan.price}/mo)` : "(Free)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {billingLoading === "plan" && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </div>

              {/* Update Subscription Status */}
              <div className="space-y-2">
                <Label>Override Subscription Status</Label>
                <div className="flex items-center gap-3">
                  <Select
                    defaultValue={organization.subscription_status || ""}
                    onValueChange={async (value) => {
                      setBillingLoading("status");
                      setBillingError(null);
                      setBillingSuccess(null);
                      const result = await updateSubscriptionStatus(organization.id, value);
                      if (result.error) setBillingError(result.error);
                      else setBillingSuccess(`Subscription status updated to ${value}`);
                      setBillingLoading(null);
                    }}
                    disabled={billingLoading === "status"}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trialing">Trialing</SelectItem>
                      <SelectItem value="past_due">Past Due</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                  {billingLoading === "status" && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </div>

              {/* Extend Trial */}
              <div className="space-y-2">
                <Label>Extend Trial</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={trialDaysInput}
                    onChange={(e) => setTrialDaysInput(e.target.value)}
                    className="w-[100px]"
                    placeholder="Days"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const days = parseInt(trialDaysInput);
                      if (isNaN(days) || days < 1) return;
                      setBillingLoading("trial");
                      setBillingError(null);
                      setBillingSuccess(null);
                      const result = await extendTrial(organization.id, days);
                      if (result.error) setBillingError(result.error);
                      else setBillingSuccess(`Trial extended by ${days} days`);
                      setBillingLoading(null);
                    }}
                    disabled={billingLoading === "trial"}
                  >
                    {billingLoading === "trial" ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    Extend
                  </Button>
                </div>
              </div>

              {/* Cancel Subscription */}
              {organization.stripe_subscription_id && (
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-red-600">Danger Zone</Label>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!confirm("Are you sure you want to cancel this subscription? This will immediately cancel the Stripe subscription.")) return;
                      setBillingLoading("cancel");
                      setBillingError(null);
                      setBillingSuccess(null);
                      const result = await cancelSubscription(organization.id);
                      if (result.error) setBillingError(result.error);
                      else setBillingSuccess("Subscription canceled successfully");
                      setBillingLoading(null);
                    }}
                    disabled={billingLoading === "cancel"}
                  >
                    {billingLoading === "cancel" ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    Cancel Subscription
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Grant Detail Dialog (read-only) */}
      <Dialog open={!!selectedGrant} onOpenChange={(open) => !open && setSelectedGrant(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedGrant?.title || "Grant Details"}</DialogTitle>
            <DialogDescription>Read-only view of grant details</DialogDescription>
          </DialogHeader>
          {selectedGrant && <GrantDetailView grant={selectedGrant} />}
        </DialogContent>
      </Dialog>

      {/* Proposal Detail Dialog (read-only) */}
      <Dialog open={!!selectedProposal} onOpenChange={(open) => !open && setSelectedProposal(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedProposal?.title || "Proposal"}</DialogTitle>
            <DialogDescription>Read-only view of proposal</DialogDescription>
          </DialogHeader>
          {selectedProposal && <ProposalDetailView proposal={selectedProposal} />}
        </DialogContent>
      </Dialog>

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
