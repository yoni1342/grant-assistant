import { createAdminClient } from "@/lib/supabase/server";
import {
  GrantQualityClient,
  type QcGrantRow,
  type QcOrgRow,
} from "./grant-quality-client";

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

export default async function GrantQualityPage({
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

  // All orgs for filter dropdown / group-by names. Bulk-load is fine —
  // there's a small number of orgs.
  const { data: orgsData } = await admin
    .from("organizations")
    .select("id, name, sector")
    .order("name", { ascending: true });

  const orgs: QcOrgRow[] = (orgsData ?? []).map((o) => ({
    id: o.id as string,
    name: (o.name as string | null) ?? "(unnamed org)",
    sector: (o.sector as string | null) ?? null,
  }));

  // Pull all pipeline grants in the selected window. Cap at 2000 — covers most
  // ranges; the date filter is the primary scope.
  //
  // QC scope: source-fetched grants only (central_grant_id IS NOT NULL).
  // Manual user-created grants skip the entire discovery filter chain so they
  // have no fit_score / sanity_pass / filter_reason metadata to assess. They
  // belong in a different review surface, not here.
  const { data: grantsData, error: grantsErr } = await admin
    .from("grants_full")
    .select(
      "id, org_id, title, funder_name, stage, screening_score, screening_result, screening_notes, source, source_url, deadline, amount, description, concerns, recommendations, metadata, created_at, updated_at",
    )
    .gte("created_at", sinceIso)
    .lte("created_at", untilIso)
    .not("central_grant_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(2000);

  const grants: QcGrantRow[] = (grantsData ?? []).map((g) => {
    const meta = (g.metadata as Record<string, unknown> | null) ?? null;
    const screening = (g.screening_result as Record<string, unknown> | null) ?? null;
    return {
      id: g.id as string,
      org_id: g.org_id as string,
      title: (g.title as string | null) ?? "(untitled)",
      funder_name: (g.funder_name as string | null) ?? null,
      stage: (g.stage as QcGrantRow["stage"]) ?? "discovery",
      screening_score: g.screening_score == null ? null : Number(g.screening_score),
      screening_label:
        screening && typeof screening.score === "string"
          ? (screening.score as string)
          : null,
      data_quality:
        screening && typeof screening.data_quality === "string"
          ? (screening.data_quality as string)
          : null,
      screening_notes: (g.screening_notes as string | null) ?? null,
      source: (g.source as string | null) ?? null,
      source_url: (g.source_url as string | null) ?? null,
      deadline: (g.deadline as string | null) ?? null,
      amount: (g.amount as string | null) ?? null,
      description: (g.description as string | null) ?? null,
      concerns: Array.isArray(g.concerns) ? (g.concerns as string[]) : [],
      recommendations: Array.isArray(g.recommendations)
        ? (g.recommendations as unknown[])
        : [],
      fit_score:
        meta && typeof meta.fit_score === "number"
          ? (meta.fit_score as number)
          : null,
      sanity_pass:
        meta && typeof meta.sanity_pass === "boolean"
          ? (meta.sanity_pass as boolean)
          : null,
      sanity_reason:
        meta && typeof meta.sanity_reason === "string"
          ? (meta.sanity_reason as string)
          : null,
      filter_reason:
        meta && typeof meta.location_filter_reason === "string"
          ? (meta.location_filter_reason as string)
          : null,
      created_at: (g.created_at as string | null) ?? null,
      updated_at: (g.updated_at as string | null) ?? null,
    };
  });

  return (
    <div className="p-4 sm:p-6">
      <GrantQualityClient
        grants={grants}
        orgs={orgs}
        loadError={grantsErr?.message ?? null}
        capped={grants.length === 2000}
        filters={{ preset, from: range.from, to: range.to }}
      />
    </div>
  );
}
