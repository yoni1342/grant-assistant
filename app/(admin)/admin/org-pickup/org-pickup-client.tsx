"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  Building2,
  Hash,
  Layers,
  Search,
  Info,
  Loader2,
  ArrowDownUp,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrgStat {
  org_id: string;
  name: string;
  total_picks: number;
  discovery: number;
  screening: number;
  pending_approval: number;
  drafting: number;
  submitted: number;
  awarded: number;
  closed: number;
  proposals: number;
  last_pickup_at: string | null;
}

interface Totals {
  orgs_with_picks: number;
  orgs_total: number;
  total_picks: number;
  picks_of_new_grants: number;
  picks_of_older_grants: number;
  range_applied: boolean;
  unique_central_picks: number;
  avg_picks_per_active_org: number;
  sources_used?: number;
}

interface SourcePickup {
  source: string;
  count: number;
}

type SortField =
  | "name"
  | "total_picks"
  | "discovery"
  | "screening"
  | "proposals"
  | "last_pickup_at";

// ---------------------------------------------------------------------------
// Range filter (duplicated locally so the page is self-contained)
// ---------------------------------------------------------------------------

type RangePreset =
  | "all"
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "last_7"
  | "last_30"
  | "custom";

const RANGE_LABELS: Record<RangePreset, string> = {
  all: "All time",
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  this_month: "This month",
  last_7: "Last 7 days",
  last_30: "Last 30 days",
  custom: "Custom",
};

