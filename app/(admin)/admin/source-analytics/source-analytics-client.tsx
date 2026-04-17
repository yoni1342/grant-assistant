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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Database,
  Zap,
  CalendarCheck,
  Globe,
  ArrowRight,
  ArrowDownUp,
  Search,
  Info,
  AlertTriangle,
  Users,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SourceStat {
  source: string;
  total: number;
  active: number;
  new_7d: number;
  new_today: number;
  picked_up: number;
  screened: number;
  pending_approval: number;
  proposals: number;
  avg_eligibility: number;
  eligibility_count: number;
  last_seen: string | null;
  stale: boolean;
}

interface Totals {
  total: number;
  active: number;
  new_7d: number;
  new_today: number;
  sources_tracked: number;
  picked_up: number;
  screened: number;
  pending_approval: number;
  proposals: number;
}

interface DailyCount {
  date: string;
  total: number;
  by_source: Record<string, number>;
}

type SortField = "source" | "total" | "active" | "new_7d" | "picked_up" | "avg_eligibility";

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

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SourceAnalyticsClient() {
  const [sources, setSources] = useState<SourceStat[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [daily, setDaily] = useState<DailyCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("total");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/grant-source-stats");
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        setSources(data.sources || []);
        setTotals(data.totals || null);
        setDaily(data.daily || []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function handleSort(field: SortField) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  }

  const filtered = useMemo(() => {
    let list = [...sources];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.source.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortField === "source") {
        return sortAsc ? a.source.localeCompare(b.source) : b.source.localeCompare(a.source);
      }
      const av = a[sortField];
      const bv = b[sortField];
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [sources, search, sortField, sortAsc]);

  const staleSources = useMemo(() => sources.filter((s) => s.stale), [sources]);

  const chartConfig: ChartConfig = {
    total: { label: "New Grants", color: "hsl(220, 70%, 50%)" },
  };

  // --- Render ---

  if (error && !loading) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <CardContent className="py-10 text-center text-red-600">{error}</CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading source analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      {/* ====== 1. Summary Cards ====== */}
      {totals && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Total in Catalog
                <InfoTip>Total deduped grants stored in the central catalog across all sources. This is the master pool that orgs draw from.</InfoTip>
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totals.total.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Active Grants
                <InfoTip>Grants with a future deadline or no deadline set. These are available for organizations to discover and pursue.</InfoTip>
              </CardTitle>
              <CalendarCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{totals.active.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{totals.total > 0 ? `${Math.round((totals.active / totals.total) * 100)}% of catalog` : ""}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                New This Week
                <InfoTip>Grants first discovered in the last 7 days. High numbers mean sources are actively producing fresh opportunities.</InfoTip>
              </CardTitle>
              <Zap className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{totals.new_7d.toLocaleString()}</p>
              {totals.new_today > 0 && (
                <p className="text-xs text-muted-foreground">{totals.new_today} added today</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Sources Tracked
                <InfoTip>Distinct grant source websites being crawled. Each source is a domain (e.g. grants.gov, propublica.org).</InfoTip>
              </CardTitle>
              <Globe className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">{totals.sources_tracked}</p>
              {staleSources.length > 0 && (
                <p className="text-xs text-amber-600">{staleSources.length} stale (&gt;48h)</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Org Pickup Rate
                <InfoTip>Percentage of central catalog grants that at least one organization has added to their pipeline. Higher = better source quality.</InfoTip>
              </CardTitle>
              <Users className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">
                {totals.total > 0 ? `${Math.round((totals.picked_up / totals.total) * 100)}%` : "0%"}
              </p>
              <p className="text-xs text-muted-foreground">{totals.picked_up.toLocaleString()} of {totals.total.toLocaleString()} picked up</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== 2. Pipeline Conversion Funnel ====== */}
      {totals && totals.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Pipeline Conversion
              <InfoTip>Shows how central catalog grants flow through the org pipeline stages. Each bar shows the count and the conversion rate from the previous step.</InfoTip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-0">
              {[
                { label: "Central Catalog", value: totals.total, color: "bg-foreground", tooltip: "All deduped grants in the central catalog, ready for orgs to discover." },
                { label: "Picked Up", value: totals.picked_up, color: "bg-blue-500", tooltip: "Central grants added to at least one organization\u2019s pipeline." },
                { label: "Screened", value: totals.screened, color: "bg-yellow-500", tooltip: "Grants that have been evaluated for eligibility and fit with an organization." },
                { label: "Pending Approval", value: totals.pending_approval, color: "bg-amber-500", tooltip: "Screened grants waiting for team approval before drafting begins." },
                { label: "Proposals", value: totals.proposals, color: "bg-purple-500", tooltip: "Proposal drafts generated from pipeline grants across all organizations." },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex items-center">
                  <div className="flex flex-col items-center px-3 py-2 min-w-[90px]">
                    <div className="flex items-center gap-1 mb-1">
                      <div className={`h-2 w-2 rounded-full ${step.color}`} />
                      <span className="text-xs text-muted-foreground">{step.label}</span>
                      <InfoTip>{step.tooltip}</InfoTip>
                    </div>
                    <span className="text-lg font-bold">{step.value.toLocaleString()}</span>
                    {i > 0 && arr[i - 1].value > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round((step.value / arr[i - 1].value) * 100)}% of prev
                      </span>
                    )}
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== 3. New Grants Per Day (14-day chart) ====== */}
      {daily.length > 0 && daily.some((d) => d.total > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              New Grants Per Day (Last 14 Days)
              <InfoTip>Number of new grants first discovered each day across all sources. Shows crawler activity and source freshness over time.</InfoTip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[180px] w-full">
              <BarChart data={daily}>
                <XAxis
                  dataKey="date"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => {
                    const d = new Date(v + "T00:00:00");
                    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  }}
                />
                <YAxis fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* ====== 4. Stale Source Alerts ====== */}
      {staleSources.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Stale Sources
              <InfoTip>Sources where no grant has been seen in the last 48 hours. The crawler may have failed or the source may be offline.</InfoTip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {staleSources.map((s) => (
                <Link key={s.source} href={`/admin/source-analytics/${encodeURIComponent(s.source)}`}>
                  <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/30">
                    {s.source}
                    <span className="ml-1.5 text-muted-foreground font-normal">
                      last seen {timeAgo(s.last_seen)}
                    </span>
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== 5. Source Breakdown Table ====== */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Source Breakdown
              <InfoTip>Per-source metrics from the central catalog. Click a source to see its individual grants, eligibility scores, and org pickup details.</InfoTip>
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter sources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {search ? "No sources match your filter." : "No source data yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="table-fixed min-w-[800px]">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <SortHeader field="source" sortField={sortField} sortAsc={sortAsc} onSort={handleSort}>Source</SortHeader>
                    <SortHeader field="total" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="right">Total</SortHeader>
                    <SortHeader field="active" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="right">Active</SortHeader>
                    <SortHeader field="new_7d" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="right">New (7d)</SortHeader>
                    <SortHeader field="picked_up" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="right">Picked Up</SortHeader>
                    <SortHeader field="avg_eligibility" sortField={sortField} sortAsc={sortAsc} onSort={handleSort} align="right">Avg Score</SortHeader>
                    <TableHead className="text-right text-xs px-2 py-1.5">Last Seen</TableHead>
                    <TableHead className="text-right text-xs px-2 py-1.5"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.source} className={row.stale ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
                      <TableCell className="font-medium text-xs px-2 py-1.5 truncate" title={row.source}>
                        <div className="flex items-center gap-1.5">
                          {row.stale && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
                          {row.source}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 font-medium">
                        {row.total.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                        <span className="text-green-600">{row.active.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                        {row.new_7d > 0 ? (
                          <span className="text-blue-600">{row.new_7d}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                        {row.picked_up > 0 ? (
                          <span>{row.picked_up} <span className="text-muted-foreground text-[10px]">({row.total > 0 ? Math.round((row.picked_up / row.total) * 100) : 0}%)</span></span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                        {row.eligibility_count > 0 ? (
                          <span className={row.avg_eligibility >= 75 ? "text-green-600" : row.avg_eligibility >= 50 ? "text-amber-600" : "text-red-600"}>
                            {row.avg_eligibility}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs px-2 py-1.5 text-muted-foreground">
                        {timeAgo(row.last_seen)}
                      </TableCell>
                      <TableCell className="text-right text-xs px-2 py-1.5">
                        <Link
                          href={`/admin/source-analytics/${encodeURIComponent(row.source)}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          View <ArrowRight className="h-3 w-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  {totals && (
                    <TableRow className="border-t-2 font-semibold bg-muted/30">
                      <TableCell className="text-xs px-2 py-1.5">All Sources</TableCell>
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">{totals.total.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 text-green-600">{totals.active.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 text-blue-600">{totals.new_7d.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">{totals.picked_up.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">-</TableCell>
                      <TableCell className="text-right text-xs px-2 py-1.5">-</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
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

function Header() {
  return (
    <div>
      <h1 className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight">Source Analytics</h1>
      <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
        Central grant catalog health, source freshness, and org pipeline conversion
      </p>
    </div>
  );
}

function SortHeader({
  field,
  children,
  align = "left",
  sortField,
  onSort,
}: {
  field: SortField;
  children: React.ReactNode;
  align?: "left" | "right";
  sortField: SortField;
  sortAsc?: boolean;
  onSort: (f: SortField) => void;
}) {
  return (
    <TableHead
      className={`cursor-pointer select-none text-xs px-2 py-1.5 ${align === "right" ? "text-right" : ""}`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        {children}
        {sortField === field && (
          <ArrowDownUp className="h-3 w-3 text-foreground shrink-0" />
        )}
      </div>
    </TableHead>
  );
}
