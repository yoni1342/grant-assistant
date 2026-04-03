"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CalendarDays, Filter, CheckCircle2, Clock, PenTool, ExternalLink, ArrowDownUp } from "lucide-react";
import Link from "next/link";

interface GrantRow {
  id: string;
  title: string;
  funder_name: string | null;
  source_url: string | null;
  stage: string | null;
  screening_score: number | null;
  deadline: string | null;
  amount: string | null;
  created_at: string | null;
  is_eligible: boolean;
  is_pending: boolean;
  proposals_count: number;
  in_range: boolean;
}

interface Summary {
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

type SortField = "title" | "is_eligible" | "is_pending" | "proposals_count" | "stage" | "created_at";

function toLocalDate() {
  return new Date().toISOString().split("T")[0];
}

const stageBadgeColor: Record<string, string> = {
  discovery: "bg-gray-100 text-gray-700",
  screening: "bg-blue-100 text-blue-700",
  pending_approval: "bg-amber-100 text-amber-700",
  drafting: "bg-purple-100 text-purple-700",
  submission: "bg-indigo-100 text-indigo-700",
  awarded: "bg-green-100 text-green-700",
  reporting: "bg-teal-100 text-teal-700",
  closed: "bg-gray-200 text-gray-500",
  archived: "bg-gray-200 text-gray-400",
};

export function SourceDetailClient({ source }: { source: string }) {
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  const today = toLocalDate();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchData = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/grant-source-stats/${encodeURIComponent(source)}?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setGrants(data.grants || []);
      setSummary(data.summary || null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    fetchData(fromDate, toDate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleApplyFilter() {
    setActivePreset("custom");
    fetchData(fromDate, toDate);
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
    fetchData(f, preset === "all" ? "" : t);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  const sortedGrants = [...grants].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    switch (sortField) {
      case "title":
        return dir * (a.title || "").localeCompare(b.title || "");
      case "is_eligible":
        return dir * (Number(a.is_eligible) - Number(b.is_eligible));
      case "is_pending":
        return dir * (Number(a.is_pending) - Number(b.is_pending));
      case "proposals_count":
        return dir * (a.proposals_count - b.proposals_count);
      case "stage":
        return dir * (a.stage || "").localeCompare(b.stage || "");
      case "created_at":
        return dir * ((a.created_at || "").localeCompare(b.created_at || ""));
      default:
        return 0;
    }
  });

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
        <h2 className="text-2xl font-semibold">{source}</h2>
        <Card>
          <CardContent className="py-10 text-center text-red-600">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/source-analytics">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-semibold">{source}</h2>
          <p className="text-sm text-muted-foreground">
            {grants.length} grant{grants.length !== 1 ? "s" : ""} from this source
          </p>
        </div>
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
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">From</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">To</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={handleApplyFilter} size="sm">Apply</Button>
            <div className="flex gap-1.5">
              {(["today", "7d", "30d", "all"] as const).map((p) => (
                <Button
                  key={p}
                  variant={activePreset === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreset(p)}
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
      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Raw Fetched</CardTitle>
              <ArrowDownUp className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-700">{summary.raw_fetched_total || "-"}</p>
              {showFiltered && summary.raw_fetched_filtered !== summary.raw_fetched_total && (
                <p className="text-sm font-semibold text-gray-600 mt-1">
                  {summary.raw_fetched_filtered} <span className="text-xs font-normal text-muted-foreground">in range</span>
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Stored</CardTitle>
              <Filter className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{summary.stored_total}</p>
              {showFiltered && summary.stored_filtered !== summary.stored_total && (
                <p className="text-sm font-semibold text-blue-600 mt-1">
                  {summary.stored_filtered} <span className="text-xs font-normal text-muted-foreground">in range</span>
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Eligible</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{summary.eligible_total}</p>
              {showFiltered && summary.eligible_filtered !== summary.eligible_total && (
                <p className="text-sm font-semibold text-green-600 mt-1">
                  {summary.eligible_filtered} <span className="text-xs font-normal text-muted-foreground">in range</span>
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{summary.pending_approval_total}</p>
              {showFiltered && summary.pending_approval_filtered !== summary.pending_approval_total && (
                <p className="text-sm font-semibold text-amber-600 mt-1">
                  {summary.pending_approval_filtered} <span className="text-xs font-normal text-muted-foreground">in range</span>
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Proposals</CardTitle>
              <PenTool className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{summary.proposals_total}</p>
              {showFiltered && summary.proposals_filtered !== summary.proposals_total && (
                <p className="text-sm font-semibold text-purple-600 mt-1">
                  {summary.proposals_filtered} <span className="text-xs font-normal text-muted-foreground">in range</span>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Grants table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Grants from {source}</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
          ) : sortedGrants.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No grants found for this source.</p>
          ) : (
            <div className="[&_[data-slot=table-container]]:overflow-x-hidden">
            <Table className="table-fixed">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <SortHeader field="title">Grant</SortHeader>
                  <TableHead className="text-xs px-2 py-1.5 text-right">Raw Fetched</TableHead>
                  <TableHead className="text-xs px-2 py-1.5 text-right">Stored</TableHead>
                  <SortHeader field="is_eligible" align="right">Eligible</SortHeader>
                  <SortHeader field="is_pending" align="right">Pending</SortHeader>
                  <SortHeader field="proposals_count" align="right">Proposals</SortHeader>
                  <TableHead className="text-xs px-2 py-1.5 text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedGrants.map((g) => (
                  <TableRow key={g.id} className={showFiltered && !g.in_range ? "opacity-40" : ""}>
                    <TableCell className="text-xs px-2 py-1.5 font-medium">
                      {g.source_url ? (
                        <a
                          href={g.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-blue-600"
                          title={g.source_url}
                        >
                          <span className="line-clamp-2">{g.title}</span>
                        </a>
                      ) : (
                        <span className="line-clamp-2" title={g.title}>{g.title}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 text-muted-foreground">
                      -
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 text-green-600">
                      1
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                      {g.is_eligible ? <span className="text-green-600">1</span> : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                      {g.is_pending ? <span className="text-amber-600">1</span> : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                      {g.proposals_count > 0 ? <span className="text-purple-600">{g.proposals_count}</span> : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 text-muted-foreground">
                      -
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                {summary && (
                  <TableRow className="border-t-2 font-semibold bg-muted/30">
                    <TableCell className="text-xs px-2 py-1.5">All Grants</TableCell>
                    <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">{summary.raw_fetched_total || "-"}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">{summary.stored_total}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">{summary.eligible_total}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">{summary.pending_approval_total}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">{summary.proposals_total}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                      {summary.raw_fetched_total > 0
                        ? `${Math.round((summary.stored_total / summary.raw_fetched_total) * 100)}%`
                        : "-"}
                    </TableCell>
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
