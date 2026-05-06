"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
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
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  Filter,
  Group,
  Package,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Siren,
  XCircle,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils/format";
import { Input } from "@/components/ui/input";

// ----- Public types (also imported by the server page) -----

export interface QcOrgRow {
  id: string;
  name: string;
  sector: string | null;
}

export interface QcGrantRow {
  id: string;
  org_id: string;
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
  data_quality: string | null;
  screening_notes: string | null;
  source: string | null;
  source_url: string | null;
  deadline: string | null;
  amount: string | null;
  description: string | null;
  concerns: string[];
  recommendations: unknown[];
  fit_score: number | null;
  sanity_pass: boolean | null;
  sanity_reason: string | null;
  filter_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ----- Constants -----

const STAGES: QcGrantRow["stage"][] = [
  "discovery",
  "screening",
  "pending_approval",
  "drafting",
  "submission",
  "awarded",
  "reporting",
  "closed",
  "archived",
];

const SCORES = ["GREEN", "YELLOW", "RED", "INSUFFICIENT_DATA", "NO_RESULT"] as const;
type Score = (typeof SCORES)[number];

const GROUP_BYS = [
  { value: "none", label: "None" },
  { value: "org", label: "Organization" },
  { value: "stage", label: "Stage" },
  { value: "score", label: "Score" },
  { value: "source", label: "Source" },
  { value: "funder", label: "Funder" },
  { value: "day", label: "Day picked up" },
  { value: "fit_bucket", label: "Discovery fit bucket" },
] as const;
type GroupBy = (typeof GROUP_BYS)[number]["value"];

const PRESETS = [
  { value: "live", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
] as const;

// ----- Quality flags (anomaly detection) -----

interface QualityFlag {
  key: string;
  label: string;
  tone: "danger" | "warn" | "info" | "ok";
}

function qualityFlags(g: QcGrantRow): QualityFlag[] {
  const flags: QualityFlag[] = [];
  const score = (g.screening_label || "").toUpperCase();
  // Discovery thought it was decent; screener disagrees → broad-sector confusion
  if (g.fit_score != null && g.fit_score >= 70 && score === "RED") {
    flags.push({
      key: "false_positive",
      label: "discovery false-positive",
      tone: "danger",
    });
  }
  // Sanity check didn't run (legacy row from before the new stage was added)
  if (g.sanity_pass == null && g.fit_score != null) {
    flags.push({
      key: "no_sanity",
      label: "pre-sanity-check",
      tone: "info",
    });
  }
  // Stuck in stage for too long
  if (g.stage === "screening" && g.created_at) {
    const ageH =
      (Date.now() - new Date(g.created_at).getTime()) / (1000 * 60 * 60);
    if (ageH > 24 && !g.screening_score) {
      flags.push({ key: "stuck", label: "stuck >24h", tone: "warn" });
    }
  }
  if (g.stage === "discovery" && g.created_at) {
    const ageH =
      (Date.now() - new Date(g.created_at).getTime()) / (1000 * 60 * 60);
    if (ageH > 1) {
      flags.push({ key: "stuck_disc", label: "stuck in discovery", tone: "warn" });
    }
  }
  if (
    score === "GREEN" &&
    g.screening_score != null &&
    g.screening_score > 85
  ) {
    flags.push({ key: "good_match", label: "strong match", tone: "ok" });
  }
  return flags;
}

// ----- Main component -----

export function GrantQualityClient({
  grants: initialGrants,
  orgs,
  loadError,
  capped,
  filters,
}: {
  grants: QcGrantRow[];
  orgs: QcOrgRow[];
  loadError: string | null;
  capped: boolean;
  filters: { preset: string; from: string; to: string };
}) {
  const supabase = useMemo(() => createClient(), []);
  const [grants, setGrants] = useState<QcGrantRow[]>(initialGrants);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<Set<QcGrantRow["stage"]>>(
    new Set(),
  );
  const [scoreFilter, setScoreFilter] = useState<Set<Score>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set());
  const [orgFilter, setOrgFilter] = useState<Set<string>>(new Set());
  const [flagFilter, setFlagFilter] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [selected, setSelected] = useState<QcGrantRow | null>(null);
  const [redLiveCount, setRedLiveCount] = useState(0);
  const seenIds = useRef<Set<string>>(new Set(initialGrants.map((g) => g.id)));

  // Map org_id → name for display + filtering
  const orgMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const o of orgs) m[o.id] = o.name;
    return m;
  }, [orgs]);

  // Subscribe to grants table for real-time RED arrivals.
  // Filters by score happen client-side because postgres_changes filter
  // doesn't support jsonb path.
  useEffect(() => {
    const channel = supabase
      .channel("admin-grant-quality-red")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "grants" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const sr = row.screening_result as Record<string, unknown> | null;
          const score =
            sr && typeof sr.score === "string"
              ? (sr.score as string).toUpperCase()
              : null;
          if (score !== "RED") return;
          const grantId = row.id as string;
          if (seenIds.current.has(grantId)) {
            // Update in place so the list reflects the new verdict
            setGrants((prev) =>
              prev.map((g) =>
                g.id === grantId
                  ? {
                      ...g,
                      screening_label: "RED",
                      screening_score:
                        typeof row.screening_score === "number"
                          ? (row.screening_score as number)
                          : g.screening_score,
                      stage: (row.stage as QcGrantRow["stage"]) ?? g.stage,
                      screening_notes:
                        (row.screening_notes as string | null) ??
                        g.screening_notes,
                    }
                  : g,
              ),
            );
          }
          setRedLiveCount((c) => c + 1);
          const orgName = orgMap[row.org_id as string] || "?";
          toast.error(`RED grant in ${orgName}`, {
            description: String(row.id).slice(0, 8) + " — verdict: RED",
            action: {
              label: "View",
              onClick: () => {
                const g = (initialGrants.find((x) => x.id === grantId) ||
                  null) as QcGrantRow | null;
                if (g) setSelected(g);
              },
            },
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "grants" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const sr = row.screening_result as Record<string, unknown> | null;
          const score =
            sr && typeof sr.score === "string"
              ? (sr.score as string).toUpperCase()
              : null;
          if (score !== "RED") return;
          setRedLiveCount((c) => c + 1);
          const orgName = orgMap[row.org_id as string] || "?";
          toast.error(`New RED grant in ${orgName}`, {
            description: "Just inserted with RED verdict",
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, orgMap, initialGrants]);

  // Distinct sources present in current dataset
  const presentSources = useMemo(() => {
    const s = new Set<string>();
    for (const g of grants) if (g.source) s.add(g.source);
    return Array.from(s).sort();
  }, [grants]);

  // Distinct orgs present
  const presentOrgs = useMemo(() => {
    const s = new Set<string>();
    for (const g of grants) s.add(g.org_id);
    return Array.from(s)
      .map((id) => ({ id, name: orgMap[id] || "(unknown)" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [grants, orgMap]);

  // Apply filters
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return grants.filter((g) => {
      if (q) {
        const hay = (
          g.title +
          " " +
          (g.funder_name || "") +
          " " +
          (orgMap[g.org_id] || "")
        ).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (stageFilter.size > 0 && !stageFilter.has(g.stage)) return false;
      if (scoreFilter.size > 0) {
        const lbl = (g.screening_label || "NO_RESULT").toUpperCase() as Score;
        if (!scoreFilter.has(lbl)) return false;
      }
      if (sourceFilter.size > 0 && (!g.source || !sourceFilter.has(g.source)))
        return false;
      if (orgFilter.size > 0 && !orgFilter.has(g.org_id)) return false;
      if (flagFilter.size > 0) {
        const flags = qualityFlags(g).map((f) => f.key);
        let hit = false;
        for (const f of flagFilter) if (flags.includes(f)) hit = true;
        if (!hit) return false;
      }
      return true;
    });
  }, [
    grants,
    search,
    stageFilter,
    scoreFilter,
    sourceFilter,
    orgFilter,
    flagFilter,
    orgMap,
  ]);

  // Stats (computed on filtered set so admins can scope to specific slices)
  const stats = useMemo(() => {
    let red = 0,
      yellow = 0,
      green = 0,
      insuf = 0,
      noResult = 0;
    let confidenceSum = 0,
      confidenceN = 0;
    let falsePositives = 0;
    let stuck = 0;
    const byStage: Record<QcGrantRow["stage"], number> = {
      discovery: 0,
      screening: 0,
      pending_approval: 0,
      drafting: 0,
      submission: 0,
      awarded: 0,
      reporting: 0,
      closed: 0,
      archived: 0,
    };
    for (const g of filtered) {
      const lbl = (g.screening_label || "").toUpperCase();
      if (lbl === "RED") red++;
      else if (lbl === "YELLOW") yellow++;
      else if (lbl === "GREEN") green++;
      else if (lbl === "INSUFFICIENT_DATA") insuf++;
      else noResult++;

      byStage[g.stage] = (byStage[g.stage] ?? 0) + 1;

      if (g.screening_score != null) {
        confidenceSum += g.screening_score;
        confidenceN++;
      }
      const flags = qualityFlags(g);
      if (flags.some((f) => f.key === "false_positive")) falsePositives++;
      if (flags.some((f) => f.key === "stuck" || f.key === "stuck_disc"))
        stuck++;
    }
    const total = filtered.length;
    const screened = green + yellow + red;
    const goodRate = screened > 0
      ? Math.round(((green + yellow) / screened) * 100)
      : null;
    const avgConf = confidenceN > 0 ? Math.round(confidenceSum / confidenceN) : null;
    return {
      total,
      red,
      yellow,
      green,
      insuf,
      noResult,
      inScreening: byStage.screening,
      inPendingApproval: byStage.pending_approval,
      goodRate,
      avgConf,
      falsePositives,
      stuck,
      byStage,
    };
  }, [filtered]);

  // Grouping
  const groups = useMemo(() => {
    if (groupBy === "none") return null;
    const map = new Map<string, QcGrantRow[]>();
    for (const g of filtered) {
      let key: string;
      switch (groupBy) {
        case "org":
          key = orgMap[g.org_id] || g.org_id;
          break;
        case "stage":
          key = g.stage;
          break;
        case "score":
          key = (g.screening_label || "NO_RESULT").toUpperCase();
          break;
        case "source":
          key = g.source || "(no source)";
          break;
        case "funder":
          key = g.funder_name || "(no funder)";
          break;
        case "day":
          key = g.created_at ? g.created_at.slice(0, 10) : "(no date)";
          break;
        case "fit_bucket":
          if (g.fit_score == null) key = "no fit_score";
          else if (g.fit_score >= 85) key = "fit 85+";
          else if (g.fit_score >= 70) key = "fit 70-84";
          else if (g.fit_score >= 50) key = "fit 50-69";
          else key = "fit <50";
          break;
        default:
          key = "(none)";
      }
      const arr = map.get(key) || [];
      arr.push(g);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .map(([key, items]) => ({ key, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [filtered, groupBy, orgMap]);

  const toggleSet = <T extends string>(
    setter: React.Dispatch<React.SetStateAction<Set<T>>>,
    value: T,
  ) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  const clearAllFilters = () => {
    setSearch("");
    setStageFilter(new Set());
    setScoreFilter(new Set());
    setSourceFilter(new Set());
    setOrgFilter(new Set());
    setFlagFilter(new Set());
  };

  const totalFilters =
    (search ? 1 : 0) +
    stageFilter.size +
    scoreFilter.size +
    sourceFilter.size +
    orgFilter.size +
    flagFilter.size;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">
          Grant Quality Control
        </h1>
        <Badge variant="outline" className="font-mono uppercase text-[10px]">
          live
        </Badge>
        <p className="text-xs text-muted-foreground">
          Screen, audit, and triage grants across every org. Real-time RED
          alerts. Filter, group, and drill into any pickup.
        </p>
        <Badge
          variant="outline"
          className="font-mono uppercase text-[10px] border-border text-muted-foreground"
        >
          source-fetched only · manual entries excluded
        </Badge>
      </div>

      {/* Date range pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Date range
        </span>
        <div className="inline-flex flex-wrap rounded-md border border-border p-0.5">
          {PRESETS.map((p) => (
            <Link
              key={p.value}
              href={`/admin/grant-quality?preset=${p.value}`}
              className={`px-2.5 py-1 text-xs font-mono uppercase rounded ${
                filters.preset === p.value
                  ? "bg-foreground/[0.06] text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          {filters.preset === "live"
            ? "today (live)"
            : `${filters.from} → ${filters.to} UTC`}
        </span>
        {capped && (
          <Badge
            variant="outline"
            className="font-mono uppercase text-[10px] border-amber-300 text-amber-700"
          >
            capped at 2000
          </Badge>
        )}
        {redLiveCount > 0 && (
          <Badge
            variant="secondary"
            className="font-mono uppercase text-[10px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            <Siren className="h-3 w-3 mr-1" />
            {redLiveCount} live RED alert{redLiveCount === 1 ? "" : "s"}
          </Badge>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={<Package className="h-4 w-4" />}
          label="In range"
          value={String(stats.total)}
          sub={`${stats.inScreening} screening · ${stats.inPendingApproval} pending`}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          label="GREEN"
          value={String(stats.green)}
          sub="auto-promoted"
        />
        <StatCard
          icon={<Shield className="h-4 w-4 text-yellow-600" />}
          label="YELLOW"
          value={String(stats.yellow)}
          sub="needs review"
        />
        <StatCard
          icon={<XCircle className="h-4 w-4 text-red-600" />}
          label="RED"
          value={String(stats.red)}
          sub="rejected"
          accent="danger"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          label="False-positives"
          value={String(stats.falsePositives)}
          sub="discovery≥70 → screen RED"
          accent={stats.falsePositives > 0 ? "warn" : undefined}
        />
        <StatCard
          icon={<RefreshCw className="h-4 w-4" />}
          label="Discovery good rate"
          value={stats.goodRate == null ? "—" : `${stats.goodRate}%`}
          sub={
            stats.avgConf == null
              ? "no screened grants yet"
              : `avg conf ${stats.avgConf}`
          }
        />
      </div>

      {/* Stage distribution */}
      <StageDistributionCard
        byStage={stats.byStage}
        total={stats.total}
        activeFilter={stageFilter}
        onToggleStage={(s) => toggleSet(setStageFilter, s)}
      />

      {/* Search + filter bar */}
      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, funder, or org…"
                className="pl-8 h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Group className="h-4 w-4 text-muted-foreground" />
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {GROUP_BYS.map((g) => (
                  <option key={g.value} value={g.value}>
                    Group: {g.label}
                  </option>
                ))}
              </select>
            </div>
            {totalFilters > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <Filter className="h-3 w-3" />
                clear {totalFilters}
              </button>
            )}
          </div>

          <FilterRow
            label="Stage"
            options={STAGES.map((s) => ({
              value: s,
              label: s.replace(/_/g, " "),
            }))}
            selected={stageFilter}
            onToggle={(v) => toggleSet(setStageFilter, v as QcGrantRow["stage"])}
          />
          <FilterRow
            label="Score"
            options={SCORES.map((s) => ({
              value: s,
              label: s.replace(/_/g, " "),
            }))}
            selected={scoreFilter}
            onToggle={(v) => toggleSet(setScoreFilter, v as Score)}
          />
          {presentSources.length > 0 && (
            <FilterRow
              label="Source"
              options={presentSources.map((s) => ({ value: s, label: s }))}
              selected={sourceFilter}
              onToggle={(v) => toggleSet(setSourceFilter, v)}
            />
          )}
          {presentOrgs.length > 1 && (
            <FilterRow
              label="Org"
              options={presentOrgs.map((o) => ({
                value: o.id,
                label: o.name,
              }))}
              selected={orgFilter}
              onToggle={(v) => toggleSet(setOrgFilter, v)}
            />
          )}
          <FilterRow
            label="Flag"
            options={[
              { value: "false_positive", label: "discovery false-positive" },
              { value: "stuck", label: "stuck >24h in screening" },
              { value: "stuck_disc", label: "stuck in discovery" },
              { value: "no_sanity", label: "pre-sanity-check" },
              { value: "good_match", label: "strong match" },
            ]}
            selected={flagFilter}
            onToggle={(v) => toggleSet(setFlagFilter, v)}
          />
        </CardContent>
      </Card>

      {/* Results */}
      {loadError && (
        <Card>
          <CardContent className="py-4 text-sm text-red-500">
            Failed to load grants: {loadError}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Pipeline grants
            </CardTitle>
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {filtered.length} of {grants.length}{" "}
              {filtered.length === 1 ? "row" : "rows"}
              {groupBy !== "none" && groups && ` · ${groups.length} groups`}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No grants match these filters.
            </div>
          ) : groupBy === "none" || !groups ? (
            <FlatTable rows={filtered} orgMap={orgMap} onRowClick={setSelected} />
          ) : (
            <GroupedTable
              groups={groups}
              orgMap={orgMap}
              onRowClick={setSelected}
            />
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
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
          {selected && (
            <DetailBody grant={selected} orgName={orgMap[selected.org_id]} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ----- Sub-components -----

function FilterRow({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground w-12 shrink-0">
        {label}
      </span>
      {options.map((o) => {
        const active = selected.has(o.value);
        return (
          <button
            key={o.value}
            onClick={() => onToggle(o.value)}
            className={`px-2 py-0.5 rounded-md border text-[11px] font-mono uppercase tracking-tight transition-colors ${
              active
                ? "border-foreground bg-foreground/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function FlatTable({
  rows,
  orgMap,
  onRowClick,
}: {
  rows: QcGrantRow[];
  orgMap: Record<string, string>;
  onRowClick: (g: QcGrantRow) => void;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Table className="min-w-[1000px]">
        <TableHeader>
          <TableRow>
            <TableHead>Title / Funder</TableHead>
            <TableHead className="w-32">Org</TableHead>
            <TableHead className="w-32">Stage</TableHead>
            <TableHead className="w-32">Score</TableHead>
            <TableHead className="w-24">Disc fit</TableHead>
            <TableHead className="w-28">Source</TableHead>
            <TableHead className="w-32">Flags</TableHead>
            <TableHead className="w-24">Picked up</TableHead>
            <TableHead className="w-16 text-right">Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((g) => (
            <GrantRowEl
              key={g.id}
              g={g}
              orgName={orgMap[g.org_id]}
              onClick={() => onRowClick(g)}
            />
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}

function GroupedTable({
  groups,
  orgMap,
  onRowClick,
}: {
  groups: Array<{ key: string; items: QcGrantRow[] }>;
  orgMap: Record<string, string>;
  onRowClick: (g: QcGrantRow) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (k: string) =>
    setExpanded((p) => {
      const n = new Set(p);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <TooltipProvider delayDuration={150}>
      <Table className="min-w-[1000px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Group</TableHead>
            <TableHead className="w-20 text-center">Count</TableHead>
            <TableHead>Score breakdown</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((g) => {
            const open = expanded.has(g.key);
            const breakdown = scoreBreakdown(g.items);
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
                  <TableCell className="font-medium text-sm">
                    {g.key}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {g.items.length}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {(["GREEN", "YELLOW", "RED", "INSUFFICIENT_DATA"] as const).map(
                        (s) =>
                          breakdown[s] > 0 ? (
                            <ScoreBadge
                              key={s}
                              label={s}
                              score={null}
                              suffix={String(breakdown[s])}
                            />
                          ) : null,
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                {open && (
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableCell></TableCell>
                    <TableCell colSpan={3} className="py-0">
                      <Table className="my-2">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title / Funder</TableHead>
                            <TableHead className="w-32">Org</TableHead>
                            <TableHead className="w-32">Stage</TableHead>
                            <TableHead className="w-32">Score</TableHead>
                            <TableHead className="w-24">Disc fit</TableHead>
                            <TableHead className="w-28">Source</TableHead>
                            <TableHead className="w-32">Flags</TableHead>
                            <TableHead className="w-24">Picked up</TableHead>
                            <TableHead className="w-16 text-right">
                              Detail
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {g.items.map((row) => (
                            <GrantRowEl
                              key={row.id}
                              g={row}
                              orgName={orgMap[row.org_id]}
                              onClick={() => onRowClick(row)}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}

function GrantRowEl({
  g,
  orgName,
  onClick,
}: {
  g: QcGrantRow;
  orgName: string | undefined;
  onClick: () => void;
}) {
  const flags = qualityFlags(g);
  return (
    <TableRow className="cursor-pointer hover:bg-muted/40" onClick={onClick}>
      <TableCell className="max-w-[420px]">
        <div className="font-medium text-xs line-clamp-1">{g.title}</div>
        {g.funder_name && (
          <div className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
            {g.funder_name}
          </div>
        )}
      </TableCell>
      <TableCell className="text-xs">
        {orgName || (
          <span className="text-muted-foreground">{g.org_id.slice(0, 8)}</span>
        )}
      </TableCell>
      <TableCell>
        <StageBadge stage={g.stage} />
      </TableCell>
      <TableCell>
        <ScoreBadge label={g.screening_label} score={g.screening_score} />
      </TableCell>
      <TableCell className="text-xs font-mono">
        {g.fit_score == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span
            className={
              g.fit_score >= 85
                ? "text-emerald-600"
                : g.fit_score >= 65
                  ? "text-yellow-600"
                  : "text-red-600"
            }
          >
            {g.fit_score}
          </span>
        )}
      </TableCell>
      <TableCell className="text-xs font-mono text-muted-foreground">
        {g.source || "—"}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {flags.length === 0 ? (
            <span className="text-muted-foreground text-xs">—</span>
          ) : (
            flags.map((f) => (
              <Tooltip key={f.key}>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] font-mono uppercase ${flagToneClass(f.tone)}`}
                  >
                    {flagIcon(f)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <span className="text-xs">{f.label}</span>
                </TooltipContent>
              </Tooltip>
            ))
          )}
        </div>
      </TableCell>
      <TableCell
        className="text-xs text-muted-foreground whitespace-nowrap"
        title={g.created_at ? new Date(g.created_at).toLocaleString() : undefined}
      >
        {g.created_at ? formatTimeAgo(g.created_at) : "—"}
      </TableCell>
      <TableCell className="text-right">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <Eye className="h-3 w-3" /> View
        </button>
      </TableCell>
    </TableRow>
  );
}

function DetailBody({
  grant,
  orgName,
}: {
  grant: QcGrantRow;
  orgName: string | undefined;
}) {
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
        {qualityFlags(grant).map((f) => (
          <Badge
            key={f.key}
            variant="secondary"
            className={`text-[10px] font-mono uppercase ${flagToneClass(f.tone)}`}
          >
            {f.label}
          </Badge>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <DetailRow label="Org" value={orgName || grant.org_id} />
        <DetailRow label="Funder" value={grant.funder_name} />
        <DetailRow label="Amount" value={grant.amount} />
        <DetailRow label="Deadline" value={grant.deadline} />
        <DetailRow
          label="Picked up"
          value={
            grant.created_at ? new Date(grant.created_at).toLocaleString() : null
          }
        />
        <DetailRow
          label="Updated"
          value={
            grant.updated_at ? new Date(grant.updated_at).toLocaleString() : null
          }
        />
        <DetailRow label="Grant ID" value={grant.id} mono />
        <DetailRow
          label="Data quality"
          value={grant.data_quality}
          mono
        />
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
              <li key={i}>{typeof r === "string" ? r : JSON.stringify(r)}</li>
            ))}
          </ul>
        </div>
      )}

      {(grant.fit_score != null ||
        grant.sanity_pass != null ||
        grant.filter_reason) && (
        <div className="rounded-md border border-dashed border-border p-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Discovery filter audit
          </p>
          {grant.fit_score != null && (
            <DetailRow label="Fit score" value={String(grant.fit_score)} mono />
          )}
          {grant.filter_reason && (
            <DetailRow label="Filter reason" value={grant.filter_reason} />
          )}
          {grant.sanity_pass != null && (
            <DetailRow
              label="Sanity pass"
              value={grant.sanity_pass ? "yes" : "no"}
              mono
            />
          )}
          {grant.sanity_reason && (
            <DetailRow label="Sanity reason" value={grant.sanity_reason} />
          )}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Link
          href={`/admin/fetch-queue/${grant.org_id}`}
          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" /> View {orgName || "org"} fetch
          history
        </Link>
        <Link
          href={`/admin/organizations/${grant.org_id}?from=grant-quality`}
          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" /> Open org profile
        </Link>
      </div>
    </div>
  );
}

// ----- Helpers / badges -----

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: "danger" | "warn";
}) {
  const border =
    accent === "danger"
      ? "border-red-300"
      : accent === "warn"
        ? "border-amber-300"
        : "";
  return (
    <Card className={border}>
      <CardContent className="pt-4 pb-3">
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

// Single source of truth for stage colors so the card, badge, and stacked
// bar all stay in sync.
const STAGE_COLORS: Record<
  QcGrantRow["stage"],
  { bar: string; text: string; bg: string }
> = {
  discovery: {
    bar: "bg-slate-400",
    bg: "bg-slate-100 dark:bg-slate-900",
    text: "text-slate-700 dark:text-slate-300",
  },
  screening: {
    bar: "bg-amber-400",
    bg: "bg-amber-100 dark:bg-amber-950",
    text: "text-amber-700 dark:text-amber-300",
  },
  pending_approval: {
    bar: "bg-blue-500",
    bg: "bg-blue-100 dark:bg-blue-950",
    text: "text-blue-700 dark:text-blue-300",
  },
  drafting: {
    bar: "bg-purple-500",
    bg: "bg-purple-100 dark:bg-purple-950",
    text: "text-purple-700 dark:text-purple-300",
  },
  submission: {
    bar: "bg-indigo-500",
    bg: "bg-indigo-100 dark:bg-indigo-950",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  awarded: {
    bar: "bg-emerald-500",
    bg: "bg-emerald-100 dark:bg-emerald-950",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  reporting: {
    bar: "bg-cyan-500",
    bg: "bg-cyan-100 dark:bg-cyan-950",
    text: "text-cyan-700 dark:text-cyan-300",
  },
  closed: {
    bar: "bg-zinc-400",
    bg: "bg-muted",
    text: "text-muted-foreground",
  },
  archived: {
    bar: "bg-zinc-300",
    bg: "bg-muted",
    text: "text-muted-foreground",
  },
};

function StageDistributionCard({
  byStage,
  total,
  activeFilter,
  onToggleStage,
}: {
  byStage: Record<QcGrantRow["stage"], number>;
  total: number;
  activeFilter: Set<QcGrantRow["stage"]>;
  onToggleStage: (stage: QcGrantRow["stage"]) => void;
}) {
  // Render in a fixed pipeline order; only show stages that have at least one grant.
  const ordered: QcGrantRow["stage"][] = [
    "discovery",
    "screening",
    "pending_approval",
    "drafting",
    "submission",
    "awarded",
    "reporting",
    "closed",
    "archived",
  ];
  const present = ordered.filter((s) => (byStage[s] ?? 0) > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-3.5 w-3.5" /> Stage distribution
          </CardTitle>
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            {total} {total === 1 ? "grant" : "grants"} in scope
            {present.length > 0 && " · click a segment to filter"}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {total === 0 ? (
          <p className="text-xs text-muted-foreground">
            No grants in scope.
          </p>
        ) : (
          <TooltipProvider delayDuration={150}>
            {/* Stacked horizontal bar — segment widths proportional to share. */}
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              {present.map((s) => {
                const n = byStage[s] ?? 0;
                const pct = (n / total) * 100;
                return (
                  <Tooltip key={s}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onToggleStage(s)}
                        style={{ width: `${pct}%` }}
                        className={`${STAGE_COLORS[s].bar} hover:opacity-80 transition-opacity ${
                          activeFilter.has(s) ? "ring-2 ring-foreground/40" : ""
                        }`}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <span className="text-xs font-mono">
                        {s.replace(/_/g, " ")}: {n} ({pct.toFixed(1)}%)
                      </span>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* Per-stage chips: count + percentage, click to add to stage filter. */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {present.map((s) => {
                const n = byStage[s] ?? 0;
                const pct = (n / total) * 100;
                const active = activeFilter.has(s);
                return (
                  <button
                    key={s}
                    onClick={() => onToggleStage(s)}
                    className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] font-mono uppercase transition-colors ${
                      active
                        ? "border-foreground bg-foreground/10"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${STAGE_COLORS[s].bar}`}
                    />
                    <span className={STAGE_COLORS[s].text}>
                      {s.replace(/_/g, " ")}
                    </span>
                    <span className="font-bold">{n}</span>
                    <span className="text-muted-foreground">
                      {pct.toFixed(1)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}

function StageBadge({ stage }: { stage: QcGrantRow["stage"] }) {
  const cls: Record<QcGrantRow["stage"], string> = {
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
  suffix,
}: {
  label: string | null;
  score: number | null;
  suffix?: string;
}) {
  if (!label && score == null && !suffix) {
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
      {suffix && <span className="ml-1 opacity-70">×{suffix}</span>}
    </Badge>
  );
}

function flagToneClass(tone: QualityFlag["tone"]) {
  switch (tone) {
    case "danger":
      return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
    case "warn":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    case "ok":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300";
  }
}

function flagIcon(f: QualityFlag) {
  if (f.key === "false_positive")
    return <ShieldAlert className="h-3 w-3" />;
  if (f.key === "stuck" || f.key === "stuck_disc")
    return <AlertTriangle className="h-3 w-3" />;
  if (f.key === "good_match") return <CheckCircle2 className="h-3 w-3" />;
  return <Shield className="h-3 w-3" />;
}

function scoreBreakdown(items: QcGrantRow[]) {
  const out: Record<string, number> = {
    GREEN: 0,
    YELLOW: 0,
    RED: 0,
    INSUFFICIENT_DATA: 0,
    NO_RESULT: 0,
  };
  for (const g of items) {
    const lbl = (g.screening_label || "NO_RESULT").toUpperCase();
    if (lbl in out) out[lbl]++;
    else out.NO_RESULT++;
  }
  return out;
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
    <div className="flex items-start gap-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-28 shrink-0 pt-0.5">
        {label}
      </p>
      <p className={`text-sm flex-1 ${mono ? "font-mono break-all" : ""}`}>
        {value || <span className="text-muted-foreground italic">—</span>}
      </p>
    </div>
  );
}
