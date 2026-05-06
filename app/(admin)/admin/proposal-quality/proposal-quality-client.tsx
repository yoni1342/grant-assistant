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
  Award,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Group,
  Lightbulb,
  Search,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils/format";
import { Input } from "@/components/ui/input";

// ----- Public types -----

export interface PqOrgRow {
  id: string;
  name: string;
  sector: string | null;
}

export interface SectionScore {
  section: string;
  score: number | null;
  feedback: string | null;
}

export interface ProposalIssue {
  type: string;
  severity: string | null;
  text: string | null;
  suggestion: string | null;
  section: string | null;
}

export interface PqProposalRow {
  id: string;
  org_id: string;
  grant_id: string;
  title: string | null;
  grant_title: string | null;
  funder_name: string | null;
  status: string;
  approval_status: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  outcome: string | null;
  outcome_at: string | null;
  outcome_notes: string | null;
  quality_score: number | null;
  section_scores: SectionScore[];
  issues: ProposalIssue[];
  strengths: string[];
  weaknesses: string[];
  quick_wins: string[];
  summary: string | null;
  recommendation: string | null;
  improved_opening: string | null;
  improved_closing: string | null;
  story_suggestion: string | null;
  section_count: number;
  created_at: string | null;
  updated_at: string | null;
}

// ----- Constants -----

const STATUSES = [
  "draft",
  "generating",
  "ready",
  "submitted",
  "approved",
  "archived",
] as const;

const QUALITY_BUCKETS = [
  { value: "good", label: "Good (80+)", min: 80, max: 100 },
  { value: "fair", label: "Fair (60-79)", min: 60, max: 79.999 },
  { value: "critical", label: "Critical (<60)", min: 0, max: 59.999 },
  { value: "no_review", label: "Not reviewed", min: -1, max: -1 },
] as const;
type QualityBucket = (typeof QUALITY_BUCKETS)[number]["value"];

const ISSUE_TYPES = [
  "JARGON",
  "PASSIVE_VOICE",
  "REPETITION",
  "VAGUE_CLAIMS",
  "WEAK_VERBS",
  "OTHER",
] as const;

const OUTCOMES = ["awarded", "rejected", "withdrawn", "pending"] as const;

const FLAG_OPTIONS = [
  { value: "critical", label: "critical-quality" },
  { value: "no_critic", label: "no critic review" },
  { value: "stuck_generating", label: "generating >30m" },
  { value: "weak_section", label: "section <50" },
  { value: "won", label: "awarded" },
  { value: "lost", label: "rejected" },
  { value: "ready", label: "award-ready (≥80)" },
] as const;