function rangeToISO(
  preset: RangePreset,
  customFrom?: string,
  customTo?: string,
): { from: string | null; to: string | null } {
  if (preset === "all") return { from: null, to: null };
  if (preset === "custom") {
    if (!customFrom || !customTo) return { from: null, to: null };
    const start = new Date(customFrom);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customTo);
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (preset) {
    case "today":
      break;
    case "yesterday":
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case "this_week": {
      const dow = start.getDay();
      const diff = (dow + 6) % 7;
      start.setDate(start.getDate() - diff);
      break;
    }
    case "this_month":
      start.setDate(1);
      break;
    case "last_7":
      start.setDate(start.getDate() - 6);
      break;
    case "last_30":
      start.setDate(start.getDate() - 29);
      break;
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

function toDateInputValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Chart uses the page-wide range filter. "all" + single-day presets get a
// sensible default window so the line chart always has something to plot.
// ---------------------------------------------------------------------------

function pageRangeToChartWindow(
  preset: RangePreset,
  customFrom: string,
  customTo: string,
): { from: Date; to: Date; granularity: "hour" | "day" } {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  switch (preset) {
    case "today":
      return { from: startOfToday, to: endOfToday, granularity: "hour" };
    case "yesterday": {
      const s = new Date(startOfToday);
      s.setDate(s.getDate() - 1);
      const e = new Date(endOfToday);
      e.setDate(e.getDate() - 1);
      return { from: s, to: e, granularity: "hour" };
    }
    case "this_week": {
      const s = new Date(startOfToday);
      const dow = s.getDay();
      const diff = (dow + 6) % 7;
      s.setDate(s.getDate() - diff);
      return { from: s, to: endOfToday, granularity: "day" };
    }
    case "this_month": {
      const s = new Date(startOfToday);
      s.setDate(1);
      return { from: s, to: endOfToday, granularity: "day" };
    }
    case "last_7": {
      const s = new Date(startOfToday);
      s.setDate(s.getDate() - 6);
      return { from: s, to: endOfToday, granularity: "day" };
    }
    case "last_30": {
      const s = new Date(startOfToday);
      s.setDate(s.getDate() - 29);
      return { from: s, to: endOfToday, granularity: "day" };
    }
    case "custom": {
      if (customFrom && customTo) {
        const s = new Date(customFrom);
        s.setHours(0, 0, 0, 0);
        const e = new Date(customTo);
        e.setHours(23, 59, 59, 999);
        if (s <= e) {
          const spanDays = Math.ceil(
            (e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000),
          );
          return {
            from: s,
            to: e,
            granularity: spanDays <= 2 ? "hour" : "day",
          };
        }
      }
      // Fall through to default window if custom dates aren't valid
      const s = new Date(startOfToday);
      s.setDate(s.getDate() - 29);
      return { from: s, to: endOfToday, granularity: "day" };
    }
    case "all":
    default: {
      // "All time" would be unbounded — show last 30 days as a sensible default.
      const s = new Date(startOfToday);
      s.setDate(s.getDate() - 29);
      return { from: s, to: endOfToday, granularity: "day" };
    }
  }
}

const pickupRateChartConfig: ChartConfig = {
  count: { label: "Pickups", color: "hsl(217, 91%, 60%)" },
};

const pickupsBySourceConfig: ChartConfig = {
  count: { label: "Pickups", color: "hsl(217, 91%, 60%)" },
};

function rangePhrasing(p: RangePreset): {
  newGrantsLabel: string;
  olderGrantsLabel: string;
} {
  switch (p) {
    case "today":
      return {
        newGrantsLabel: "today's new grants",
        olderGrantsLabel: "grants from earlier",
      };
    case "yesterday":
      return {
        newGrantsLabel: "yesterday's new grants",
        olderGrantsLabel: "grants from before yesterday",
      };
    case "this_week":
      return {
        newGrantsLabel: "this week's new grants",
        olderGrantsLabel: "grants from before this week",
      };
    case "this_month":
      return {
        newGrantsLabel: "this month's new grants",
        olderGrantsLabel: "grants from before this month",
      };
    case "last_7":
      return {
        newGrantsLabel: "grants posted in the last 7 days",
        olderGrantsLabel: "grants posted before that",
      };
    case "last_30":
      return {
        newGrantsLabel: "grants posted in the last 30 days",
        olderGrantsLabel: "grants posted before that",
      };
    case "custom":
    case "all":
    default:
      return {
        newGrantsLabel: "new grants from this range",
        olderGrantsLabel: "older grants from before this range",
      };
  }
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrgPickupClient() {
  const [orgs, setOrgs] = useState<OrgStat[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [pickupSources, setPickupSources] = useState<SourcePickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("total_picks");
  const [sortAsc, setSortAsc] = useState(false);
  const [hideZero, setHideZero] = useState(true);

  // Chart shares the page-wide range filter; no separate state needed.
  const [chartPoints, setChartPoints] = useState<
    {
      bucket: string;
      count: number;
      orgs?: { id: string; name: string; count: number }[];
      otherOrgsCount?: number;
    }[]
  >([]);
  const [chartGranularity, setChartGranularity] = useState<"hour" | "day">(
    "day",
  );
  const [chartLoading, setChartLoading] = useState(false);
  const [chartTotal, setChartTotal] = useState(0);
  // Flag so the caption can say "(default 30 days)" when the page is on All.
  const [chartUsingDefault, setChartUsingDefault] = useState(false);

  const [range, setRange] = useState<RangePreset>("today");
  const defaultCustomTo = toDateInputValue(new Date());
  const defaultCustomFrom = toDateInputValue(
    new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
  );
  const [customFrom, setCustomFrom] = useState<string>(defaultCustomFrom);
  const [customTo, setCustomTo] = useState<string>(defaultCustomTo);

  useEffect(() => {
    if (range === "custom" && (!customFrom || !customTo)) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { from, to } = rangeToISO(range, customFrom, customTo);
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const qs = params.toString();
        const res = await fetch(
          `/api/admin/org-pickup-stats${qs ? "?" + qs : ""}`,
        );
        if (!res.ok) throw new Error("Failed to fetch org pickup stats");
        const data = await res.json();
        setOrgs(data.orgs || []);
        setTotals(data.totals || null);
        setPickupSources(data.sources || []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [range, customFrom, customTo]);

  // --- Chart data fetch — driven by the page-wide range filter ---
  useEffect(() => {
    const win = pageRangeToChartWindow(range, customFrom, customTo);
    setChartUsingDefault(range === "all");
    (async () => {
      setChartLoading(true);
      try {
        const p = new URLSearchParams();
        p.set("from", win.from.toISOString());
        p.set("to", win.to.toISOString());
        p.set("granularity", win.granularity);
        const res = await fetch(
          `/api/admin/org-pickup-stats/daily?${p.toString()}`,
        );
        if (!res.ok) throw new Error("Failed to load chart data");
        const json = (await res.json()) as {
          points: {
            bucket: string;
            count: number;
            orgs?: { id: string; name: string; count: number }[];
            otherOrgsCount?: number;
          }[];
          total: number;
          granularity: "hour" | "day";
        };
        setChartPoints(json.points);
        setChartGranularity(json.granularity);
        setChartTotal(json.total);
      } catch {
        setChartPoints([]);
        setChartTotal(0);
      } finally {
        setChartLoading(false);
      }
    })();
  }, [range, customFrom, customTo]);

  function handleSort(field: SortField) {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  const rangeQs = useMemo(() => {
    const { from, to } = rangeToISO(range, customFrom, customTo);
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    p.set("range", range);
    const qs = p.toString();
    return qs ? `?${qs}` : "";
  }, [range, customFrom, customTo]);

  const filtered = useMemo(() => {
    let list = [...orgs];
    if (hideZero) list = list.filter((o) => o.total_picks > 0);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((o) => o.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortField === "name") {
        return sortAsc
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      if (sortField === "last_pickup_at") {
        const av = a.last_pickup_at ? new Date(a.last_pickup_at).getTime() : 0;
        const bv = b.last_pickup_at ? new Date(b.last_pickup_at).getTime() : 0;
        return sortAsc ? av - bv : bv - av;
      }
      const av = a[sortField] as number;
      const bv = b[sortField] as number;
      return sortAsc ? av - bv : bv - av;
    });
    return list;
  }, [orgs, search, sortField, sortAsc, hideZero]);

  const rangeFilter = (
    <RangeFilter
      value={range}
      onChange={setRange}
      customFrom={customFrom}
      customTo={customTo}
      onCustomFromChange={setCustomFrom}
      onCustomToChange={setCustomTo}
    />
  );

  if (error && !loading) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <CardContent className="py-10 text-center text-red-600">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Header />
        {rangeFilter}
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading org pickup stats...
        </div>
      </div>
    );
  }

  const coveragePct =
    totals && totals.orgs_total > 0
      ? Math.round((totals.orgs_with_picks / totals.orgs_total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <Header />
      {rangeFilter}

      {/* ====== Summary Cards ====== */}
      {totals && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Active Orgs
                <InfoTip>
                  Organizations that picked up at least one grant from the
                  central catalog in the selected range.
                </InfoTip>
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {totals.orgs_with_picks.toLocaleString()}
                <span className="text-sm text-muted-foreground font-normal">
                  {" "}
                  / {totals.orgs_total.toLocaleString()}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {coveragePct}% of all orgs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Total Pickups
                <InfoTip>
                  How many grants orgs added to their pipeline in this date
                  range. A pickup happening in this range doesn&rsquo;t mean
                  the grant was newly posted in this range &mdash; orgs often
                  pick up grants that have been in the catalog for a while.
                  The breakdown below splits that out.
                </InfoTip>
              </CardTitle>
              <Hash className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {totals.total_picks.toLocaleString()}
              </p>
              {totals.range_applied && totals.total_picks > 0 && (
                <div className="mt-1.5 space-y-0.5 text-xs leading-tight">
                  <p>
                    <span className="font-semibold text-emerald-600">
                      {totals.picks_of_new_grants.toLocaleString()}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      of {rangePhrasing(range).newGrantsLabel} got picked up
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-amber-600">
                      {totals.picks_of_older_grants.toLocaleString()}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      picks were of {rangePhrasing(range).olderGrantsLabel}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Unique Grants
                <InfoTip>
                  Distinct central-catalog grants that at least one
                  organization has picked up. Answers: how much of the catalog
                  is actually being used?
                </InfoTip>
              </CardTitle>
              <Layers className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">
                {totals.unique_central_picks.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Avg per Active Org
                <InfoTip>
                  Mean number of pickups among organizations that picked up at
                  least one grant.
                </InfoTip>
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">
                {totals.avg_picks_per_active_org.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== Pickup Rate Line Chart ====== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Pickup Rate
            <InfoTip>
              Total catalog grants added to pipelines across all
              organizations over time. Follows the date range selected
              above. &quot;Today&quot; / &quot;Yesterday&quot; show per-hour;
              longer ranges show per-day.
            </InfoTip>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {chartLoading
              ? "Loading…"
              : `${chartTotal.toLocaleString()} pickup${chartTotal === 1 ? "" : "s"} in ${chartUsingDefault ? "the last 30 days (default view)" : "the selected range"}`}
          </p>
        </CardHeader>
        <CardContent>
          {chartLoading ? (
            <div className="flex items-center justify-center h-[220px] text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Loading chart…</span>
            </div>
          ) : chartPoints.every((p) => p.count === 0) ? (
            <div className="flex items-center justify-center h-[220px] text-muted-foreground text-xs">
              No pickups in this range.
            </div>
          ) : (
            <ChartContainer
              config={pickupRateChartConfig}
              className="h-[220px] w-full"
            >
              <LineChart
                data={chartPoints}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="bucket"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    if (chartGranularity === "hour") {
                      return d.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        hour12: true,
                      });
                    }
                    return d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <YAxis
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <ChartTooltip
                  cursor={{ stroke: "var(--color-count)", strokeOpacity: 0.2 }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const point = payload[0]?.payload as {
                      bucket: string;
                      count: number;
                      orgs?: { id: string; name: string; count: number }[];
                      otherOrgsCount?: number;
                    };
                    if (!point) return null;
                    const d = new Date(point.bucket);
                    const label =
                      chartGranularity === "hour"
                        ? d.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            hour12: true,
                          })
                        : d.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });
                    const orgs = point.orgs || [];
                    const other = point.otherOrgsCount || 0;
                    return (
                      <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md">
                        <div className="font-medium text-foreground">{label}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ background: "var(--color-count)" }}
                          />
                          <span>
                            {point.count.toLocaleString()} pickup
                            {point.count === 1 ? "" : "s"}
                          </span>
                        </div>
                        {orgs.length > 0 && (
                          <div className="mt-2 border-t pt-2">
                            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                              Organizations
                            </div>
                            <ul className="space-y-0.5">
                              {orgs.map((o) => (
                                <li
                                  key={o.id}
                                  className="flex items-center justify-between gap-3"
                                >
                                  <span className="max-w-[180px] truncate text-foreground">
                                    {o.name}
                                  </span>
                                  <span className="font-mono text-muted-foreground">
                                    {o.count}
                                  </span>
                                </li>
                              ))}
                              {other > 0 && (
                                <li className="flex items-center justify-between gap-3 text-muted-foreground">
                                  <span className="italic">+ others</span>
                                  <span className="font-mono">{other}</span>
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-count)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* ====== Pickups by Source (bar chart) ====== */}
      {pickupSources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Pickups by Source
              <InfoTip>
                Number of catalog grants picked up from each source in the
                selected range, summed across all organizations. Use this to
                compare which sources produce grants that orgs actually adopt.
              </InfoTip>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {pickupSources.length} source
              {pickupSources.length === 1 ? "" : "s"} contributed pickups
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={pickupsBySourceConfig}
              className="w-full"
              style={{
                height: `${Math.max(180, Math.min(pickupSources.length, 20) * 28 + 40)}px`,
                aspectRatio: "auto",
              }}
            >
              <BarChart
                data={pickupSources.slice(0, 20)}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="source"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={140}
                  tick={{ fill: "var(--muted-foreground)" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 3, 3, 0]}>
                  {pickupSources.slice(0, 20).map((entry, i) => (
                    <Cell
                      key={entry.source}
                      fill={`hsl(${(i * 47) % 360}, 65%, 55%)`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* ====== Per-Org Table ====== */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Per-Organization Pickups
              <InfoTip>
                Each row shows how many catalog grants that org added to its
                pipeline, broken down by stage. Click the org name to view its
                full admin detail page.
              </InfoTip>
            </CardTitle>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideZero}
                  onChange={(e) => setHideZero(e.target.checked)}
                  className="h-3.5 w-3.5 accent-foreground"
                />
                Hide orgs with 0 pickups
              </label>
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter orgs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {search
                ? "No organizations match your filter."
                : "No pickups in this range."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="table-fixed min-w-[800px]">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[9%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[9%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <SortHeader
                      field="name"
                      sortField={sortField}
                      sortAsc={sortAsc}
                      onSort={handleSort}
                    >
                      Organization
                    </SortHeader>
                    <SortHeader
                      field="total_picks"
                      sortField={sortField}
                      sortAsc={sortAsc}
                      onSort={handleSort}
                      align="right"
                    >
                      Pickups
                    </SortHeader>
                    <SortHeader
                      field="discovery"
                      sortField={sortField}
                      sortAsc={sortAsc}
                      onSort={handleSort}
                      align="right"
                    >
                      Discovery
                    </SortHeader>
                    <SortHeader
                      field="screening"
                      sortField={sortField}
                      sortAsc={sortAsc}
                      onSort={handleSort}
                      align="right"
                    >
                      Screening
                    </SortHeader>
                    <TableHead className="text-right text-xs px-2 py-1.5">
                      Approval
                    </TableHead>
                    <TableHead className="text-right text-xs px-2 py-1.5">
                      Drafting+
                    </TableHead>
                    <SortHeader
                      field="proposals"
                      sortField={sortField}
                      sortAsc={sortAsc}
                      onSort={handleSort}
                      align="right"
                    >
                      Proposals
                    </SortHeader>
                    <SortHeader
                      field="last_pickup_at"
                      sortField={sortField}
                      sortAsc={sortAsc}
                      onSort={handleSort}
                      align="right"
                    >
                      Last Pick
                    </SortHeader>
                    <TableHead className="text-right text-xs px-2 py-1.5"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const draftingPlus =
                      row.drafting + row.submitted + row.awarded;
                    return (
                      <TableRow key={row.org_id}>
                        <TableCell
                          className="font-medium text-xs px-2 py-1.5 truncate"
                          title={row.name}
                        >
                          {row.name}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 font-semibold">
                          {row.total_picks.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                          {row.discovery > 0 ? (
                            row.discovery
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                          {row.screening > 0 ? (
                            <span className="text-yellow-600">
                              {row.screening}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                          {row.pending_approval > 0 ? (
                            <span className="text-amber-600">
                              {row.pending_approval}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                          {draftingPlus > 0 ? (
                            <span className="text-green-600">
                              {draftingPlus}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                          {row.proposals > 0 ? (
                            <span className="text-purple-600">
                              {row.proposals}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs px-2 py-1.5 text-muted-foreground">
                          {timeAgo(row.last_pickup_at)}
                        </TableCell>
                        <TableCell className="text-right text-xs px-2 py-1.5">
                          <Link
                            href={`/admin/org-pickup/${row.org_id}${rangeQs}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            View <ArrowRight className="h-3 w-3" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {totals && (
                    <TableRow className="border-t-2 font-semibold bg-muted/30">
                      <TableCell className="text-xs px-2 py-1.5">
                        All Orgs
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                        {totals.total_picks.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                        {filtered
                          .reduce((a, o) => a + o.discovery, 0)
                          .toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 text-yellow-600">
                        {filtered
                          .reduce((a, o) => a + o.screening, 0)
                          .toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 text-amber-600">
                        {filtered
                          .reduce((a, o) => a + o.pending_approval, 0)
                          .toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 text-green-600">
                        {filtered
                          .reduce(
                            (a, o) =>
                              a + o.drafting + o.submitted + o.awarded,
                            0,
                          )
                          .toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5 text-purple-600">
                        {filtered
                          .reduce((a, o) => a + o.proposals, 0)
                          .toLocaleString()}
                      </TableCell>
                      <TableCell />
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
      <h1 className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight">
        Org Pickup
      </h1>
      <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
        How many catalog grants each organization has added to its pipeline
      </p>
    </div>
  );
}

function RangeFilter({
  value,
  onChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}: {
  value: RangePreset;
  onChange: (v: RangePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
}) {
  const presets: RangePreset[] = [
    "all",
    "today",
    "yesterday",
    "this_week",
    "this_month",
    "last_7",
    "last_30",
    "custom",
  ];

  const [draftFrom, setDraftFrom] = useState(customFrom);
  const [draftTo, setDraftTo] = useState(customTo);
  const [lastProps, setLastProps] = useState({ customFrom, customTo });
  if (lastProps.customFrom !== customFrom || lastProps.customTo !== customTo) {
    setLastProps({ customFrom, customTo });
    setDraftFrom(customFrom);
    setDraftTo(customTo);
  }

  const dirty = draftFrom !== customFrom || draftTo !== customTo;
  const canApply = dirty && !!draftFrom && !!draftTo && draftFrom <= draftTo;

  function apply() {
    if (!canApply) return;
    onCustomFromChange(draftFrom);
    onCustomToChange(draftTo);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {presets.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
              active
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/40"
            }`}
          >
            {RANGE_LABELS[p]}
          </button>
        );
      })}
      {value === "custom" && (
        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="date"
            value={draftFrom}
            max={draftTo || undefined}
            onChange={(e) => setDraftFrom(e.target.value)}
            className="h-7 px-2 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:border-foreground/60"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={draftTo}
            min={draftFrom || undefined}
            max={toDateInputValue(new Date())}
            onChange={(e) => setDraftTo(e.target.value)}
            className="h-7 px-2 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:border-foreground/60"
          />
          <button
            type="button"
            onClick={apply}
            disabled={!canApply}
            className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
              canApply
                ? "bg-foreground text-background border-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground border-border cursor-not-allowed"
            }`}
          >
            Apply
          </button>
        </div>
      )}
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
      className={`cursor-pointer select-none text-xs px-2 py-1.5 ${
        align === "right" ? "text-right" : ""
      }`}
      onClick={() => onSort(field)}
    >
      <div
        className={`flex items-center gap-1 ${
          align === "right" ? "justify-end" : ""
        }`}
      >
        {children}
        {sortField === field && (
          <ArrowDownUp className="h-3 w-3 text-foreground shrink-0" />
        )}
      </div>
    </TableHead>
  );
}

