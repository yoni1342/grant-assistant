"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatTimeAgo, formatTimeUntil, formatClockUTC } from "@/lib/utils/format";
import { DateRangePills } from "./date-range-pills";

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
  const router = useRouter();

  // Live updates: re-run the server fetch every 5s while the tab is visible.
  // run_state and grants_added_in_run change as workflows progress; this is
  // what makes "Running…" appear/disappear without a manual refresh.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => router.refresh(), 5000);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

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
        <p className="text-xs text-muted-foreground mt-2">
          Only <span className="font-medium text-foreground">Professional</span> and{" "}
          <span className="font-medium text-foreground">Agency</span> orgs (plus testers)
          appear here. Free tier is excluded — free orgs fetch grants manually via Discovery.
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
          label="Eligible orgs"
          value={String(totalOrgs)}
          sub="professional + agency"
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

      {/* Single merged table that switches by date preset */}
      <QueueHistoryTable
        history={history}
        queueRows={rows}
        error={historyError}
        filters={filters}
      />
    </div>
  );
}

function QueueHistoryTable({
  history,
  queueRows,
  error,
  filters,
}: {
  history: HistoryRow[];
  queueRows: QueueRow[];
  error: string | null;
  filters: { preset: string; from: string; to: string };
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const isLive = filters.preset === "live";

  // Aggregate per-org from history rows; queue state used for Next/Scheduled.
  const historyByOrg = useMemo(() => {
    const queueById = new Map(queueRows.map((q) => [q.id, q]));
    const m = new Map<string, { name: string; days: HistoryRow[] }>();
    history.forEach((h) => {
      if (!m.has(h.org_id)) m.set(h.org_id, { name: h.org_name, days: [] });
      m.get(h.org_id)!.days.push(h);
    });
    return Array.from(m.entries()).map(([id, v]) => {
      const sortedDays = [...v.days].sort((a, b) =>
        a.day < b.day ? 1 : a.day > b.day ? -1 : 0,
      );
      const lastActive =
        sortedDays.find((d) => d.outcome !== "quiet") || sortedDays[0];
      const totalGrants = v.days.reduce((a, b) => a + b.grants_added, 0);
      const totalErrors = v.days.reduce((a, b) => a + b.error_count, 0);
      const status: HistoryOutcome = v.days.some((d) => d.outcome === "failed")
        ? "failed"
        : v.days.some((d) => d.outcome === "success")
          ? "success"
          : "quiet";
      return {
        org_id: id,
        org_name: v.name,
        total_grants: totalGrants,
        total_errors: totalErrors,
        status,
        last_active_day: lastActive?.day ?? null,
        last_active_grants: lastActive?.grants_added ?? 0,
        last_active_outcome: lastActive?.outcome ?? "quiet",
        queue: queueById.get(id) ?? null,
      };
    });
  }, [history, queueRows]);

  const liveFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? queueRows.filter((r) => r.name.toLowerCase().includes(q))
      : queueRows;
    return [...list].sort((a, b) => a.queue_position - b.queue_position);
  }, [queueRows, search]);

  const historyFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? historyByOrg.filter((o) => o.org_name.toLowerCase().includes(q))
      : historyByOrg;
    return [...list].sort((a, b) => {
      if (a.status === "failed" && b.status !== "failed") return -1;
      if (b.status === "failed" && a.status !== "failed") return 1;
      return b.total_grants - a.total_grants;
    });
  }, [historyByOrg, search]);

  function buildOrgHref(orgId: string) {
    const p = new URLSearchParams();
    p.set("preset", filters.preset);
    if (filters.preset === "custom") {
      p.set("from", filters.from);
      p.set("to", filters.to);
    }
    return `/admin/fetch-queue/${orgId}?${p.toString()}`;
  }

  const headerLabel = isLive
    ? "Queue order — live"
    : `Execution history · ${filters.from} → ${filters.to} UTC`;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" /> {isLive ? "Queue order" : "Execution history"}
            </CardTitle>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {headerLabel}
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

        <DateRangePills
          preset={filters.preset}
          from={filters.from}
          to={filters.to}
        />
      </CardHeader>
      <CardContent className="p-0">
        {!isLive && error && (
          <div className="py-4 px-6 text-sm text-red-500">
            Failed to load history: {error}
          </div>
        )}
        {(isLive || !error) && (
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
                {isLive ? (
                  liveFiltered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        {queueRows.length === 0
                          ? "No approved organizations."
                          : "No matches."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    liveFiltered.map((r) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => router.push(buildOrgHref(r.id))}
                      >
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
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono uppercase"
                            >
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
                  )
                ) : historyFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No activity in this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  historyFiltered.map((o, idx) => (
                    <TableRow
                      key={o.org_id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => router.push(buildOrgHref(o.org_id))}
                    >
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">{o.org_name}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2">
                          <OutcomeBadge outcome={o.last_active_outcome} />
                          <span className="text-muted-foreground">
                            {o.last_active_grants}{" "}
                            {o.last_active_grants === 1 ? "grant" : "grants"}
                          </span>
                          {o.total_errors > 0 && (
                            <span className="text-red-600 dark:text-red-400">
                              · {o.total_errors} err
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {o.last_active_day || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {o.queue ? (
                          formatTimeUntil(o.queue.estimated_next_fetch_at)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {o.queue
                          ? formatClockUTC(o.queue.estimated_next_fetch_at)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
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
