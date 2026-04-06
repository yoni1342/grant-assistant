"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
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
import { Input } from "@/components/ui/input";
import { Database, Filter, CheckCircle2, Clock, PenTool, ArrowDownUp, CalendarDays, ExternalLink } from "lucide-react";
import Link from "next/link";

interface SourceStat {
  source: string;
  raw_fetched_total: number;
  raw_fetched_filtered: number;
  stored_total: number;
  stored_filtered: number;
  eligible_total: number;
  eligible_filtered: number;
  pending_approval_total: number;
  pending_approval_filtered: number;
  proposals_total: number;
  proposals_filtered: number;
}

interface Totals {
  raw_fetched_total: number;
  raw_fetched_filtered: number;
  stored_total: number;
  stored_filtered: number;
  eligible_total: number;
  eligible_filtered: number;
  pending_approval_total: number;
  pending_approval_filtered: number;
  proposals_total: number;
  proposals_filtered: number;
}

type SortField =
  | "source"
  | "raw_fetched_total"
  | "stored_total"
  | "eligible_total"
  | "pending_approval_total"
  | "proposals_total";

function toLocalDate() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

/** If source is a JSON string like {"url":"..."}, extract just the readable part */
function cleanSource(source: string): string {
  if (!source.startsWith("{")) return source;
  try {
    const parsed = JSON.parse(source);
    if (parsed.url) {
      const hostname = new URL(parsed.url).hostname.replace("www.", "");
      return hostname;
    }
  } catch {
    // not JSON
  }
  return source;
}

