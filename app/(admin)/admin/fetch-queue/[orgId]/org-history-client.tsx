"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  History,
  Layers,
  List,
  Loader2,
  Package,
  Percent,
  XCircle,
} from "lucide-react";
import {
  formatClockUTC,
  formatTimeAgo,
  formatTimeUntil,
} from "@/lib/utils/format";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { DateRangePills } from "../date-range-pills";

export type DayOutcome = "success" | "failed" | "quiet";

export interface DayRow {
  day: string;
  grants_added: number;
  error_count: number;
  last_error_type: string | null;
  last_error_message: string | null;
  last_error_at: string | null;
  outcome: DayOutcome;
}

export interface ErrorRow {
  id: string;
  workflow_name: string | null;
  failed_node: string | null;
  error_type: string | null;
  error_message: string | null;
  execution_id: string | null;
  execution_mode: string | null;
  execution_url: string | null;
  created_at: string;
}

export interface GrantRow {
  id: string;
  title: string;
  funder_name: string | null;
  stage:
    | "discovery"
    | "screening"
    | "pending_approval"
    | "drafting"
    | "submission"
    | "awarded"
    | "reporting"
    | "closed"
    | "archived";
  screening_score: number | null;
  screening_label: string | null;
  screening_notes: string | null;
  source: string | null;
  source_url: string | null;
  deadline: string | null;
  amount: string | null;
  description: string | null;
  concerns: string[];
  recommendations: unknown[];
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

interface QueueRow {
  queue_position: number;
  hours_until_next_fetch: number;
  estimated_next_fetch_at: string;
  last_grant_fetch_at: string | null;
  run_state: "never" | "running" | "success" | "failed";
  grants_added_in_run: number;
  last_error_type: string | null;
  last_error_message: string | null;
  last_error_at: string | null;
}

interface OrgMeta {
  name: string;
  plan: string | null;
  status: string | null;
  sector: string | null;
  email: string | null;
  website: string | null;
  created_at: string | null;
  is_tester: boolean;
  subscription_status: string | null;
}

export function OrgFetchHistoryClient({
  orgId,
  orgMeta,
  queueRow,
  days,
  lifetimeGrants,
  historyError,
  errorRows,
  errorRowsError,
  grantRows,
  grantRowsError,
  filters,
}: {
  orgId: string;
  orgMeta: OrgMeta;
  queueRow: QueueRow | null;
  days: DayRow[];
  lifetimeGrants: number;
  historyError: string | null;
  errorRows: ErrorRow[];
  errorRowsError: string | null;
  grantRows: GrantRow[];
  grantRowsError: string | null;
  filters: { preset: string; from: string; to: string };
}) {
  const totalGrants = days.reduce((a, b) => a + b.grants_added, 0);
  const totalErrors = days.reduce((a, b) => a + b.error_count, 0);
  const activeDays = days.filter((d) => d.outcome !== "quiet").length;
  const successDays = days.filter((d) => d.outcome === "success").length;
  const failedDays = days.filter((d) => d.outcome === "failed").length;
  const successRate =
    activeDays > 0 ? Math.round((successDays / activeDays) * 100) : null;

  const maxGrants = Math.max(0, ...days.map((d) => d.grants_added));

  // Chart data — chronological (oldest → newest) so the time axis reads left-to-right.
  // `days` from the server is desc by day; reverse for the chart.
  const chartPoints = [...days]
    .reverse()
    .map((d) => ({
      day: d.day,
      grants: d.grants_added,
      errors: d.error_count,
    }));

  const showQueueError =
    queueRow?.run_state === "failed" && queueRow.last_error_message;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/admin/fetch-queue${
            filters.preset === "live" ? "" : `?preset=${filters.preset}`
          }`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground self-start"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to fetch queue
        </Link>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            {orgMeta.name}
          </h1>
          {orgMeta.plan && (
            <Badge variant="secondary" className="font-mono uppercase text-[10px]">
              {orgMeta.plan}
            </Badge>
          )}
          {orgMeta.is_tester && (
            <Badge variant="outline" className="font-mono uppercase text-[10px]">
              tester
            </Badge>
          )}
          {orgMeta.status && (
            <Badge
              variant="outline"
              className={`font-mono uppercase text-[10px] ${
                orgMeta.status === "approved"
                  ? "border-emerald-300 text-emerald-700 dark:text-emerald-400"
                  : orgMeta.status === "rejected"
                    ? "border-red-300 text-red-700 dark:text-red-400"
                    : ""
              }`}
            >
              {orgMeta.status}
            </Badge>
          )}
          {queueRow && (
            <Badge variant="outline" className="font-mono uppercase text-[10px]">
              queue #{queueRow.queue_position}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {orgMeta.sector && <span>{orgMeta.sector}</span>}
          {orgMeta.email && (
            <a
              href={`mailto:${orgMeta.email}`}
              className="hover:text-foreground"
            >
              {orgMeta.email}
            </a>
          )}
          {orgMeta.website && (
            <a
              href={normalizeUrl(orgMeta.website)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              {orgMeta.website}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {orgMeta.created_at && (
            <span className="font-mono uppercase tracking-wide">
              registered {new Date(orgMeta.created_at).toLocaleDateString()}
            </span>
          )}
          <Link
            href={`/admin/organizations/${orgId}`}
            className="inline-flex items-center gap-1 text-xs hover:text-foreground"
          >
            View full org profile
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {showQueueError && (
        <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] uppercase tracking-wide font-semibold text-red-700 dark:text-red-300">
                    Latest run failed
                  </span>
                  {queueRow?.last_error_type && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-mono uppercase bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                    >
                      {queueRow.last_error_type}
                    </Badge>
                  )}
                  {queueRow?.last_error_at && (
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {formatTimeAgo(queueRow.last_error_at)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap break-words font-mono">
                  {queueRow!.last_error_message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard
          icon={<Layers className="h-4 w-4" />}
          label="Queue position"
          value={queueRow ? `#${queueRow.queue_position}` : "—"}
          sub={
            queueRow?.last_grant_fetch_at
              ? `last ${formatTimeAgo(queueRow.last_grant_fetch_at)}`
              : "never fetched"
          }
        />
        <SummaryCard
          icon={<Clock className="h-4 w-4" />}
          label="Next check"
          value={
            queueRow?.estimated_next_fetch_at
              ? formatTimeUntil(queueRow.estimated_next_fetch_at)
              : "—"
          }
          sub={
            queueRow?.estimated_next_fetch_at
              ? formatClockUTC(queueRow.estimated_next_fetch_at)
              : undefined
          }
        />
        <SummaryCard
          icon={<Package className="h-4 w-4" />}
          label="Grants in range"
          value={String(totalGrants)}
          sub={`${lifetimeGrants} lifetime`}
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Active days"
          value={String(activeDays)}
          sub={`${successDays} ok · ${failedDays} failed`}
        />
        <SummaryCard
          icon={<Percent className="h-4 w-4" />}
          label="Success rate"
          value={successRate == null ? "—" : `${successRate}%`}
          sub={
            successRate == null
              ? "no active days"
              : successRate === 100
                ? "all clean"
                : `${activeDays - successDays} bad days`
          }
        />
        <SummaryCard
          icon={
            queueRow?.run_state === "running" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )
          }
          label="Errors in range"
          value={String(totalErrors)}
          sub={
            queueRow?.run_state === "running"
              ? `running · ${queueRow.grants_added_in_run} so far`
              : `${days.length} days scanned`
          }
        />
      </div>

