"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Loader2,
  Search,
  Info,
  Hash,
  Layers,
  FileText,
  Globe,
  ExternalLink,
  Building2,
  TrendingUp,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrgMeta {
  id: string;
  name: string | null;
  created_at: string | null;
  sector: string | null;
  geographic_focus: string | string[] | null;
}

interface Summary {
  total_picks: number;
  unique_central_picks: number;
  total_proposals: number;
  sources_used: number;
  stage_counts: {
    discovery: number;
    screening: number;
    pending_approval: number;
    drafting: number;
    submitted: number;
    awarded: number;
    closed: number;
  };
  first_pickup_at: string | null;
  last_pickup_at: string | null;
}

interface SourceRow {
  source: string;
  count: number;
}

interface Grant {
  id: string;
  central_grant_id: string | null;
  title: string;
  funder_name: string | null;
  amount: string | null;
  deadline: string | null;
  stage: string | null;
  source: string | null;
  source_domain: string;
  source_url: string | null;
  picked_at: string;
  proposals: number;
}

interface DetailResponse {
  org: OrgMeta;
  summary: Summary;
  source_breakdown: SourceRow[];
  grants: Grant[];
}

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

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtAmount(amount: string | null): string {
  if (!amount) return "—";
  const n = Number(amount);
  if (!isNaN(n) && n > 0) {
    return "$" + n.toLocaleString();
  }
  return amount;
}

