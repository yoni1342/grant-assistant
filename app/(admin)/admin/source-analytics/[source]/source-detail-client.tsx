"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Database,
  CalendarCheck,
  Users,
  FileText,
  CheckCircle2,
  ExternalLink,
  ArrowDownUp,
  Info,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrantRow {
  id: string;
  title: string;
  funder_name: string | null;
  source_url: string | null;
  deadline: string | null;
  amount: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  is_active: boolean;
  eligibility_score: string | null;
  eligibility_confidence: number | null;
  dimension_scores: Record<string, number> | null;
  orgs_picked_up: number;
  proposals_count: number;
}

interface Summary {
  total: number;
  active: number;
  expired: number;
  picked_up: number;
  green: number;
  yellow: number;
  red: number;
  no_score: number;
  proposals: number;
}

type SortField = "title" | "deadline" | "eligibility_confidence" | "orgs_picked_up" | "first_seen_at";
type FilterMode = "all" | "active" | "expired" | "green" | "yellow" | "red";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function InfoTip({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-64 text-xs">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function EligibilityBadge({ score }: { score: string | null }) {
  if (!score) return <span className="text-muted-foreground text-xs">-</span>;
  const map: Record<string, { label: string; cls: string }> = {
    GREEN: { label: "Green", cls: "border-green-300 text-green-700 dark:text-green-400" },
    YELLOW: { label: "Yellow", cls: "border-amber-300 text-amber-700 dark:text-amber-400" },
    RED: { label: "Red", cls: "border-red-300 text-red-700 dark:text-red-400" },
  };
  const m = map[score] || { label: score, cls: "" };
  return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${m.cls}`}>{m.label}</Badge>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SourceDetailClient({ source }: { source: string }) {
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortField, setSortField] = useState<SortField>("first_seen_at");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = filterMode !== "all" ? `?filter=${filterMode}` : "";
        const res = await fetch(`/api/grant-source-stats/${encodeURIComponent(source)}${params}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setGrants(data.grants || []);
        setSummary(data.summary || null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [source, filterMode]);

  function handleSort(field: SortField) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  }

  const sorted = useMemo(() => {
    return [...grants].sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      switch (sortField) {
        case "title":
          return dir * (a.title || "").localeCompare(b.title || "");
        case "deadline":
          return dir * ((a.deadline || "9999").localeCompare(b.deadline || "9999"));
        case "eligibility_confidence":
          return dir * ((a.eligibility_confidence ?? -1) - (b.eligibility_confidence ?? -1));
        case "orgs_picked_up":
          return dir * (a.orgs_picked_up - b.orgs_picked_up);
        case "first_seen_at":
          return dir * ((a.first_seen_at || "").localeCompare(b.first_seen_at || ""));
        default:
          return 0;
      }
    });
  }, [grants, sortField, sortAsc]);

  // --- Render ---

  if (error && !loading) {
    return (
      <div className="space-y-6">
        <DetailHeader source={source} count={0} />
        <Card>
          <CardContent className="py-10 text-center text-red-600">{error}</CardContent>
        </Card>
      </div>
    );
  }

  const filters: { key: FilterMode; label: string; count?: number }[] = [
    { key: "all", label: "All", count: summary?.total },
    { key: "active", label: "Active", count: summary?.active },
    { key: "expired", label: "Expired", count: summary?.expired },
    { key: "green", label: "Green", count: summary?.green },
    { key: "yellow", label: "Yellow", count: summary?.yellow },
    { key: "red", label: "Red", count: summary?.red },
  ];

  return (
    <div className="space-y-6">
      <DetailHeader source={source} count={summary?.total || 0} />

      {/* ====== Summary Cards ====== */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Total Grants
                <InfoTip>Total grants in the central catalog from this source domain.</InfoTip>
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.total.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Active
                <InfoTip>Grants with a future deadline or no deadline. These are still available for organizations to pursue.</InfoTip>
              </CardTitle>
              <CalendarCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{summary.active}</p>
              <p className="text-xs text-muted-foreground">{summary.expired} expired</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Picked Up
                <InfoTip>Grants from this source that at least one organization has added to their pipeline.</InfoTip>
              </CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{summary.picked_up}</p>
              <p className="text-xs text-muted-foreground">
                {summary.total > 0 ? `${Math.round((summary.picked_up / summary.total) * 100)}% pickup rate` : ""}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Eligibility
                <InfoTip>Distribution of AI eligibility scores. Green = strong match, Yellow = partial, Red = poor fit. Based on the most recent org that screened each grant.</InfoTip>
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600 font-medium">{summary.green}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-amber-600 font-medium">{summary.yellow}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-red-600 font-medium">{summary.red}</span>
              </div>
              {summary.no_score > 0 && (
                <p className="text-xs text-muted-foreground">{summary.no_score} unscored</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Proposals
                <InfoTip>Total proposal drafts generated from this source&apos;s grants across all organizations.</InfoTip>
              </CardTitle>
              <FileText className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">{summary.proposals}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== Filter Tabs ====== */}
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <Button
            key={f.key}
            variant={filterMode === f.key ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setFilterMode(f.key)}
          >
            {f.label}
            {f.count != null && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-[1rem] justify-center">
                {f.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* ====== Grants Table ====== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            Grants from {source}
            <InfoTip>Individual grants from this source in the central catalog. Shows eligibility scores, deadline status, and how many organizations have picked up each grant.</InfoTip>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No grants found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="table-fixed min-w-[800px]">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <SortableHead field="title" current={sortField} asc={sortAsc} onSort={handleSort}>Grant</SortableHead>
                    <SortableHead field="deadline" current={sortField} asc={sortAsc} onSort={handleSort} align="right">Deadline</SortableHead>
                    <TableHead className="text-center text-xs px-2 py-1.5">Score</TableHead>
                    <SortableHead field="eligibility_confidence" current={sortField} asc={sortAsc} onSort={handleSort} align="right">Confidence</SortableHead>
                    <SortableHead field="orgs_picked_up" current={sortField} asc={sortAsc} onSort={handleSort} align="right">Orgs</SortableHead>
                    <TableHead className="text-right text-xs px-2 py-1.5">Proposals</TableHead>
                    <SortableHead field="first_seen_at" current={sortField} asc={sortAsc} onSort={handleSort} align="right">First Seen</SortableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((g) => {
                    const deadlinePast = g.deadline && g.deadline < new Date().toISOString().split("T")[0];
                    return (
                      <TableRow key={g.id} className={!g.is_active ? "opacity-50" : ""}>
                        <TableCell className="text-xs px-2 py-1.5">
                          <div className="flex items-start gap-1.5">
                            <div className="min-w-0">
                              <p className="font-medium line-clamp-2" title={g.title}>{g.title}</p>
                              {g.funder_name && (
                                <p className="text-muted-foreground truncate">{g.funder_name}</p>
                              )}
                            </div>
                            {g.source_url && (
                              <a href={g.source_url} target="_blank" rel="noopener noreferrer" className="shrink-0 mt-0.5">
                                <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-blue-600" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs px-2 py-1.5">
                          {g.deadline ? (
                            <span className={deadlinePast ? "text-red-500 flex items-center justify-end gap-1" : ""}>
                              {deadlinePast && <AlertTriangle className="h-3 w-3" />}
                              {new Date(g.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-xs px-2 py-1.5">
                          <EligibilityBadge score={g.eligibility_score} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                          {g.eligibility_confidence != null ? (
                            <span className={g.eligibility_confidence >= 75 ? "text-green-600" : g.eligibility_confidence >= 50 ? "text-amber-600" : "text-red-600"}>
                              {g.eligibility_confidence}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                          {g.orgs_picked_up > 0 ? (
                            <span className="text-blue-600">{g.orgs_picked_up}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                          {g.proposals_count > 0 ? (
                            <span className="text-purple-600">{g.proposals_count}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs px-2 py-1.5 text-muted-foreground">
                          {g.first_seen_at
                            ? new Date(g.first_seen_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DetailHeader({ source, count }: { source: string; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <Link href="/admin/source-analytics">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </Link>
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight">
          {source}
        </h1>
        <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
          {count} grant{count !== 1 ? "s" : ""} from this source
        </p>
      </div>
    </div>
  );
}

function SortableHead({
  field,
  children,
  align = "left",
  current,
  onSort,
}: {
  field: SortField;
  children: React.ReactNode;
  align?: "left" | "right";
  current: SortField;
  asc?: boolean;
  onSort: (f: SortField) => void;
}) {
  return (
    <TableHead
      className={`cursor-pointer select-none text-xs px-2 py-1.5 ${align === "right" ? "text-right" : ""}`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        {children}
        {current === field && (
          <ArrowDownUp className="h-3 w-3 text-foreground shrink-0" />
        )}
      </div>
    </TableHead>
  );
}
