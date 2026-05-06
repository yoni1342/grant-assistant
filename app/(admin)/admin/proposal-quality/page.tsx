import { createAdminClient } from "@/lib/supabase/server";
import {
  ProposalQualityClient,
  type PqProposalRow,
  type PqOrgRow,
} from "./proposal-quality-client";

export const dynamic = "force-dynamic";

const PRESETS = ["live", "yesterday", "7d", "30d", "90d", "all", "custom"] as const;
type Preset = (typeof PRESETS)[number];

function resolveRange(preset: Preset, from?: string, to?: string) {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const utcDay = (offsetDays: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };
  if (preset === "all") return { from: "1970-01-01", to: todayIso };
  if (preset === "live") return { from: todayIso, to: todayIso };
  if (preset === "yesterday") {
    const y = utcDay(-1);
    return { from: y, to: y };
  }
  if (preset === "7d") return { from: utcDay(-6), to: todayIso };
  if (preset === "30d") return { from: utcDay(-29), to: todayIso };
  if (preset === "90d") return { from: utcDay(-89), to: todayIso };
  return {
    from: from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : utcDay(-29),
    to: to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : todayIso,
  };
}

export default async function ProposalQualityPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const preset: Preset = (PRESETS as readonly string[]).includes(sp.preset ?? "")
    ? (sp.preset as Preset)
    : "30d";
  const range = resolveRange(preset, sp.from, sp.to);

  const admin = createAdminClient();
  const sinceIso = `${range.from}T00:00:00.000Z`;
  const untilIso = `${range.to}T23:59:59.999Z`;

  const { data: orgsData } = await admin
    .from("organizations")
    .select("id, name, sector")
    .order("name", { ascending: true });

  const orgs: PqOrgRow[] = (orgsData ?? []).map((o) => ({
    id: o.id as string,
    name: (o.name as string | null) ?? "(unnamed org)",
    sector: (o.sector as string | null) ?? null,
  }));

  // Pull every proposal in the window. Cap at 2000 to bound page weight.
  const { data: proposalsData, error: proposalsErr } = await admin
    .from("proposals")
    .select(
      "id, org_id, grant_id, title, status, quality_score, quality_review, approval_status, approved_at, approval_notes, outcome, outcome_at, outcome_notes, metadata, created_at, updated_at",
    )
    .gte("created_at", sinceIso)
    .lte("created_at", untilIso)
    .order("created_at", { ascending: false })
    .limit(2000);

  // Section count per proposal — tells us if proposal is empty / minimal
  const proposalIds = (proposalsData ?? []).map((p) => p.id as string);
  const sectionCounts: Record<string, number> = {};
  if (proposalIds.length > 0) {
    const { data: sectionData } = await admin
      .from("proposal_sections")
      .select("proposal_id")
      .in("proposal_id", proposalIds);
    for (const row of sectionData ?? []) {
      const k = row.proposal_id as string;
      sectionCounts[k] = (sectionCounts[k] ?? 0) + 1;
    }
  }

  // Funder / grant title for display
  const grantIds = Array.from(
    new Set((proposalsData ?? []).map((p) => p.grant_id as string).filter(Boolean)),
  );
  const grantMap: Record<string, { title: string | null; funder_name: string | null }> = {};
  if (grantIds.length > 0) {
    const { data: grantData } = await admin
      .from("grants_full")
      .select("id, title, funder_name")
      .in("id", grantIds);
    for (const g of grantData ?? []) {
      grantMap[g.id as string] = {
        title: (g.title as string | null) ?? null,
        funder_name: (g.funder_name as string | null) ?? null,
      };
    }
  }

  const proposals: PqProposalRow[] = (proposalsData ?? []).map((p) => {
    const review = (p.quality_review as Record<string, unknown> | null) ?? null;
    const sectionScoresRaw = Array.isArray(
      (review ?? {}) && (review as Record<string, unknown>).section_scores,
    )
      ? ((review as Record<string, unknown>).section_scores as Array<
          Record<string, unknown>
        >)
      : [];
    const sectionScores = sectionScoresRaw.map((s) => ({
      section: (s.section as string | null) ?? "?",
      score: typeof s.score === "number" ? (s.score as number) : null,
      feedback: (s.feedback as string | null) ?? null,
    }));
    const issuesRaw = Array.isArray(
      (review ?? {}) && (review as Record<string, unknown>).issues,
    )
      ? ((review as Record<string, unknown>).issues as Array<
          Record<string, unknown>
        >)
      : [];
    const issues = issuesRaw.map((i) => ({
      type: (i.type as string | null) ?? "other",
      severity: (i.severity as string | null) ?? null,
      text: (i.text as string | null) ?? null,
      suggestion: (i.suggestion as string | null) ?? null,
      section: (i.section as string | null) ?? null,
    }));
    const grantInfo = grantMap[p.grant_id as string] ?? {
      title: null,
      funder_name: null,
    };
    return {
      id: p.id as string,
      org_id: p.org_id as string,
      grant_id: p.grant_id as string,
      title: (p.title as string | null) ?? null,
      grant_title: grantInfo.title,
      funder_name: grantInfo.funder_name,
      status: (p.status as string | null) ?? "draft",
      approval_status: (p.approval_status as string | null) ?? null,
      approved_at: (p.approved_at as string | null) ?? null,
      approval_notes: (p.approval_notes as string | null) ?? null,
      outcome: (p.outcome as string | null) ?? null,
      outcome_at: (p.outcome_at as string | null) ?? null,
      outcome_notes: (p.outcome_notes as string | null) ?? null,
      quality_score:
        p.quality_score == null ? null : Number(p.quality_score),
      section_scores: sectionScores,
      issues,
      strengths:
        review && Array.isArray((review as Record<string, unknown>).strengths)
          ? (((review as Record<string, unknown>).strengths) as string[])
          : [],
      weaknesses:
        review && Array.isArray((review as Record<string, unknown>).weaknesses)
          ? (((review as Record<string, unknown>).weaknesses) as string[])
          : [],
      quick_wins:
        review && Array.isArray((review as Record<string, unknown>).quick_wins)
          ? (((review as Record<string, unknown>).quick_wins) as string[])
          : [],
      summary:
        review && typeof (review as Record<string, unknown>).summary === "string"
          ? ((review as Record<string, unknown>).summary as string)
          : null,
      recommendation:
        review &&
        typeof (review as Record<string, unknown>).recommendation === "string"
          ? ((review as Record<string, unknown>).recommendation as string)
          : null,
      improved_opening:
        review &&
        typeof (review as Record<string, unknown>).improved_opening === "string"
          ? ((review as Record<string, unknown>).improved_opening as string)
          : null,
      improved_closing:
        review &&
        typeof (review as Record<string, unknown>).improved_closing === "string"
          ? ((review as Record<string, unknown>).improved_closing as string)
          : null,
      story_suggestion:
        review &&
        typeof (review as Record<string, unknown>).story_suggestion === "string"
          ? ((review as Record<string, unknown>).story_suggestion as string)
          : null,
      section_count: sectionCounts[p.id as string] ?? 0,
      created_at: (p.created_at as string | null) ?? null,
      updated_at: (p.updated_at as string | null) ?? null,
    };
  });

  return (
    <div className="p-4 sm:p-6">
      <ProposalQualityClient
        proposals={proposals}
        orgs={orgs}
        loadError={proposalsErr?.message ?? null}
        capped={proposals.length === 2000}
        filters={{ preset, from: range.from, to: range.to }}
      />
    </div>
  );
}
