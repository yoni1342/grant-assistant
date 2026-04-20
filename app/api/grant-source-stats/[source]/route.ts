import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ source: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_platform_admin) {
    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  const { source } = await params;
  const sourceDomain = decodeURIComponent(source);
  const adminClient = createAdminClient();
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter"); // "active" | "expired" | "green" | "yellow" | "red" | null

  // Optional date-range filter (ISO 8601) — matches the list page's semantics
  // by filtering central_grants on first_seen_at.
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const fromISO = fromParam ? new Date(fromParam).toISOString() : null;
  const toISO = toParam ? new Date(toParam).toISOString() : null;

  // Fetch central grants — filter by source_url domain via ilike
  // We use a broad approach: fetch all then filter client-side by domain
  const PAGE_SIZE = 1000;
  let allCentral: Array<{
    id: string;
    title: string;
    funder_name: string | null;
    organization: string | null;
    amount: string | null;
    deadline: string | null;
    description: string | null;
    eligibility: unknown;
    source_url: string | null;
    source_id: string | null;
    first_seen_at: string | null;
    last_seen_at: string | null;
  }> = [];

  let page = 0;
  while (true) {
    let q = adminClient
      .from("central_grants")
      .select("id, title, funder_name, organization, amount, deadline, description, eligibility, source_url, source_id, first_seen_at, last_seen_at")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (fromISO) q = q.gte("first_seen_at", fromISO);
    if (toISO) q = q.lte("first_seen_at", toISO);
    const { data } = await q;
    if (!data || data.length === 0) break;
    allCentral = allCentral.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  // Filter to this source domain
  function extractDomain(u: string | null): string {
    if (!u) return "Unknown";
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch {
      return u.length > 40 ? u.slice(0, 40) : u;
    }
  }

  const sourceGrants = allCentral.filter(
    (g) => extractDomain(g.source_url) === sourceDomain
  );

  // Org pipeline pickups for this source's grants (lifetime, for the per-grant row).
  const sourceUrls = sourceGrants.map((g) => g.source_url).filter(Boolean) as string[];
  let orgGrants: Array<{ id: string; source_url: string | null; stage: string | null }> = [];
  if (sourceUrls.length > 0) {
    // Fetch in batches of 200 to stay within Supabase query limits
    for (let i = 0; i < sourceUrls.length; i += 200) {
      const batch = sourceUrls.slice(i, i + 200);
      const { data } = await adminClient
        .from("grants")
        .select("id, source_url, stage")
        .in("source_url", batch);
      if (data) orgGrants = orgGrants.concat(data);
    }
  }

  // Range-scoped activity for this source, independent of when the central
  // grant was first seen. "Pickups" uses created_at; per-stage counts use
  // updated_at as a best-effort proxy (no stage-transition history exists,
  // so any row edit bumps updated_at).
  let pickupsInRange = 0;
  const stageActivity: Record<string, number> = {
    screening: 0,
    pending_approval: 0,
    drafting: 0,
    submission: 0,
    awarded: 0,
  };
  const activityGrantIds = new Set<string>();

  async function paginate(
    dateCol: "created_at" | "updated_at",
    onRow: (row: { id: string; source_url: string | null; stage: string | null }) => void,
  ) {
    const PAGE = 1000;
    let p = 0;
    while (true) {
      let q = adminClient
        .from("grants")
        .select("id, source_url, stage")
        .range(p * PAGE, (p + 1) * PAGE - 1);
      if (fromISO) q = q.gte(dateCol, fromISO);
      if (toISO) q = q.lte(dateCol, toISO);
      const { data } = await q;
      if (!data || data.length === 0) break;
      for (const row of data) onRow(row);
      if (data.length < PAGE) break;
      p++;
    }
  }

  await paginate("created_at", (row) => {
    if (extractDomain(row.source_url) === sourceDomain) {
      pickupsInRange++;
      activityGrantIds.add(row.id);
    }
  });
  await paginate("updated_at", (row) => {
    if (extractDomain(row.source_url) !== sourceDomain) return;
    activityGrantIds.add(row.id);
    if (row.stage && row.stage in stageActivity) {
      stageActivity[row.stage]++;
    }
  });

  // Proposals created in the range, scoped to this source. Start from
  // proposals (small, range-filtered) and look up each grant's source_url so
  // we don't need a full grants-for-source fetch.
  let proposalsInRange = 0;
  {
    let proposalsQ = adminClient.from("proposals").select("id, grant_id");
    if (fromISO) proposalsQ = proposalsQ.gte("created_at", fromISO);
    if (toISO) proposalsQ = proposalsQ.lte("created_at", toISO);
    const { data: rangeProposals } = await proposalsQ;
    const grantIds = Array.from(
      new Set((rangeProposals ?? []).map((p) => p.grant_id).filter(Boolean)),
    ) as string[];
    const sourceMatch = new Set<string>();
    for (let i = 0; i < grantIds.length; i += 200) {
      const batch = grantIds.slice(i, i + 200);
      const { data } = await adminClient
        .from("grants")
        .select("id, source_url")
        .in("id", batch);
      for (const g of data ?? []) {
        if (extractDomain(g.source_url) === sourceDomain) sourceMatch.add(g.id);
      }
    }
    proposalsInRange = (rangeProposals ?? []).filter(
      (p) => p.grant_id && sourceMatch.has(p.grant_id),
    ).length;
  }

  // Build lookup: source_url → org grant stages
  const orgByUrl: Record<string, Array<{ stage: string | null }>> = {};
  for (const og of orgGrants) {
    const key = og.source_url || "";
    if (!orgByUrl[key]) orgByUrl[key] = [];
    orgByUrl[key].push({ stage: og.stage });
  }

  // Get proposals for org grants
  const orgGrantIds = orgGrants.map((g) => g.id);
  const proposalsByGrant: Record<string, number> = {};
  if (orgGrantIds.length > 0) {
    for (let i = 0; i < orgGrantIds.length; i += 200) {
      const batch = orgGrantIds.slice(i, i + 200);
      const { data } = await adminClient
        .from("proposals")
        .select("id, grant_id")
        .in("grant_id", batch);
      for (const p of data || []) {
        if (p.grant_id) proposalsByGrant[p.grant_id] = (proposalsByGrant[p.grant_id] || 0) + 1;
      }
    }
  }

  const todayStr = new Date().toISOString().split("T")[0];

  // Build rows
  const rows = sourceGrants.map((g) => {
    const elig = g.eligibility as {
      score?: string;
      confidence?: number;
      dimension_scores?: Record<string, number>;
    } | null;

    const isActive = !g.deadline || g.deadline >= todayStr;
    const orgMatches = g.source_url ? orgByUrl[g.source_url] || [] : [];
    const orgsPickedUp = orgMatches.length;

    // Count proposals across all org copies
    let proposalCount = 0;
    for (const og of orgGrants.filter((o) => o.source_url === g.source_url)) {
      proposalCount += proposalsByGrant[og.id] || 0;
    }

    return {
      id: g.id,
      title: g.title,
      funder_name: g.funder_name,
      source_url: g.source_url,
      deadline: g.deadline,
      amount: g.amount,
      first_seen_at: g.first_seen_at,
      last_seen_at: g.last_seen_at,
      is_active: isActive,
      eligibility_score: elig?.score || null,
      eligibility_confidence: elig?.confidence ?? null,
      dimension_scores: elig?.dimension_scores || null,
      orgs_picked_up: orgsPickedUp,
      proposals_count: proposalCount,
    };
  });

  // Apply client filter
  let filtered = rows;
  if (filter === "active") filtered = rows.filter((r) => r.is_active);
  else if (filter === "expired") filtered = rows.filter((r) => !r.is_active);
  else if (filter === "green") filtered = rows.filter((r) => r.eligibility_score === "GREEN");
  else if (filter === "yellow") filtered = rows.filter((r) => r.eligibility_score === "YELLOW");
  else if (filter === "red") filtered = rows.filter((r) => r.eligibility_score === "RED");

  // Sort by first_seen_at desc
  filtered.sort((a, b) => (b.first_seen_at || "").localeCompare(a.first_seen_at || ""));

  // Summary
  const summary = {
    total: sourceGrants.length,
    active: rows.filter((r) => r.is_active).length,
    expired: rows.filter((r) => !r.is_active).length,
    picked_up: rows.filter((r) => r.orgs_picked_up > 0).length,
    pickups_in_range: pickupsInRange,
    screening_in_range: stageActivity.screening + stageActivity.pending_approval,
    drafting_in_range: stageActivity.drafting,
    submitted_in_range: stageActivity.submission,
    awarded_in_range: stageActivity.awarded,
    proposals_in_range: proposalsInRange,
    green: rows.filter((r) => r.eligibility_score === "GREEN").length,
    yellow: rows.filter((r) => r.eligibility_score === "YELLOW").length,
    red: rows.filter((r) => r.eligibility_score === "RED").length,
    no_score: rows.filter((r) => !r.eligibility_score).length,
    proposals: rows.reduce((a, r) => a + r.proposals_count, 0),
  };

  return new Response(
    JSON.stringify({ source: sourceDomain, grants: filtered, summary }),
    { headers: { "Content-Type": "application/json" } },
  );
}