      {/* Date filter — applies to both charts and the daily-breakdown table */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Date range ·{" "}
          {filters.preset === "live"
            ? "today (live)"
            : `${filters.from} → ${filters.to} UTC`}
        </p>
        <DateRangePills
          preset={filters.preset}
          from={filters.from}
          to={filters.to}
        />
      </div>

      {/* Two execution graphs side-by-side: grants per day + errors per day */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ExecutionLineChart
          title="Grants added"
          subtitle="grants picked up per day in range"
          dataKey="grants"
          chartConfig={grantsChartConfig}
          points={chartPoints}
          emptyText="No grants added in this range."
        />
        <ExecutionLineChart
          title="Errors"
          subtitle="error count per day in range"
          dataKey="errors"
          chartConfig={errorsChartConfig}
          points={chartPoints}
          emptyText="No errors in this range."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Daily breakdown
          </CardTitle>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            {filters.preset === "live"
              ? "Today (live)"
              : `${filters.from} → ${filters.to} UTC`}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {historyError && (
            <div className="py-4 px-6 text-sm text-red-500">
              Failed to load history: {historyError}
            </div>
          )}
          {!historyError && (
            <TooltipProvider delayDuration={150}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day (UTC)</TableHead>
                    <TableHead>Grants added</TableHead>
                    <TableHead className="w-[180px]">Volume</TableHead>
                    <TableHead>Errors</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {days.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No activity in this range.
                      </TableCell>
                    </TableRow>
                  ) : (
                    days.map((d) => (
                      <TableRow key={d.day}>
                        <TableCell className="font-mono text-xs">
                          {d.day}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {d.grants_added}
                        </TableCell>
                        <TableCell>
                          <VolumeBar value={d.grants_added} max={maxGrants} />
                        </TableCell>
                        <TableCell className="text-xs">
                          {d.error_count > 0 ? (
                            <span className="text-red-600 dark:text-red-400 font-mono">
                              {d.error_count}
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-mono">
                              0
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <OutcomeBadge outcome={d.outcome} />
                        </TableCell>
                        <TableCell className="text-xs">
                          {d.last_error_message ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1 cursor-help text-red-600 dark:text-red-400">
                                  {d.last_error_type || "error"}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-sm"
                              >
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
                    ))
                  )}
                </TableBody>
              </Table>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      <ErrorListSection
        errorRows={errorRows}
        errorRowsError={errorRowsError}
        filters={filters}
      />

      <GrantsListSection
        grants={grantRows}
        grantsError={grantRowsError}
        filters={filters}
      />
    </div>
  );
}

interface ErrorGroup {
  key: string;
  workflow_name: string | null;
  failed_node: string | null;
  error_type: string;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  sample_message: string | null;
  sample_execution_url: string | null;
}

function ErrorListSection({
  errorRows,
  errorRowsError,
  filters,
}: {
  errorRows: ErrorRow[];
  errorRowsError: string | null;
  filters: { preset: string; from: string; to: string };
}) {
  const [selected, setSelected] = useState<ErrorRow | null>(null);
  const [view, setView] = useState<"grouped" | "raw">("grouped");

  // Aggregate by workflow + node + type. Mirrors the system-errors grouped
  // view's intent (one row per recurring failure shape) but bounded to this
  // org's rows in the active window — no fingerprint needed since rows are
  // already org-scoped.
  const groups: ErrorGroup[] = useMemo(() => {
    const map = new Map<string, ErrorGroup>();
    // errorRows arrive desc by created_at → first row encountered for a key
    // is the most-recent occurrence (use it as the sample).
    for (const r of errorRows) {
      const type = r.error_type ?? "unknown";
      const key = `${r.workflow_name ?? ""}|${r.failed_node ?? ""}|${type}`;
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          workflow_name: r.workflow_name,
          failed_node: r.failed_node,
          error_type: type,
          occurrences: 0,
          first_seen_at: r.created_at,
          last_seen_at: r.created_at,
          sample_message: r.error_message,
          sample_execution_url: r.execution_url,
        };
        map.set(key, g);
      }
      g.occurrences += 1;
      if (r.created_at < g.first_seen_at) g.first_seen_at = r.created_at;
      if (r.created_at > g.last_seen_at) g.last_seen_at = r.created_at;
    }
    return Array.from(map.values()).sort((a, b) =>
      a.last_seen_at < b.last_seen_at ? 1 : -1,
    );
  }, [errorRows]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Errors in range
            </CardTitle>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {filters.preset === "live"
                ? "Today (live)"
                : `${filters.from} → ${filters.to} UTC`}
              {" · "}
              {errorRows.length} {errorRows.length === 1 ? "error" : "errors"}
              {view === "grouped" && groups.length > 0 && (
                <> · {groups.length} unique</>
              )}
              {errorRows.length === 500 && " (capped)"}
            </p>
          </div>
          <div className="inline-flex rounded-md border border-border p-0.5">
            <button
              onClick={() => setView("grouped")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono uppercase rounded ${
                view === "grouped"
                  ? "bg-foreground/[0.06] text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3 w-3" /> Grouped
            </button>
            <button
              onClick={() => setView("raw")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono uppercase rounded ${
                view === "raw"
                  ? "bg-foreground/[0.06] text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-3 w-3" /> Raw
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {errorRowsError && (
          <div className="py-4 px-6 text-sm text-red-500">
            Failed to load errors: {errorRowsError}
          </div>
        )}
        {!errorRowsError && errorRows.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No errors in this range.
          </div>
        )}
        {!errorRowsError && errorRows.length > 0 && view === "raw" && (
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Node</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errorRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell
                    className="text-xs text-muted-foreground whitespace-nowrap"
                    title={new Date(r.created_at).toLocaleString()}
                  >
                    {formatTimeAgo(r.created_at)}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {r.workflow_name || (
                      <span className="italic text-muted-foreground">
                        unknown
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.failed_node || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-mono uppercase ${typeBadgeClass(r.error_type || "unknown")}`}
                    >
                      {r.error_type || "unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs max-w-[360px]">
                    <span className="line-clamp-2 text-red-600 dark:text-red-400 font-mono">
                      {r.error_message || "(no message)"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelected(r)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <Eye className="h-3 w-3" /> View
                      </button>
                      {r.execution_url && (
                        <a
                          href={r.execution_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" /> n8n
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!errorRowsError && errorRows.length > 0 && view === "grouped" && (
          <GroupedErrorsView groups={groups} />
        )}
      </CardContent>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-tight">
              Error Detail
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <DetailRow label="Workflow" value={selected.workflow_name} />
              <DetailRow label="Failed Node" value={selected.failed_node} />
              <DetailRow label="Type" value={selected.error_type} />
              <DetailRow label="Mode" value={selected.execution_mode} />
              <DetailRow
                label="Execution ID"
                value={selected.execution_id}
                mono
              />
              <DetailRow
                label="When"
                value={new Date(selected.created_at).toLocaleString()}
              />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Error Message
                </p>
                <pre className="text-xs font-mono bg-muted/50 p-3 rounded overflow-x-auto whitespace-pre-wrap break-words text-red-600 dark:text-red-400">
                  {selected.error_message || "(no message)"}
                </pre>
              </div>
              {selected.execution_url && (
                <a
                  href={selected.execution_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Open execution in n8n
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function GroupedErrorsView({ groups }: { groups: ErrorGroup[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  return (
    <Table className="min-w-[820px]">
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"></TableHead>
          <TableHead className="w-20 text-center">Count</TableHead>
          <TableHead>Workflow / Node / Type</TableHead>
          <TableHead>First seen</TableHead>
          <TableHead>Last seen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((g) => {
          const open = expanded.has(g.key);
          return (
            <Fragment key={g.key}>
              <TableRow
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => toggle(g.key)}
              >
                <TableCell className="text-muted-foreground">
                  {open ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-mono text-sm font-semibold">
                    {g.occurrences}×
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium">
                      {g.workflow_name || (
                        <span className="italic text-muted-foreground">
                          unknown
                        </span>
                      )}
                      {g.failed_node && (
                        <span className="text-muted-foreground">
                          {" "}
                          / {g.failed_node}
                        </span>
                      )}
                    </span>
                    <div>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-mono uppercase ${typeBadgeClass(g.error_type)}`}
                      >
                        {g.error_type}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTimeAgo(g.first_seen_at)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTimeAgo(g.last_seen_at)}
                </TableCell>
              </TableRow>
              {open && (
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableCell></TableCell>
                  <TableCell colSpan={4} className="py-3">
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-mono text-muted-foreground uppercase tracking-wide">
                          Sample message:
                        </span>
                        <pre className="mt-1 bg-background border border-border rounded p-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-red-600 dark:text-red-400">
                          {g.sample_message || "(no message)"}
                        </pre>
                      </div>
                      {g.sample_execution_url && (
                        <a
                          href={g.sample_execution_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Open latest
                          execution in n8n
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

function GrantsListSection({
  grants,
  grantsError,
  filters,
}: {
  grants: GrantRow[];
  grantsError: string | null;
  filters: { preset: string; from: string; to: string };
}) {
  const [selected, setSelected] = useState<GrantRow | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("all");

  // Distinct stage values present in this org's grants — keeps the filter
  // pill bar tight (we only show stages that actually exist for this org).
  const presentStages = useMemo(() => {
    const set = new Set<string>();
    for (const g of grants) set.add(g.stage);
    return Array.from(set).sort();
  }, [grants]);

  const filtered = useMemo(() => {
    if (stageFilter === "all") return grants;
    return grants.filter((g) => g.stage === stageFilter);
  }, [grants, stageFilter]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Grants picked up
            </CardTitle>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {filters.preset === "live"
                ? "Today (live)"
                : `${filters.from} → ${filters.to} UTC`}
              {" · "}
              {grants.length} {grants.length === 1 ? "grant" : "grants"}
              {grants.length === 500 && " (capped)"}
              {stageFilter !== "all" && ` · filtered: ${filtered.length}`}
            </p>
          </div>
          {presentStages.length > 1 && (
            <div className="inline-flex flex-wrap rounded-md border border-border p-0.5">
              <button
                onClick={() => setStageFilter("all")}
                className={`px-2.5 py-1 text-xs font-mono uppercase rounded ${
                  stageFilter === "all"
                    ? "bg-foreground/[0.06] text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                all
              </button>
              {presentStages.map((s) => (
                <button
                  key={s}
                  onClick={() => setStageFilter(s)}
                  className={`px-2.5 py-1 text-xs font-mono uppercase rounded ${
                    stageFilter === s
                      ? "bg-foreground/[0.06] text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {grantsError && (
          <div className="py-4 px-6 text-sm text-red-500">
            Failed to load grants: {grantsError}
          </div>
        )}
        {!grantsError && filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {stageFilter === "all"
              ? "No grants picked up in this range."
              : `No grants in stage "${stageFilter.replace(/_/g, " ")}" in this range.`}
          </div>
        )}
        {!grantsError && filtered.length > 0 && (
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="w-32">Stage</TableHead>
                <TableHead className="w-32">Score</TableHead>
                <TableHead className="w-32">Source</TableHead>
                <TableHead className="w-28">Picked up</TableHead>
                <TableHead className="w-16 text-right">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((g) => (
                <TableRow
                  key={g.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => setSelected(g)}
                >
                  <TableCell className="text-xs max-w-[420px]">
                    <div className="font-medium line-clamp-1">{g.title}</div>
                    {g.funder_name && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                        {g.funder_name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <StageBadge stage={g.stage} />
                  </TableCell>
                  <TableCell>
                    <ScoreBadge
                      label={g.screening_label}
                      score={g.screening_score}
                    />
                  </TableCell>
                  <TableCell className="text-xs">
                    {g.source ? (
                      <span className="font-mono text-muted-foreground">
                        {g.source}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell
                    className="text-xs text-muted-foreground whitespace-nowrap"
                    title={
                      g.created_at
                        ? new Date(g.created_at).toLocaleString()
                        : undefined
                    }
                  >
                    {g.created_at ? formatTimeAgo(g.created_at) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(g);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <Eye className="h-3 w-3" /> View
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-tight pr-8">
              {selected?.title || "Grant detail"}
            </DialogTitle>
          </DialogHeader>
          {selected && <GrantDetailBody grant={selected} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function GrantDetailBody({ grant }: { grant: GrantRow }) {
  const fitScore =
    grant.metadata && typeof grant.metadata.fit_score === "number"
      ? (grant.metadata.fit_score as number)
      : null;
  const sanityPass =
    grant.metadata && typeof grant.metadata.sanity_pass === "boolean"
      ? (grant.metadata.sanity_pass as boolean)
      : null;
  const sanityReason =
    grant.metadata && typeof grant.metadata.sanity_reason === "string"
      ? (grant.metadata.sanity_reason as string)
      : null;
  const fitScoreReason =
    grant.metadata && typeof grant.metadata.location_filter_reason === "string"
      ? (grant.metadata.location_filter_reason as string)
      : null;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StageBadge stage={grant.stage} />
        <ScoreBadge label={grant.screening_label} score={grant.screening_score} />
        {grant.source && (
          <Badge variant="outline" className="text-[10px] font-mono uppercase">
            {grant.source}
          </Badge>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <DetailRow label="Funder" value={grant.funder_name} />
        <DetailRow label="Amount" value={grant.amount} />
        <DetailRow label="Deadline" value={grant.deadline} />
        <DetailRow
          label="Updated"
          value={
            grant.updated_at
              ? new Date(grant.updated_at).toLocaleString()
              : null
          }
        />
        <DetailRow
          label="Created"
          value={
            grant.created_at
              ? new Date(grant.created_at).toLocaleString()
              : null
          }
        />
        <DetailRow label="Grant ID" value={grant.id} mono />
      </div>

      {grant.source_url && (
        <a
          href={grant.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> Open source page
        </a>
      )}

      {grant.description && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Description
          </p>
          <pre className="text-xs font-mono bg-muted/50 p-3 rounded overflow-x-auto whitespace-pre-wrap break-words max-h-72 overflow-y-auto">
            {grant.description}
          </pre>
        </div>
      )}

      {grant.screening_notes && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Screening notes
          </p>
          <p className="text-sm whitespace-pre-wrap">{grant.screening_notes}</p>
        </div>
      )}

      {grant.concerns.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Concerns ({grant.concerns.length})
          </p>
          <ul className="space-y-1 list-disc pl-5 text-sm">
            {grant.concerns.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {grant.recommendations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Recommendations ({grant.recommendations.length})
          </p>
          <ul className="space-y-1 list-disc pl-5 text-sm">
            {grant.recommendations.map((r, i) => (
              <li key={i}>
                {typeof r === "string" ? r : JSON.stringify(r)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(fitScore !== null || sanityPass !== null || fitScoreReason) && (
        <div className="rounded-md border border-dashed border-border p-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Discovery filter audit
          </p>
          {fitScore !== null && (
            <DetailRow label="Fit score" value={String(fitScore)} mono />
          )}
          {fitScoreReason && (
            <DetailRow label="Filter reason" value={fitScoreReason} />
          )}
          {sanityPass !== null && (
            <DetailRow
              label="Sanity pass"
              value={sanityPass ? "yes" : "no"}
              mono
            />
          )}
          {sanityReason && <DetailRow label="Sanity reason" value={sanityReason} />}
        </div>
      )}
    </div>
  );
}

function StageBadge({ stage }: { stage: GrantRow["stage"] }) {
  const cls: Record<GrantRow["stage"], string> = {
    discovery: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
    screening: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    pending_approval:
      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    drafting:
      "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    submission:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    awarded:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    reporting: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
    closed: "bg-muted text-muted-foreground",
    archived: "bg-muted text-muted-foreground",
  };
  return (
    <Badge
      variant="secondary"
      className={`text-[10px] font-mono uppercase ${cls[stage] ?? ""}`}
    >
      {stage.replace(/_/g, " ")}
    </Badge>
  );
}

function ScoreBadge({
  label,
  score,
}: {
  label: string | null;
  score: number | null;
}) {
  if (!label && score == null) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const norm = (label || "").toUpperCase();
  const cls =
    norm === "GREEN"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : norm === "YELLOW"
        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
        : norm === "RED"
          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
          : norm === "INSUFFICIENT_DATA"
            ? "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300"
            : "bg-muted text-muted-foreground";
  return (
    <Badge variant="secondary" className={`text-[10px] font-mono uppercase ${cls}`}>
      {norm || "?"}
      {score != null && <span className="ml-1 opacity-70">{score}</span>}
    </Badge>
  );
}

function typeBadgeClass(t: string) {
  switch (t) {
    case "oom":
    case "timeout":
      return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
    case "http_5xx":
    case "network":
      return "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300";
    case "http_4xx":
    case "rate_limit":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
    case "script_error":
      return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-32 shrink-0 pt-0.5">
        {label}
      </p>
      <p className={`text-sm flex-1 ${mono ? "font-mono" : ""}`}>
        {value || <span className="text-muted-foreground italic">—</span>}
      </p>
    </div>
  );
}

function VolumeBar({ value, max }: { value: number; max: number }) {
  if (max <= 0 || value <= 0)
    return <span className="text-muted-foreground text-xs">—</span>;
  const pct = Math.max(4, Math.round((value / max) * 100));
  return (
    <div className="h-2 w-full max-w-[160px] rounded-full bg-muted overflow-hidden">
      <div
        className="h-full bg-emerald-500/70 dark:bg-emerald-400/60"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function normalizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

const grantsChartConfig: ChartConfig = {
  grants: { label: "Grants added", color: "hsl(160, 84%, 39%)" },
};

const errorsChartConfig: ChartConfig = {
  errors: { label: "Errors", color: "hsl(0, 84%, 60%)" },
};

function ExecutionLineChart({
  title,
  subtitle,
  dataKey,
  chartConfig,
  points,
  emptyText,
}: {
  title: string;
  subtitle: string;
  dataKey: "grants" | "errors";
  chartConfig: ChartConfig;
  points: Array<{ day: string; grants: number; errors: number }>;
  emptyText: string;
}) {
  const total = points.reduce((acc, p) => acc + p[dataKey], 0);
  const hasData = points.some((p) => p[dataKey] > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> {title}
        </CardTitle>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {subtitle} · {total.toLocaleString()} total
        </p>
      </CardHeader>
      <CardContent>
        {!hasData || points.length === 0 ? (
          <div className="flex items-center justify-center h-[220px] text-muted-foreground text-xs">
            {emptyText}
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <LineChart
              data={points}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) =>
                  new Date(v).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis
                fontSize={10}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={28}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(v: string) =>
                      new Date(v).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    }
                  />
                }
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={`var(--color-${dataKey})`}
                strokeWidth={2}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function OutcomeBadge({ outcome }: { outcome: DayOutcome }) {
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
          <span className="font-mono text-[10px] uppercase tracking-wide">
            {label}
          </span>
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