const STAGE_STYLES: Record<string, string> = {
  discovery: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  screening:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  pending_approval:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  drafting:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  submission:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  submitted:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  awarded:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  closed: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
  rejected:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function StageBadge({ stage }: { stage: string | null }) {
  const label = stage || "unknown";
  const cls =
    STAGE_STYLES[label] ||
    "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}
    >
      {label.replace(/_/g, " ")}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type StageFilter =
  | "all"
  | "discovery"
  | "screening"
  | "pending_approval"
  | "drafting_plus"
  | "closed";

// ---------------------------------------------------------------------------
// Page-wide range filter — mirrors the list page's 8 presets. Drives every
// data fetch on this page: summary cards, stage breakdown, source breakdown,
// grants table, AND the line chart.
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

function toDateInputValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function rangeToISO(
  preset: RangePreset,
  customFrom?: string,
  customTo?: string,
): { from: string | null; to: string | null } {
  if (preset === "all") return { from: null, to: null };
  if (preset === "custom") {
    if (!customFrom || !customTo) return { from: null, to: null };
    const s = new Date(customFrom);
    s.setHours(0, 0, 0, 0);
    const e = new Date(customTo);
    e.setHours(23, 59, 59, 999);
    return { from: s.toISOString(), to: e.toISOString() };
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

// Same helper used by the list page — "all" defaults the chart to 30 days
// so the line is still plotable.
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
      const s = new Date(startOfToday);
      s.setDate(s.getDate() - 29);
      return { from: s, to: endOfToday, granularity: "day" };
    }
    case "all":
    default: {
      const s = new Date(startOfToday);
      s.setDate(s.getDate() - 29);
      return { from: s, to: endOfToday, granularity: "day" };
    }
  }
}

const VALID_PRESETS = new Set<RangePreset>([
  "all",
  "today",
  "yesterday",
  "this_week",
  "this_month",
  "last_7",
  "last_30",
  "custom",
]);

export function OrgPickupDetailClient({ orgId }: { orgId: string }) {
  const sp = useSearchParams();

  // --- Range filter inherited from URL (from list page's View link) ---
  const initialRangeParam = sp.get("range");
  const initialRange: RangePreset =
    initialRangeParam && VALID_PRESETS.has(initialRangeParam as RangePreset)
      ? (initialRangeParam as RangePreset)
      : "today";
  const urlFrom = sp.get("from");
  const urlTo = sp.get("to");
  const initialCustomFrom = urlFrom
    ? toDateInputValue(new Date(urlFrom))
    : toDateInputValue(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
  const initialCustomTo = urlTo
    ? toDateInputValue(new Date(urlTo))
    : toDateInputValue(new Date());

  const [range, setRange] = useState<RangePreset>(initialRange);
  const [customFrom, setCustomFrom] = useState<string>(initialCustomFrom);
  const [customTo, setCustomTo] = useState<string>(initialCustomTo);

  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");

  // --- Chart state (shares the page-wide range above) ---
  const [chartPoints, setChartPoints] = useState<
    { bucket: string; count: number }[]
  >([]);
  const [chartGranularity, setChartGranularity] = useState<"hour" | "day">(
    "day",
  );
  const [chartLoading, setChartLoading] = useState(false);
  const [chartTotal, setChartTotal] = useState(0);
  const [chartUsingDefault, setChartUsingDefault] = useState(false);

  // Back link preserves the list page's range, not this page's edits to it.
  const backHref = useMemo(() => {
    const p = new URLSearchParams();
    sp.forEach((v, k) => p.set(k, v));
    const qs = p.toString();
    return `/admin/org-pickup${qs ? "?" + qs : ""}`;
  }, [sp]);

  useEffect(() => {
    if (range === "custom" && (!customFrom || !customTo)) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { from, to } = rangeToISO(range, customFrom, customTo);
        const p = new URLSearchParams();
        if (from) p.set("from", from);
        if (to) p.set("to", to);
        const qs = p.toString();
        const res = await fetch(
          `/api/admin/org-pickup-stats/${orgId}${qs ? "?" + qs : ""}`,
        );
        if (!res.ok) {
          if (res.status === 404) throw new Error("Organization not found");
          throw new Error("Failed to load org pickup details");
        }
        const json = (await res.json()) as DetailResponse;
        setData(json);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId, range, customFrom, customTo]);

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
          `/api/admin/org-pickup-stats/${orgId}/daily?${p.toString()}`,
        );
        if (!res.ok) throw new Error("Failed to load chart data");
        const json = (await res.json()) as {
          points: { bucket: string; count: number }[];
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
  }, [orgId, range, customFrom, customTo]);

  const filteredGrants = useMemo(() => {
    if (!data) return [];
    let list = data.grants;
    if (stageFilter !== "all") {
      list = list.filter((g) => {
        const s = g.stage || "";
        if (stageFilter === "drafting_plus") {
          return ["drafting", "submission", "submitted", "awarded"].includes(s);
        }
        if (stageFilter === "closed") {
          return ["closed", "rejected"].includes(s);
        }
        return s === stageFilter;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          (g.funder_name || "").toLowerCase().includes(q) ||
          (g.source || "").toLowerCase().includes(q) ||
          g.source_domain.toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, search, stageFilter]);

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
        <BackLink href={backHref} />
        {rangeFilter}
        <Card>
          <CardContent className="py-10 text-center text-red-600">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <BackLink href={backHref} />
        {rangeFilter}
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading org pickup details...
        </div>
      </div>
    );
  }

  const s = data.summary;
  const draftingPlus =
    s.stage_counts.drafting +
    s.stage_counts.submitted +
    s.stage_counts.awarded;
  const geo = Array.isArray(data.org.geographic_focus)
    ? data.org.geographic_focus.join(", ")
    : data.org.geographic_focus;

  return (
    <div className="space-y-6">
      <BackLink href={backHref} />

      {/* ===== Org Header ===== */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-md bg-foreground/[0.06] flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight truncate">
              {data.org.name || "(unnamed org)"}
            </h1>
            <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
              Catalog grant pickups · {RANGE_LABELS[range].toLowerCase()}
            </p>
          </div>
          <Link
            href={`/admin/organizations/${data.org.id}`}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 shrink-0"
          >
            Org profile <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pl-13">
          {data.org.sector && (
            <span>
              <span className="text-muted-foreground/60">Sector:</span>{" "}
              {data.org.sector}
            </span>
          )}
          {geo && (
            <span>
              <span className="text-muted-foreground/60">Geo:</span> {geo}
            </span>
          )}
          <span>
            <span className="text-muted-foreground/60">Joined:</span>{" "}
            {fmtDate(data.org.created_at)}
          </span>
          <span>
            <span className="text-muted-foreground/60">First pick:</span>{" "}
            {fmtDate(s.first_pickup_at)}
          </span>
          <span>
            <span className="text-muted-foreground/60">Last pick:</span>{" "}
            {fmtDate(s.last_pickup_at)}
          </span>
        </div>
      </div>

      {/* ===== Page-wide Range Filter ===== */}
      {rangeFilter}

      {/* ===== Summary Cards ===== */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Total Pickups
              <InfoTip>
                Total catalog grants this org has added to its pipeline.
              </InfoTip>
            </CardTitle>
            <Hash className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {s.total_picks.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Unique Grants
              <InfoTip>
                Distinct central-catalog grants (de-duplicated). Matches
                Total Pickups unless the same grant was picked more than
                once.
              </InfoTip>
            </CardTitle>
            <Layers className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">
              {s.unique_central_picks.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Proposals
              <InfoTip>
                Proposal drafts this org has created from its picked-up
                grants.
              </InfoTip>
            </CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {s.total_proposals.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Sources Used
              <InfoTip>
                Distinct source domains this org has drawn grants from.
              </InfoTip>
            </CardTitle>
            <Globe className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {s.sources_used.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ===== Pickup-over-time Line Chart ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Pickups Over Time
            <InfoTip>
              Number of catalog grants this org added to its pipeline over
              time. Follows the range selected above. &quot;Today&quot; /
              &quot;Yesterday&quot; show per-hour; longer ranges show
              per-day.
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
            <div className="flex items-center justify-center h-[200px] text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Loading chart…</span>
            </div>
          ) : chartPoints.every((p) => p.count === 0) ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-xs">
              No pickups in this range.
            </div>
          ) : (
            <ChartContainer
              config={pickupChartConfig}
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
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v: string) => {
                        const d = new Date(v);
                        if (chartGranularity === "hour") {
                          return d.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            hour12: true,
                          });
                        }
                        return d.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      }}
                    />
                  }
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

      {/* ===== Stage Funnel ===== */}
      {s.total_picks > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Pipeline Stage Breakdown
              <InfoTip>
                Where this org&apos;s picked-up grants currently sit in
                the pipeline.
              </InfoTip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              <StageStat
                label="Discovery"
                value={s.stage_counts.discovery}
                color="text-slate-700"
                filter="discovery"
                active={stageFilter}
                onSet={setStageFilter}
              />
              <StageStat
                label="Screening"
                value={s.stage_counts.screening}
                color="text-yellow-600"
                filter="screening"
                active={stageFilter}
                onSet={setStageFilter}
              />
              <StageStat
                label="Pending Approval"
                value={s.stage_counts.pending_approval}
                color="text-amber-600"
                filter="pending_approval"
                active={stageFilter}
                onSet={setStageFilter}
              />
              <StageStat
                label="Drafting+"
                value={draftingPlus}
                color="text-blue-600"
                filter="drafting_plus"
                active={stageFilter}
                onSet={setStageFilter}
              />
              <StageStat
                label="Awarded"
                value={s.stage_counts.awarded}
                color="text-green-600"
                filter="drafting_plus"
                active={stageFilter}
                onSet={setStageFilter}
                hint="Included in Drafting+"
              />
              <StageStat
                label="Closed/Rejected"
                value={s.stage_counts.closed}
                color="text-gray-500"
                filter="closed"
                active={stageFilter}
                onSet={setStageFilter}
              />
              <StageStat
                label="All"
                value={s.total_picks}
                color="text-foreground"
                filter="all"
                active={stageFilter}
                onSet={setStageFilter}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Source Breakdown ===== */}
      {data.source_breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Pickups by Source
              <InfoTip>
                Which sources this org has picked grants from. Click a
                source name to jump to its analytics page.
              </InfoTip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.source_breakdown.map((row) => (
                <Link
                  key={row.source}
                  href={`/admin/source-analytics/${encodeURIComponent(row.source)}`}
                >
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                  >
                    <span className="font-medium">{row.source}</span>
                    <span className="ml-1.5 text-muted-foreground font-normal tabular-nums">
                      {row.count}
                    </span>
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Grant List ===== */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Picked-Up Grants
              <InfoTip>
                Full list of catalog grants this org has added to its
                pipeline. Click a title to open the grant&apos;s source
                listing.
              </InfoTip>
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter grants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {filteredGrants.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {search || stageFilter !== "all"
                ? "No grants match your filters."
                : "This organization hasn’t picked up any catalog grants yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="table-fixed min-w-[880px]">
                <colgroup>
                  <col className="w-[34%]" />
                  <col className="w-[16%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs px-2 py-1.5">Title</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Funder</TableHead>
                    <TableHead className="text-right text-xs px-2 py-1.5">
                      Amount
                    </TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Deadline</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Source</TableHead>
                    <TableHead className="text-xs px-2 py-1.5">Stage</TableHead>
                    <TableHead className="text-right text-xs px-2 py-1.5">
                      Picked
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGrants.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="text-xs px-2 py-1.5 align-top">
                        <div className="font-medium truncate" title={g.title}>
                          {g.source_url ? (
                            <a
                              href={g.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              {g.title}
                              <ExternalLink className="h-3 w-3 inline text-muted-foreground shrink-0" />
                            </a>
                          ) : (
                            g.title
                          )}
                        </div>
                        {g.proposals > 0 && (
                          <div className="text-[10px] text-green-600 mt-0.5">
                            {g.proposals} proposal{g.proposals === 1 ? "" : "s"}
                          </div>
                        )}
                      </TableCell>
                      <TableCell
                        className="text-xs px-2 py-1.5 truncate text-muted-foreground"
                        title={g.funder_name || ""}
                      >
                        {g.funder_name || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs px-2 py-1.5">
                        {fmtAmount(g.amount)}
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5">
                        {g.deadline ? fmtDate(g.deadline) : "—"}
                      </TableCell>
                      <TableCell
                        className="text-xs px-2 py-1.5 truncate text-muted-foreground"
                        title={g.source || g.source_domain}
                      >
                        {g.source || g.source_domain}
                      </TableCell>
                      <TableCell className="text-xs px-2 py-1.5">
                        <StageBadge stage={g.stage} />
                      </TableCell>
                      <TableCell className="text-right text-xs px-2 py-1.5 text-muted-foreground">
                        {fmtDate(g.picked_at)}
                      </TableCell>
                    </TableRow>
                  ))}
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

function BackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to Org Pickup
    </Link>
  );
}

function StageStat({
  label,
  value,
  color,
  filter,
  active,
  onSet,
  hint,
}: {
  label: string;
  value: number;
  color: string;
  filter: StageFilter;
  active: StageFilter;
  onSet: (f: StageFilter) => void;
  hint?: string;
}) {
  const isActive = active === filter;
  return (
    <button
      type="button"
      onClick={() => onSet(isActive ? "all" : filter)}
      className={`text-left rounded-md border px-3 py-2 transition-colors ${
        isActive
          ? "border-foreground bg-foreground/[0.04]"
          : "border-border hover:border-foreground/40 hover:bg-foreground/[0.02]"
      }`}
      title={hint}
    >
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className={`text-lg font-bold ${color}`}>
        {value.toLocaleString()}
      </div>
    </button>
  );
}

const pickupChartConfig: ChartConfig = {
  count: { label: "Pickups", color: "hsl(217, 91%, 60%)" },
};

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
            onClick={() => {
              if (!canApply) return;
              onCustomFromChange(draftFrom);
              onCustomToChange(draftTo);
            }}
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
