"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Search,
  Layers,
  ListOrdered,
  CheckCircle2,
  XCircle,
  Loader2,
  CircleDashed,
  History,
  Calendar,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatTimeAgo, formatTimeUntil, formatClockUTC } from "@/lib/utils/format";

export type RunState = "never" | "running" | "success" | "failed";
export type HistoryOutcome = "success" | "failed" | "quiet";

export interface QueueRow {
  id: string;
  name: string;
  last_grant_fetch_at: string | null;
  queue_position: number;
  batch_size: number;
  hours_until_next_fetch: number;
  estimated_next_fetch_at: string;
  run_state: RunState;
  grants_added_in_run: number;
  last_error_message: string | null;
  last_error_type: string | null;
  last_error_at: string | null;
}

export interface HistoryRow {
  org_id: string;
  org_name: string;
  day: string;
  grants_added: number;
  error_count: number;
  last_error_type: string | null;
  last_error_message: string | null;
  last_error_at: string | null;
  outcome: HistoryOutcome;
}

interface Props {
  rows: QueueRow[];
  errorMessage: string | null;
  history: HistoryRow[];
  historyError: string | null;
  filters: { preset: string; from: string; to: string };
}

export function FetchQueueClient({ rows, errorMessage, history, historyError, filters }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const batchSize = rows[0]?.batch_size ?? 1;
  const totalOrgs = rows.length;
  const neverFetched = rows.filter((r) => !r.last_grant_fetch_at).length;
  const failedCount = rows.filter((r) => r.run_state === "failed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">
          Fetch Queue
        </h1>
        <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase mt-1">
          Hourly rotation — who gets checked for grants next
        </p>
      </div>

      {errorMessage && (
        <Card>
          <CardContent className="py-4 text-sm text-red-500">
            Failed to load queue: {errorMessage}
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <SummaryCard
          icon={<ListOrdered className="h-4 w-4" />}
          label="Approved orgs"
          value={String(totalOrgs)}
        />
        <SummaryCard
          icon={<Layers className="h-4 w-4" />}
          label="Orgs per hour"
          value={String(batchSize)}
          sub={`ceil(${totalOrgs} / 24)`}
        />
        <SummaryCard
          icon={<Clock className="h-4 w-4" />}
          label="Never fetched"
          value={String(neverFetched)}
          sub={neverFetched > 0 ? "ahead of queue" : "all rotated"}
        />
        <SummaryCard
          icon={<XCircle className="h-4 w-4" />}
          label="Failed last run"
          value={String(failedCount)}
          sub={failedCount > 0 ? "needs attention" : "clean"}
        />
      </div>

      {/* Queue table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Queue order</CardTitle>
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organization"
              className="pl-7 h-8 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TooltipProvider delayDuration={150}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Last run</TableHead>
                  <TableHead>Last checked</TableHead>
                  <TableHead>Next check</TableHead>
                  <TableHead>Scheduled fire</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      {rows.length === 0 ? "No approved organizations." : "No matches."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {r.queue_position}
                      </TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-xs">
                        <RunStateCell row={r} />
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.last_grant_fetch_at ? (
                          <span>{formatTimeAgo(r.last_grant_fetch_at)}</span>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-mono uppercase">
                            never
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatTimeUntil(r.estimated_next_fetch_at)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatClockUTC(r.estimated_next_fetch_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Execution History */}
      <ExecutionHistory history={history} error={historyError} filters={filters} />
    </div>
  );
}

function ExecutionHistory({
  history,
  error,
  filters,
}: {
  history: HistoryRow[];
  error: string | null;
  filters: { preset: string; from: string; to: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  function setParam(updates: Record<string, string | null>) {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === "") p.delete(k);
      else p.set(k, v);
    });
    startTransition(() => router.replace(`?${p.toString()}`));
  }

  // Group by org for the per-org expandable view.
  const byOrg = useMemo(() => {
    const m = new Map<string, { name: string; days: HistoryRow[] }>();
    history.forEach((h) => {
      if (!m.has(h.org_id)) m.set(h.org_id, { name: h.org_name, days: [] });
      m.get(h.org_id)!.days.push(h);
    });
    return Array.from(m.entries()).map(([id, v]) => ({
      org_id: id,
      org_name: v.name,
      days: v.days,
      total_grants: v.days.reduce((a, b) => a + b.grants_added, 0),
      total_errors: v.days.reduce((a, b) => a + b.error_count, 0),
      status:
        v.days.some((d) => d.outcome === "failed")
          ? "failed"
          : v.days.some((d) => d.outcome === "success")
          ? "success"
          : "quiet",
    }));
  }, [history]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? byOrg.filter((o) => o.org_name.toLowerCase().includes(q))
      : byOrg;
    return [...list].sort((a, b) => {
      // failed first, then by total_grants desc
      if (a.status === "failed" && b.status !== "failed") return -1;
      if (b.status === "failed" && a.status !== "failed") return 1;
      return b.total_grants - a.total_grants;
    });
  }, [byOrg, search]);

  const toggle = (id: string) => {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const presetBtns: { value: string; label: string }[] = [
    { value: "yesterday", label: "Yesterday" },
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "custom", label: "Custom" },
  ];

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" /> Execution History
            </CardTitle>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Per-org outcomes derived from grants added + errors · {filters.from} → {filters.to} UTC
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organization"
              className="pl-7 h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-border p-0.5">
            {presetBtns.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  setParam({
                    preset: p.value,
                    from: p.value === "custom" ? filters.from : null,
                    to: p.value === "custom" ? filters.to : null,
                  });
                }}
                className={`px-2.5 py-1 text-xs font-mono uppercase rounded ${
                  filters.preset === p.value
                    ? "bg-foreground/[0.06] text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {filters.preset === "custom" && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="date"
                value={filters.from}
                onChange={(e) => setParam({ preset: "custom", from: e.target.value, to: filters.to })}
                className="h-8 w-[140px] text-xs"
              />
              <span className="text-muted-foreground text-xs">→</span>
              <Input
                type="date"
                value={filters.to}
                onChange={(e) => setParam({ preset: "custom", from: filters.from, to: e.target.value })}
                className="h-8 w-[140px] text-xs"
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <div className="py-4 px-6 text-sm text-red-500">Failed to load history: {error}</div>
        )}
        {!error && (
          <TooltipProvider delayDuration={150}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Active days</TableHead>
                  <TableHead>Grants added</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No activity in this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((o) => {
                    const open = expanded.has(o.org_id);
                    return (
                      <>
                        <TableRow
                          key={o.org_id}
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() => toggle(o.org_id)}
                        >
                          <TableCell className="text-muted-foreground">
                            {open ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{o.org_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {o.days.length}
                          </TableCell>
                          <TableCell className="text-xs">{o.total_grants}</TableCell>
                          <TableCell className="text-xs">
                            {o.total_errors > 0 ? (
                              <span className="text-red-600 dark:text-red-400">
                                {o.total_errors}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <OutcomeBadge outcome={o.status as HistoryOutcome} />
                          </TableCell>
                        </TableRow>
                        {open && (
                          <TableRow key={o.org_id + ":detail"} className="bg-muted/20 hover:bg-muted/20">
                            <TableCell></TableCell>
                            <TableCell colSpan={5} className="py-3">
                              <Table className="text-xs">
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="h-7">Day (UTC)</TableHead>
                                    <TableHead className="h-7">Grants</TableHead>
                                    <TableHead className="h-7">Errors</TableHead>
                                    <TableHead className="h-7">Outcome</TableHead>
                                    <TableHead className="h-7">Details</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {o.days.map((d) => (
                                    <TableRow key={o.org_id + ":" + d.day}>
                                      <TableCell className="py-1 font-mono">{d.day}</TableCell>
                                      <TableCell className="py-1">{d.grants_added}</TableCell>
                                      <TableCell className="py-1">
                                        {d.error_count > 0 ? (
                                          <span className="text-red-600 dark:text-red-400">
                                            {d.error_count}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">0</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="py-1">
                                        <OutcomeBadge outcome={d.outcome} />
                                      </TableCell>
                                      <TableCell className="py-1">
                                        {d.last_error_message ? (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="inline-flex items-center gap-1 cursor-help text-red-600 dark:text-red-400">
                                                {d.last_error_type || "error"}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-sm">
                                              <div className="font-mono text-xs whitespace-pre-wrap break-words text-red-600 dark:text-red-400">
                                                {d.last_error_message}
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        ) : (
                                          <span className="text-muted-foreground">—</span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}

function OutcomeBadge({ outcome }: { outcome: HistoryOutcome }) {
  if (outcome === "failed") {
    return (
      <Badge
        variant="secondary"
        className="text-[10px] font-mono uppercase bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
      >
        failed
      </Badge>
    );
  }
  if (outcome === "success") {
    return (
      <Badge
        variant="secondary"
        className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      >
        success
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] font-mono uppercase">
      quiet
    </Badge>
  );
}

function RunStateCell({ row }: { row: QueueRow }) {
  const { run_state, grants_added_in_run, last_error_message, last_error_type, last_error_at } = row;

  if (run_state === "never") {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <CircleDashed className="h-3.5 w-3.5" /> not yet run
      </span>
    );
  }

  if (run_state === "running") {
    return (
      <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> running…
        {grants_added_in_run > 0 && (
          <span className="text-muted-foreground">
            · {grants_added_in_run} {grants_added_in_run === 1 ? "grant" : "grants"} so far
          </span>
        )}
      </span>
    );
  }

  if (run_state === "success") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        success
        <span className="text-muted-foreground">
          · {grants_added_in_run} {grants_added_in_run === 1 ? "grant" : "grants"}
        </span>
      </span>
    );
  }

  // failed
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 cursor-help">
          <XCircle className="h-3.5 w-3.5" />
          failed
          {last_error_type && (
            <Badge
              variant="secondary"
              className="text-[9px] font-mono uppercase bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {last_error_type}
            </Badge>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm">
        <div className="space-y-1 text-xs">
          {last_error_at && (
            <div className="text-muted-foreground font-mono uppercase tracking-wide">
              {formatTimeAgo(last_error_at)}
            </div>
          )}
          <div className="font-mono whitespace-pre-wrap break-words text-red-600 dark:text-red-400">
            {last_error_message || "(no message)"}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="font-mono text-[10px] uppercase tracking-wide">{label}</span>
        </div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {sub && (
          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-wide">
            {sub}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