const GROUP_BYS = [
  { value: "none", label: "None" },
  { value: "org", label: "Organization" },
  { value: "status", label: "Status" },
  { value: "quality", label: "Quality bucket" },
  { value: "outcome", label: "Outcome" },
  { value: "funder", label: "Funder" },
  { value: "weakest", label: "Weakest dimension" },
  { value: "day", label: "Day created" },
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

// Five canonical critic dimensions (in display order)
const CRITIC_DIMENSIONS = [
  "Clarity",
  "Persuasiveness",
  "Specificity",
  "Emotional Appeal",
  "Funder Alignment",
] as const;

// ----- Quality flags / helpers -----

interface QualityFlag {
  key: string;
  label: string;
  tone: "danger" | "warn" | "info" | "ok" | "win";
}

function qualityFlags(p: PqProposalRow): QualityFlag[] {
  const flags: QualityFlag[] = [];
  if (p.quality_score != null && p.quality_score < 60) {
    flags.push({ key: "critical", label: "critical quality", tone: "danger" });
  }
  if (p.quality_score != null && p.quality_score >= 80) {
    flags.push({ key: "ready", label: "award-ready", tone: "ok" });
  }
  if (
    (p.status === "ready" || p.status === "submitted") &&
    p.quality_score == null
  ) {
    flags.push({ key: "no_critic", label: "no critic review", tone: "warn" });
  }
  if (p.status === "generating" && p.created_at) {
    const ageMin = (Date.now() - new Date(p.created_at).getTime()) / 60000;
    if (ageMin > 30) {
      flags.push({
        key: "stuck_generating",
        label: "stuck generating",
        tone: "warn",
      });
    }
  }
  if (p.outcome === "awarded") flags.push({ key: "won", label: "awarded", tone: "win" });
  if (p.outcome === "rejected") flags.push({ key: "lost", label: "rejected", tone: "danger" });
  // Section weakness: any single section < 50
  if (p.section_scores.some((s) => s.score != null && s.score < 50)) {
    flags.push({ key: "weak_section", label: "weak section", tone: "warn" });
  }
  return flags;
}

function qualityBucket(score: number | null): QualityBucket {
  if (score == null) return "no_review";
  if (score >= 80) return "good";
  if (score >= 60) return "fair";
  return "critical";
}

function weakestDimension(p: PqProposalRow): string | null {
  if (p.section_scores.length === 0) return null;
  let lowest: SectionScore | null = null;
  for (const s of p.section_scores) {
    if (s.score == null) continue;
    if (!lowest || (lowest.score ?? 0) > s.score) lowest = s;
  }
  return lowest ? lowest.section : null;
}

function findIssueTypes(p: PqProposalRow): Set<string> {
  const set = new Set<string>();
  for (const i of p.issues) set.add((i.type || "OTHER").toUpperCase());
  return set;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300";
    case "generating":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
    case "ready":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
    case "submitted":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300";
    case "approved":
      return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300";
    case "archived":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function qualityColor(score: number | null) {
  if (score == null) return "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300";
  if (score >= 80)
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  if (score >= 60)
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
  return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
}

function flagToneClass(tone: QualityFlag["tone"]) {
  switch (tone) {
    case "danger":
      return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
    case "warn":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    case "ok":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
    case "win":
      return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300";
  }
}

// ----- Main component -----

export function ProposalQualityClient({
  proposals: initialProposals,
  orgs,
  loadError,
  capped,
  filters,
}: {
  proposals: PqProposalRow[];
  orgs: PqOrgRow[];
  loadError: string | null;
  capped: boolean;
  filters: { preset: string; from: string; to: string };
}) {
  const supabase = useMemo(() => createClient(), []);
  const [proposals, setProposals] = useState<PqProposalRow[]>(initialProposals);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [bucketFilter, setBucketFilter] = useState<Set<QualityBucket>>(new Set());
  const [orgFilter, setOrgFilter] = useState<Set<string>>(new Set());
  const [outcomeFilter, setOutcomeFilter] = useState<Set<string>>(new Set());
  const [issueFilter, setIssueFilter] = useState<Set<string>>(new Set());
  const [flagFilter, setFlagFilter] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [selected, setSelected] = useState<PqProposalRow | null>(null);
  const [liveAlertCount, setLiveAlertCount] = useState(0);
  const proposalIndex = useRef<Map<string, PqProposalRow>>(
    new Map(initialProposals.map((p) => [p.id, p])),
  );

  const orgMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const o of orgs) m[o.id] = o.name;
    return m;
  }, [orgs]);

  // Real-time: notify on critical-quality, awarded, submitted, generating-stuck transitions.
  useEffect(() => {
    const channel = supabase
      .channel("admin-proposal-quality")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "proposals" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const id = row.id as string;
          const newScore =
            typeof row.quality_score === "number"
              ? (row.quality_score as number)
              : null;
          const newStatus = (row.status as string | null) ?? null;
          const newOutcome = (row.outcome as string | null) ?? null;
          const orgName = orgMap[row.org_id as string] || "?";

          // Critical-quality alert: score arrived and it's <60
          const prev = proposalIndex.current.get(id);
          const prevScore = prev?.quality_score ?? null;
          if (
            newScore != null &&
            newScore < 60 &&
            (prevScore == null || prevScore >= 60)
          ) {
            setLiveAlertCount((c) => c + 1);
            toast.error(`Critical-quality proposal in ${orgName}`, {
              description: `${prev?.title || "Untitled"} — ${newScore}/100`,
              action: {
                label: "View",
                onClick: () => prev && setSelected(prev),
              },
            });
          }
          // Outcome flips
          if (newOutcome === "awarded" && prev?.outcome !== "awarded") {
            toast.success(`Proposal awarded — ${orgName}`, {
              description: prev?.title || "Untitled",
            });
          }
          if (newOutcome === "rejected" && prev?.outcome !== "rejected") {
            toast.error(`Proposal rejected — ${orgName}`, {
              description: prev?.title || "Untitled",
            });
          }
          // Submitted transition
          if (newStatus === "submitted" && prev?.status !== "submitted") {
            toast.info(`Proposal submitted — ${orgName}`, {
              description: prev?.title || "Untitled",
            });
          }
          // Mutate in place if visible
          if (prev) {
            const updated = {
              ...prev,
              quality_score: newScore ?? prev.quality_score,
              status: newStatus ?? prev.status,
              outcome: newOutcome ?? prev.outcome,
            };
            proposalIndex.current.set(id, updated);
            setProposals((cur) => cur.map((p) => (p.id === id ? updated : p)));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, orgMap]);

  const presentOrgs = useMemo(() => {
    const s = new Set<string>();
    for (const p of proposals) s.add(p.org_id);
    return Array.from(s)
      .map((id) => ({ id, name: orgMap[id] || "(unknown)" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [proposals, orgMap]);

  const presentStatuses = useMemo(() => {
    const s = new Set<string>();
    for (const p of proposals) s.add(p.status);
    return Array.from(s).sort();
  }, [proposals]);

  // Apply filters
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return proposals.filter((p) => {
      if (q) {
        const hay = (
          (p.title || "") +
          " " +
          (p.grant_title || "") +
          " " +
          (p.funder_name || "") +
          " " +
          (orgMap[p.org_id] || "")
        ).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter.size > 0 && !statusFilter.has(p.status)) return false;
      if (bucketFilter.size > 0 && !bucketFilter.has(qualityBucket(p.quality_score)))
        return false;
      if (orgFilter.size > 0 && !orgFilter.has(p.org_id)) return false;
      if (outcomeFilter.size > 0) {
        const oc = p.outcome || "pending";
        if (!outcomeFilter.has(oc)) return false;
      }
      if (issueFilter.size > 0) {
        const types = findIssueTypes(p);
        let hit = false;
        for (const t of issueFilter) if (types.has(t)) hit = true;
        if (!hit) return false;
      }
      if (flagFilter.size > 0) {
        const flags = qualityFlags(p).map((f) => f.key);
        let hit = false;
        for (const f of flagFilter) if (flags.includes(f)) hit = true;
        if (!hit) return false;
      }
      return true;
    });
  }, [
    proposals,
    search,
    statusFilter,
    bucketFilter,
    orgFilter,
    outcomeFilter,
    issueFilter,
    flagFilter,
    orgMap,
  ]);

  // Stats over filtered set
  const stats = useMemo(() => {
    const total = filtered.length;
    let scored = 0,
      sumScore = 0;
    let critical = 0,
      fair = 0,
      good = 0,
      noReview = 0;
    let submitted = 0,
      awarded = 0,
      rejected = 0;
    let totalIssues = 0;
    const sectionTotals: Record<string, { sum: number; n: number }> = {};
    const issueByType: Record<string, number> = {};
    for (const p of filtered) {
      if (p.quality_score != null) {
        scored++;
        sumScore += p.quality_score;
      } else noReview++;
      const b = qualityBucket(p.quality_score);
      if (b === "good") good++;
      else if (b === "fair") fair++;
      else if (b === "critical") critical++;

      if (p.status === "submitted") submitted++;
      if (p.outcome === "awarded") awarded++;
      if (p.outcome === "rejected") rejected++;

      totalIssues += p.issues.length;
      for (const i of p.issues) {
        const k = (i.type || "OTHER").toUpperCase();
        issueByType[k] = (issueByType[k] ?? 0) + 1;
      }
      for (const s of p.section_scores) {
        if (s.score == null) continue;
        const acc = sectionTotals[s.section] ?? { sum: 0, n: 0 };
        acc.sum += s.score;
        acc.n += 1;
        sectionTotals[s.section] = acc;
      }
    }
    const avgScore = scored > 0 ? Math.round(sumScore / scored) : null;
    const sectionAvgs = Object.entries(sectionTotals)
      .map(([section, v]) => ({ section, avg: Math.round(v.sum / v.n) }))
      .sort((a, b) => a.avg - b.avg);
    const winRate =
      submitted + awarded > 0
        ? Math.round((awarded / Math.max(awarded + rejected, 1)) * 100)
        : null;
    return {
      total,
      scored,
      avgScore,
      critical,
      fair,
      good,
      noReview,
      submitted,
      awarded,
      rejected,
      totalIssues,
      issueByType,
      sectionAvgs,
      winRate,
    };
  }, [filtered]);

  // Org leaderboard (orgs with ≥2 proposals)
  const orgLeaderboard = useMemo(() => {
    const byOrg = new Map<
      string,
      { sum: number; n: number; org_id: string; awarded: number }
    >();
    for (const p of filtered) {
      if (p.quality_score == null) continue;
      const cur = byOrg.get(p.org_id) || {
        sum: 0,
        n: 0,
        org_id: p.org_id,
        awarded: 0,
      };
      cur.sum += p.quality_score;
      cur.n += 1;
      if (p.outcome === "awarded") cur.awarded += 1;
      byOrg.set(p.org_id, cur);
    }
    const arr = Array.from(byOrg.values())
      .filter((x) => x.n >= 2)
      .map((x) => ({
        org_id: x.org_id,
        name: orgMap[x.org_id] || x.org_id,
        avg: Math.round(x.sum / x.n),
        n: x.n,
        awarded: x.awarded,
      }));
    return {
      top: [...arr].sort((a, b) => b.avg - a.avg).slice(0, 5),
      bottom: [...arr].sort((a, b) => a.avg - b.avg).slice(0, 5),
    };
  }, [filtered, orgMap]);

  // Grouping
  const groups = useMemo(() => {
    if (groupBy === "none") return null;
    const map = new Map<string, PqProposalRow[]>();
    for (const p of filtered) {
      let key: string;
      switch (groupBy) {
        case "org":
          key = orgMap[p.org_id] || p.org_id;
          break;
        case "status":
          key = p.status;
          break;
        case "quality":
          key = qualityBucket(p.quality_score);
          break;
        case "outcome":
          key = p.outcome || "pending";
          break;
        case "funder":
          key = p.funder_name || "(no funder)";
          break;
        case "weakest":
          key = weakestDimension(p) || "(no review)";
          break;
        case "day":
          key = p.created_at ? p.created_at.slice(0, 10) : "(no date)";
          break;
        default:
          key = "(none)";
      }
      const arr = map.get(key) || [];
      arr.push(p);
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
    setStatusFilter(new Set());
    setBucketFilter(new Set());
    setOrgFilter(new Set());
    setOutcomeFilter(new Set());
    setIssueFilter(new Set());
    setFlagFilter(new Set());
  };

  const totalFilters =
    (search ? 1 : 0) +
    statusFilter.size +
    bucketFilter.size +
    orgFilter.size +
    outcomeFilter.size +
    issueFilter.size +
    flagFilter.size;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">
          Proposal Quality Control
        </h1>
        <Badge variant="outline" className="font-mono uppercase text-[10px]">
          live
        </Badge>
        <p className="text-xs text-muted-foreground">
          Audit AI critic verdicts, surface weak proposals, track outcomes
          across every org.
        </p>
      </div>

      {/* Date pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Date range
        </span>
        <div className="inline-flex flex-wrap rounded-md border border-border p-0.5">
          {PRESETS.map((p) => (
            <Link
              key={p.value}
              href={`/admin/proposal-quality?preset=${p.value}`}
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
        {liveAlertCount > 0 && (
          <Badge
            variant="secondary"
            className="font-mono uppercase text-[10px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            <CircleAlert className="h-3 w-3 mr-1" />
            {liveAlertCount} live critical alert{liveAlertCount === 1 ? "" : "s"}
          </Badge>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="In range"
          value={String(stats.total)}
          sub={`${stats.scored} reviewed · ${stats.noReview} pending`}
        />
        <StatCard
          icon={<Sparkles className="h-4 w-4 text-emerald-600" />}
          label="Avg quality"
          value={stats.avgScore == null ? "—" : `${stats.avgScore}`}
          sub={
            stats.scored > 0
              ? `over ${stats.scored} reviewed`
              : "no critic runs yet"
          }
          accent={
            stats.avgScore != null && stats.avgScore < 60 ? "warn" : undefined
          }
        />
        <StatCard
          icon={<XCircle className="h-4 w-4 text-red-600" />}
          label="Critical"
          value={String(stats.critical)}
          sub={`${stats.good} good · ${stats.fair} fair`}
          accent={stats.critical > 0 ? "danger" : undefined}
        />
        <StatCard
          icon={<CircleAlert className="h-4 w-4 text-amber-600" />}
          label="Issues flagged"
          value={String(stats.totalIssues)}
          sub={
            Object.keys(stats.issueByType).length > 0
              ? `${Object.keys(stats.issueByType).length} types`
              : "none"
          }
        />
        <StatCard
          icon={<Trophy className="h-4 w-4 text-purple-600" />}
          label="Outcomes"
          value={`${stats.awarded}–${stats.rejected}`}
          sub={
            stats.winRate == null
              ? `${stats.submitted} submitted`
              : `win rate ${stats.winRate}%`
          }
        />
        <StatCard
          icon={<Award className="h-4 w-4" />}
          label="Critic coverage"
          value={
            stats.total > 0
              ? `${Math.round((stats.scored / stats.total) * 100)}%`
              : "—"
          }
          sub={`${stats.scored}/${stats.total} reviewed`}
        />
      </div>

      {/* Section averages + issue distribution + leaderboard */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" /> Section averages
            </CardTitle>
            <p className="font-mono text-[10px] uppercase text-muted-foreground">
              avg score across reviewed proposals
            </p>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {stats.sectionAvgs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No critic data yet.
              </p>
            ) : (
              CRITIC_DIMENSIONS.map((dim) => {
                const found = stats.sectionAvgs.find((s) => s.section === dim);
                return (
                  <SectionAvgRow
                    key={dim}
                    dimension={dim}
                    avg={found ? found.avg : null}
                  />
                );
              })
            )}
            {stats.sectionAvgs
              .filter(
                (s) => !(CRITIC_DIMENSIONS as readonly string[]).includes(s.section),
              )
              .map((s) => (
                <SectionAvgRow key={s.section} dimension={s.section} avg={s.avg} />
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CircleAlert className="h-3.5 w-3.5" /> Issue mix
            </CardTitle>
            <p className="font-mono text-[10px] uppercase text-muted-foreground">
              total flagged issues by type
            </p>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.issueByType).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No issues flagged.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {Object.entries(stats.issueByType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, n]) => (
                    <li
                      key={type}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="font-mono uppercase">
                        {type.replace(/_/g, " ")}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {n}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5" /> Org leaderboard
            </CardTitle>
            <p className="font-mono text-[10px] uppercase text-muted-foreground">
              avg quality (orgs with ≥2 reviewed)
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {orgLeaderboard.top.length === 0 ? (
              <p className="text-muted-foreground">Not enough data yet.</p>
            ) : (
              <>
                <div>
                  <p className="font-mono text-[10px] uppercase text-muted-foreground mb-1">
                    Top
                  </p>
                  <ul className="space-y-0.5">
                    {orgLeaderboard.top.map((o) => (
                      <li
                        key={o.org_id}
                        className="flex items-center justify-between"
                      >
                        <Link
                          href={`/admin/organizations/${o.org_id}`}
                          className="hover:underline truncate flex-1"
                        >
                          {o.name}
                        </Link>
                        <span className="font-mono text-muted-foreground">
                          {o.avg} ({o.n})
                          {o.awarded > 0 && ` 🏆${o.awarded}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase text-muted-foreground mb-1">
                    Bottom
                  </p>
                  <ul className="space-y-0.5">
                    {orgLeaderboard.bottom.map((o) => (
                      <li
                        key={o.org_id}
                        className="flex items-center justify-between"
                      >
                        <Link
                          href={`/admin/organizations/${o.org_id}`}
                          className="hover:underline truncate flex-1"
                        >
                          {o.name}
                        </Link>
                        <span className="font-mono text-red-600">
                          {o.avg} ({o.n})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
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
            label="Status"
            options={(presentStatuses.length > 0
              ? presentStatuses
              : ([...STATUSES] as string[])
            ).map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
            selected={statusFilter}
            onToggle={(v) => toggleSet(setStatusFilter, v)}
          />
          <FilterRow
            label="Quality"
            options={QUALITY_BUCKETS.map((q) => ({
              value: q.value,
              label: q.label,
            }))}
            selected={bucketFilter}
            onToggle={(v) => toggleSet(setBucketFilter, v as QualityBucket)}
          />
          <FilterRow
            label="Outcome"
            options={(OUTCOMES as readonly string[]).map((o) => ({
              value: o,
              label: o,
            }))}
            selected={outcomeFilter}
            onToggle={(v) => toggleSet(setOutcomeFilter, v)}
          />
          <FilterRow
            label="Issue"
            options={(ISSUE_TYPES as readonly string[]).map((i) => ({
              value: i,
              label: i.replace(/_/g, " "),
            }))}
            selected={issueFilter}
            onToggle={(v) => toggleSet(setIssueFilter, v)}
          />
          <FilterRow
            label="Flag"
            options={FLAG_OPTIONS.map((f) => ({
              value: f.value,
              label: f.label,
            }))}
            selected={flagFilter}
            onToggle={(v) => toggleSet(setFlagFilter, v)}
          />
          {presentOrgs.length > 1 && (
            <FilterRow
              label="Org"
              options={presentOrgs.map((o) => ({ value: o.id, label: o.name }))}
              selected={orgFilter}
              onToggle={(v) => toggleSet(setOrgFilter, v)}
            />
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {loadError && (
        <Card>
          <CardContent className="py-4 text-sm text-red-500">
            Failed to load proposals: {loadError}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Proposals
            </CardTitle>
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {filtered.length} of {proposals.length}{" "}
              {filtered.length === 1 ? "row" : "rows"}
              {groupBy !== "none" && groups && ` · ${groups.length} groups`}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No proposals match these filters.
            </div>
          ) : groupBy === "none" || !groups ? (
            <FlatTable rows={filtered} orgMap={orgMap} onClick={setSelected} />
          ) : (
            <GroupedTable
              groups={groups}
              orgMap={orgMap}
              onClick={setSelected}
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
              {selected?.title || selected?.grant_title || "Proposal detail"}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <DetailBody
              proposal={selected}
              orgName={orgMap[selected.org_id]}
            />
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
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground w-14 shrink-0">
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
  onClick,
}: {
  rows: PqProposalRow[];
  orgMap: Record<string, string>;
  onClick: (p: PqProposalRow) => void;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow>
            <TableHead>Title / Funder</TableHead>
            <TableHead className="w-32">Org</TableHead>
            <TableHead className="w-24">Status</TableHead>
            <TableHead className="w-20">Quality</TableHead>
            <TableHead className="w-44">Section breakdown</TableHead>
            <TableHead className="w-24">Issues</TableHead>
            <TableHead className="w-28">Flags</TableHead>
            <TableHead className="w-20">Outcome</TableHead>
            <TableHead className="w-24">Created</TableHead>
            <TableHead className="w-12 text-right">Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <ProposalRowEl
              key={p.id}
              p={p}
              orgName={orgMap[p.org_id]}
              onClick={() => onClick(p)}
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
  onClick,
}: {
  groups: Array<{ key: string; items: PqProposalRow[] }>;
  orgMap: Record<string, string>;
  onClick: (p: PqProposalRow) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (k: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <TooltipProvider delayDuration={150}>
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Group</TableHead>
            <TableHead className="w-20 text-center">Count</TableHead>
            <TableHead>Avg quality</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((g) => {
            const open = expanded.has(g.key);
            const reviewed = g.items.filter((p) => p.quality_score != null);
            const avg =
              reviewed.length > 0
                ? Math.round(
                    reviewed.reduce((a, p) => a + (p.quality_score ?? 0), 0) /
                      reviewed.length,
                  )
                : null;
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
                  <TableCell className="font-medium text-sm">{g.key}</TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {g.items.length}
                  </TableCell>
                  <TableCell>
                    {avg == null ? (
                      <span className="text-muted-foreground text-xs">—</span>
                    ) : (
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-mono uppercase ${qualityColor(avg)}`}
                      >
                        {avg}
                      </Badge>
                    )}
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
                            <TableHead className="w-24">Status</TableHead>
                            <TableHead className="w-20">Quality</TableHead>
                            <TableHead className="w-44">Sections</TableHead>
                            <TableHead className="w-24">Issues</TableHead>
                            <TableHead className="w-28">Flags</TableHead>
                            <TableHead className="w-20">Outcome</TableHead>
                            <TableHead className="w-24">Created</TableHead>
                            <TableHead className="w-12 text-right">
                              Detail
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {g.items.map((p) => (
                            <ProposalRowEl
                              key={p.id}
                              p={p}
                              orgName={orgMap[p.org_id]}
                              onClick={() => onClick(p)}
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

function ProposalRowEl({
  p,
  orgName,
  onClick,
}: {
  p: PqProposalRow;
  orgName: string | undefined;
  onClick: () => void;
}) {
  const flags = qualityFlags(p);
  return (
    <TableRow className="cursor-pointer hover:bg-muted/40" onClick={onClick}>
      <TableCell className="max-w-[420px]">
        <div className="font-medium text-xs line-clamp-1">
          {p.title || p.grant_title || "(untitled)"}
        </div>
        {p.funder_name && (
          <div className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
            {p.funder_name}
          </div>
        )}
      </TableCell>
      <TableCell className="text-xs">
        {orgName || (
          <span className="text-muted-foreground">{p.org_id.slice(0, 8)}</span>
        )}
      </TableCell>
      <TableCell>
        <Badge
          variant="secondary"
          className={`text-[10px] font-mono uppercase ${statusBadgeClass(p.status)}`}
        >
          {p.status.replace(/_/g, " ")}
        </Badge>
      </TableCell>
      <TableCell>
        {p.quality_score == null ? (
          <span className="text-muted-foreground text-xs">—</span>
        ) : (
          <Badge
            variant="secondary"
            className={`text-[10px] font-mono uppercase ${qualityColor(p.quality_score)}`}
          >
            {p.quality_score}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <SectionMiniBars scores={p.section_scores} />
      </TableCell>
      <TableCell className="text-xs">
        {p.issues.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-mono cursor-help">{p.issues.length}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <ul className="text-xs space-y-0.5">
                {Object.entries(
                  p.issues.reduce<Record<string, number>>((acc, i) => {
                    const k = (i.type || "OTHER").toUpperCase();
                    acc[k] = (acc[k] ?? 0) + 1;
                    return acc;
                  }, {}),
                ).map(([t, n]) => (
                  <li key={t} className="font-mono">
                    {t}: {n}
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {flags.length === 0 ? (
            <span className="text-muted-foreground text-xs">—</span>
          ) : (
            flags.slice(0, 2).map((f) => (
              <Tooltip key={f.key}>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className={`text-[9px] font-mono uppercase ${flagToneClass(f.tone)}`}
                  >
                    {f.label}
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
      <TableCell className="text-xs">
        {p.outcome ? (
          <Badge
            variant="secondary"
            className={`text-[10px] font-mono uppercase ${
              p.outcome === "awarded"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : p.outcome === "rejected"
                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {p.outcome}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell
        className="text-xs text-muted-foreground whitespace-nowrap"
        title={p.created_at ? new Date(p.created_at).toLocaleString() : undefined}
      >
        {p.created_at ? formatTimeAgo(p.created_at) : "—"}
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

function SectionMiniBars({ scores }: { scores: SectionScore[] }) {
  if (scores.length === 0)
    return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex items-end gap-0.5 h-5">
      {scores.map((s, i) => {
        const v = s.score == null ? 0 : Math.max(4, Math.min(100, s.score));
        const cls =
          s.score == null
            ? "bg-muted"
            : s.score >= 80
              ? "bg-emerald-500"
              : s.score >= 60
                ? "bg-yellow-500"
                : "bg-red-500";
        return (
          <Tooltip key={`${s.section}-${i}`}>
            <TooltipTrigger asChild>
              <div
                className={`${cls} w-2 rounded-sm cursor-help`}
                style={{ height: `${v}%` }}
              />
            </TooltipTrigger>
            <TooltipContent side="top">
              <span className="text-xs font-mono">
                {s.section}: {s.score == null ? "—" : `${s.score}/100`}
              </span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

function SectionAvgRow({
  dimension,
  avg,
}: {
  dimension: string;
  avg: number | null;
}) {
  const v = avg == null ? 0 : Math.max(0, Math.min(100, avg));
  const cls =
    avg == null
      ? "bg-muted"
      : avg >= 80
        ? "bg-emerald-500"
        : avg >= 60
          ? "bg-yellow-500"
          : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground w-32 shrink-0">
        {dimension}
      </span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cls} style={{ width: `${v}%`, height: "100%" }} />
      </div>
      <span className="font-mono text-xs w-10 text-right">
        {avg == null ? "—" : avg}
      </span>
    </div>
  );
}

function DetailBody({
  proposal,
  orgName,
}: {
  proposal: PqProposalRow;
  orgName: string | undefined;
}) {
  const issuesGrouped = useMemo(() => {
    const m = new Map<string, ProposalIssue[]>();
    for (const i of proposal.issues) {
      const k = (i.type || "OTHER").toUpperCase();
      const arr = m.get(k) || [];
      arr.push(i);
      m.set(k, arr);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [proposal.issues]);

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="secondary"
          className={`text-[10px] font-mono uppercase ${statusBadgeClass(proposal.status)}`}
        >
          {proposal.status}
        </Badge>
        {proposal.quality_score != null && (
          <Badge
            variant="secondary"
            className={`text-[10px] font-mono uppercase ${qualityColor(proposal.quality_score)}`}
          >
            quality {proposal.quality_score}
          </Badge>
        )}
        {proposal.outcome && (
          <Badge
            variant="secondary"
            className={`text-[10px] font-mono uppercase ${
              proposal.outcome === "awarded"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : proposal.outcome === "rejected"
                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {proposal.outcome}
          </Badge>
        )}
        {qualityFlags(proposal).map((f) => (
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
        <DetailRow label="Org" value={orgName || proposal.org_id} />
        <DetailRow label="Funder" value={proposal.funder_name} />
        <DetailRow label="Grant" value={proposal.grant_title} />
        <DetailRow label="Sections" value={String(proposal.section_count)} />
        <DetailRow
          label="Created"
          value={
            proposal.created_at
              ? new Date(proposal.created_at).toLocaleString()
              : null
          }
        />
        <DetailRow
          label="Updated"
          value={
            proposal.updated_at
              ? new Date(proposal.updated_at).toLocaleString()
              : null
          }
        />
        <DetailRow label="Approval" value={proposal.approval_status} />
        <DetailRow
          label="Approved at"
          value={
            proposal.approved_at
              ? new Date(proposal.approved_at).toLocaleString()
              : null
          }
        />
      </div>

      {proposal.section_scores.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Critic dimensions
          </p>
          <div className="space-y-1.5">
            {proposal.section_scores.map((s) => (
              <SectionAvgRow
                key={s.section}
                dimension={s.section}
                avg={s.score}
              />
            ))}
          </div>
        </div>
      )}

      {proposal.summary && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Critic summary
          </p>
          <p className="text-sm whitespace-pre-wrap">{proposal.summary}</p>
        </div>
      )}

      {proposal.recommendation && (
        <div className="rounded-md border border-dashed border-border p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Recommendation
          </p>
          <p className="text-sm">{proposal.recommendation}</p>
        </div>
      )}

      {proposal.strengths.length > 0 && (
        <div>
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-1">
            Strengths
          </p>
          <ul className="space-y-1 list-disc pl-5 text-sm">
            {proposal.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {proposal.weaknesses.length > 0 && (
        <div>
          <p className="text-xs font-medium text-red-700 dark:text-red-300 uppercase tracking-wide mb-1">
            Weaknesses
          </p>
          <ul className="space-y-1 list-disc pl-5 text-sm">
            {proposal.weaknesses.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {issuesGrouped.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Issues by type ({proposal.issues.length})
          </p>
          <div className="space-y-2">
            {issuesGrouped.map(([type, items]) => (
              <details
                key={type}
                className="rounded-md border border-border p-2"
              >
                <summary className="cursor-pointer text-xs font-mono uppercase">
                  {type.replace(/_/g, " ")} ({items.length})
                </summary>
                <ul className="mt-2 space-y-2 text-xs">
                  {items.map((i, idx) => (
                    <li key={idx} className="space-y-0.5">
                      {i.text && (
                        <p className="font-mono bg-muted/50 rounded p-1.5">
                          “{i.text}”
                        </p>
                      )}
                      {i.suggestion && (
                        <p>
                          <span className="font-mono uppercase text-muted-foreground">
                            fix:
                          </span>{" "}
                          {i.suggestion}
                        </p>
                      )}
                      {i.section && (
                        <p className="text-muted-foreground">
                          @ {i.section}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>
      )}

      {(proposal.improved_opening ||
        proposal.improved_closing ||
        proposal.story_suggestion ||
        proposal.quick_wins.length > 0) && (
        <div className="rounded-md border border-dashed border-border p-3 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide flex items-center gap-1">
            <Lightbulb className="h-3.5 w-3.5" /> Critic improvements
          </p>
          {proposal.quick_wins.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase text-muted-foreground mb-1">
                Quick wins
              </p>
              <ul className="space-y-0.5 list-disc pl-5 text-sm">
                {proposal.quick_wins.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          {proposal.improved_opening && (
            <div>
              <p className="font-mono text-[10px] uppercase text-muted-foreground mb-1">
                Improved opening
              </p>
              <p className="text-sm whitespace-pre-wrap">
                {proposal.improved_opening}
              </p>
            </div>
          )}
          {proposal.improved_closing && (
            <div>
              <p className="font-mono text-[10px] uppercase text-muted-foreground mb-1">
                Improved closing
              </p>
              <p className="text-sm whitespace-pre-wrap">
                {proposal.improved_closing}
              </p>
            </div>
          )}
          {proposal.story_suggestion && (
            <div>
              <p className="font-mono text-[10px] uppercase text-muted-foreground mb-1">
                Story suggestion
              </p>
              <p className="text-sm whitespace-pre-wrap">
                {proposal.story_suggestion}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Link
          href={`/admin/organizations/${proposal.org_id}/proposals/${proposal.id}?from=proposal-quality`}
          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" /> Open full proposal
        </Link>
        <Link
          href={`/admin/organizations/${proposal.org_id}?from=proposal-quality`}
          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" /> Org profile
        </Link>
      </div>
    </div>
  );
}

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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-28 shrink-0 pt-0.5">
        {label}
      </p>
      <p className="text-sm flex-1">
        {value || <span className="text-muted-foreground italic">—</span>}
      </p>
    </div>
  );
}
