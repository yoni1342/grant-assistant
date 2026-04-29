"use client";

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
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  Layers,
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
  filters,
}: {
  orgId: string;
  orgMeta: OrgMeta;
  queueRow: QueueRow | null;
  days: DayRow[];
  lifetimeGrants: number;
  historyError: string | null;
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