export function SourceAnalyticsClient() {
  const [sources, setSources] = useState<SourceStat[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("stored_total");
  const [sortAsc, setSortAsc] = useState(false);
  const [activePreset, setActivePreset] = useState<string>("today");

  const today = toLocalDate();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const hasFetched = useRef(false);

  const fetchStats = useCallback(async (from: string, to: string) => {
    if (!hasFetched.current) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/grant-source-stats?${params}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setSources(data.sources || []);
      setTotals(data.totals || null);
      hasFetched.current = true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fromRef = useRef(fromDate);
  const toRef = useRef(toDate);
  useEffect(() => { fromRef.current = fromDate; }, [fromDate]);
  useEffect(() => { toRef.current = toDate; }, [toDate]);

  useEffect(() => {
    fetchStats(fromDate, toDate);

    const supabase = createClient();
    const channel = supabase
      .channel("source-analytics-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grant_source_stats" },
        () => fetchStats(fromRef.current, toRef.current)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grants" },
        () => fetchStats(fromRef.current, toRef.current)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleApplyFilter() {
    setActivePreset("custom");
    fetchStats(fromDate, toDate);
  }

  function setPreset(preset: "today" | "7d" | "30d" | "all") {
    setActivePreset(preset);
    const t = toLocalDate();
    let f = "";
    if (preset === "today") {
      f = t;
    } else if (preset === "7d") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      f = d.toISOString().split("T")[0];
    } else if (preset === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      f = d.toISOString().split("T")[0];
    } else {
      f = "";
    }
    setFromDate(f);
    setToDate(preset === "all" ? "" : t);
    fetchStats(f, preset === "all" ? "" : t);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  const sortedSources = [...sources].sort((a, b) => {
    if (sortField === "source") {
      return sortAsc
        ? a.source.localeCompare(b.source)
        : b.source.localeCompare(a.source);
    }
    const aVal = a[sortField];
    const bVal = b[sortField];
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  // Only show filtered column when filter narrows down from all-time (i.e. not "all" preset)
  const showFiltered = activePreset !== "all";

  function SortHeader({ field, children, align = "left" }: { field: SortField; children: React.ReactNode; align?: "left" | "right" }) {
    return (
      <TableHead
        className={`cursor-pointer select-none text-xs px-2 py-1.5 ${align === "right" ? "text-right" : ""}`}
        onClick={() => handleSort(field)}
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

  function StatCell({ total, filtered }: { total: number; filtered: number }) {
    // When showing filtered data and it differs from total, show "filtered / total"
    if (showFiltered && filtered !== total) {
      return (
        <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
          <span className="font-medium">{filtered.toLocaleString()}</span>
          <span className="text-muted-foreground"> / {total.toLocaleString()}</span>
        </TableCell>
      );
    }
    return (
      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
        <span className="font-medium">{total.toLocaleString()}</span>
      </TableCell>
    );
  }

  function filterLabel() {
    if (!fromDate && !toDate) return "All time";
    if (fromDate === toDate) return fromDate;
    if (fromDate && toDate) return `${fromDate} – ${toDate}`;
    if (fromDate) return `From ${fromDate}`;
    return `Until ${toDate}`;
  }

  if (error && !loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Grant Source Analytics</h2>
        <Card>
          <CardContent className="py-10 text-center text-red-600">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Grant Source Analytics</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Pipeline funnel from raw fetch to proposal generation, broken down by source.
        </p>
      </div>

      {/* Date filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Date Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-2 sm:gap-3">
            <div className="w-full sm:w-auto">
              <label className="text-xs text-muted-foreground mb-1 block">From</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full sm:w-40"
              />
            </div>
            <div className="w-full sm:w-auto">
              <label className="text-xs text-muted-foreground mb-1 block">To</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full sm:w-40"
              />
            </div>
            <Button onClick={handleApplyFilter} size="sm" className="w-full sm:w-auto">
              Apply
            </Button>
            <div className="flex gap-1.5 w-full sm:w-auto">
              {(["today", "7d", "30d", "all"] as const).map((p) => (
                <Button
                  key={p}
                  variant={activePreset === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreset(p)}
                  className="flex-1 sm:flex-none"
                >
                  {p === "today" ? "Today" : p === "7d" ? "7 days" : p === "30d" ? "30 days" : "All time"}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Showing: <span className="font-medium text-foreground">{filterLabel()}</span>
          </p>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {totals && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Raw Fetched
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totals.raw_fetched_total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">total so far</p>
              {showFiltered && totals.raw_fetched_filtered !== totals.raw_fetched_total && (
                <p className="text-sm font-semibold text-blue-600 mt-1">
                  {totals.raw_fetched_filtered.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground ml-1">in range</span>
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Stored (Post-Filter)
              </CardTitle>
              <Filter className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{totals.stored_total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">total so far</p>
              {showFiltered && totals.stored_filtered !== totals.stored_total && (
                <p className="text-sm font-semibold text-blue-600 mt-1">
                  {totals.stored_filtered.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground ml-1">in range</span>
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Passed Eligibility
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{totals.eligible_total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">total so far</p>
              {showFiltered && totals.eligible_filtered !== totals.eligible_total && (
                <p className="text-sm font-semibold text-green-600 mt-1">
                  {totals.eligible_filtered.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground ml-1">in range</span>
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Approval
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{totals.pending_approval_total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">total so far</p>
              {showFiltered && totals.pending_approval_filtered !== totals.pending_approval_total && (
                <p className="text-sm font-semibold text-amber-600 mt-1">
                  {totals.pending_approval_filtered.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground ml-1">in range</span>
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Proposals Generated
              </CardTitle>
              <PenTool className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{totals.proposals_total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">total so far</p>
              {showFiltered && totals.proposals_filtered !== totals.proposals_total && (
                <p className="text-sm font-semibold text-purple-600 mt-1">
                  {totals.proposals_filtered.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground ml-1">in range</span>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Conversion rate summary */}
      {totals && totals.raw_fetched_total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Funnel Conversion Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Raw → Stored:</span>{" "}
                <span className="font-medium">
                  {((totals.stored_total / totals.raw_fetched_total) * 100).toFixed(1)}%
                </span>
              </div>
              {totals.stored_total > 0 && (
                <div>
                  <span className="text-muted-foreground">Stored → Eligible:</span>{" "}
                  <span className="font-medium">
                    {((totals.eligible_total / totals.stored_total) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              {totals.eligible_total > 0 && (
                <div>
                  <span className="text-muted-foreground">Eligible → Proposal:</span>{" "}
                  <span className="font-medium">
                    {((totals.proposals_total / totals.eligible_total) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-source table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Per-Source Breakdown</CardTitle>
            {showFiltered && (
              <span className="text-[11px] text-muted-foreground">
                Shows <span className="font-medium">filtered / total</span> when different
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Loading...
            </div>
          ) : sortedSources.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No source data yet. Stats will appear after the first grant fetch runs.
            </p>
          ) : (
            <div className="overflow-x-auto">
            <Table className="table-fixed min-w-[700px]">
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <SortHeader field="source">Source</SortHeader>
                  <SortHeader field="raw_fetched_total" align="right">Raw Fetched</SortHeader>
                  <SortHeader field="stored_total" align="right">Stored</SortHeader>
                  <SortHeader field="eligible_total" align="right">Eligible</SortHeader>
                  <SortHeader field="pending_approval_total" align="right">Pending</SortHeader>
                  <SortHeader field="proposals_total" align="right">Proposals</SortHeader>
                  <TableHead className="text-right text-xs px-2 py-1.5">Rate</TableHead>
                  <TableHead className="text-right text-xs px-2 py-1.5"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSources.map((row) => (
                  <TableRow key={row.source}>
                    <TableCell className="font-medium text-xs px-2 py-1.5 truncate" title={row.source}>
                      {cleanSource(row.source)}
                    </TableCell>
                    <StatCell total={row.raw_fetched_total} filtered={row.raw_fetched_filtered} />
                    <StatCell total={row.stored_total} filtered={row.stored_filtered} />
                    <StatCell total={row.eligible_total} filtered={row.eligible_filtered} />
                    <StatCell total={row.pending_approval_total} filtered={row.pending_approval_filtered} />
                    <StatCell total={row.proposals_total} filtered={row.proposals_filtered} />
                    <TableCell className="text-right tabular-nums text-muted-foreground text-xs px-2 py-1.5">
                      {row.raw_fetched_total > 0
                        ? `${((row.stored_total / row.raw_fetched_total) * 100).toFixed(0)}%`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right text-xs px-2 py-1.5">
                      <Link
                        href={`/admin/source-analytics/${encodeURIComponent(row.source)}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                {totals && (
                  <TableRow className="border-t-2 font-semibold bg-muted/30">
                    <TableCell className="text-xs px-2 py-1.5">All Sources</TableCell>
                    <StatCell total={totals.raw_fetched_total} filtered={totals.raw_fetched_filtered} />
                    <StatCell total={totals.stored_total} filtered={totals.stored_filtered} />
                    <StatCell total={totals.eligible_total} filtered={totals.eligible_filtered} />
                    <StatCell total={totals.pending_approval_total} filtered={totals.pending_approval_filtered} />
                    <StatCell total={totals.proposals_total} filtered={totals.proposals_filtered} />
                    <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                      {totals.raw_fetched_total > 0
                        ? `${((totals.stored_total / totals.raw_fetched_total) * 100).toFixed(0)}%`
                        : "-"}
                    </TableCell>
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
