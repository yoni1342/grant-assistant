import { createAdminClient, createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// GET /api/admin/org-pickup-stats
// Per-org pickup counts from the central catalog, plus totals.
// A "pickup" = a row in grants_full where source_type = 'catalog'
// (i.e. the org added a central_grants row to its pipeline).
// Manual grants are excluded — they were never in the shared catalog.
//
// Optional filters: from / to (ISO strings) bound on grants.created_at.
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_platform_admin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const fromISO = fromParam ? new Date(fromParam).toISOString() : null;
  const toISO = toParam ? new Date(toParam).toISOString() : null;

  const adminClient = createAdminClient();

  // --- Pull catalog-sourced pipeline grants (paginated) ---
  const PAGE_SIZE = 1000;
  type Pick = {
    id: string;
    org_id: string;
    central_grant_id: string | null;
    stage: string | null;
    created_at: string;
    source: string | null;
    source_url: string | null;
  };
  const picks: Pick[] = [];
  let page = 0;
  while (true) {
    let q = adminClient
      .from("grants_full")
      .select("id, org_id, central_grant_id, stage, created_at, source, source_url")
      .eq("source_type", "catalog")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (fromISO) q = q.gte("created_at", fromISO);
    if (toISO) q = q.lte("created_at", toISO);
    const { data } = await q;
    if (!data || data.length === 0) break;
    for (const r of data) {
      if (r.id && r.org_id) picks.push(r as Pick);
    }
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  // --- Pull first_seen_at for the central_grants behind these picks, so we
  //     can split picks into "of grants newly discovered in this range" vs
  //     "of older catalog grants". Avoids the confusion where a pickup
  //     created today is actually of a grant that's been in the catalog
  //     for weeks. ---
  const centralIds = Array.from(
    new Set(picks.map((p) => p.central_grant_id).filter((x): x is string => !!x)),
  );
  const centralFirstSeenById: Record<string, string | null> = {};
  for (let i = 0; i < centralIds.length; i += 500) {
    const slice = centralIds.slice(i, i + 500);
    const { data } = await adminClient
      .from("central_grants")
      .select("id, first_seen_at")
      .in("id", slice);
    for (const r of data || []) {
      centralFirstSeenById[r.id] = r.first_seen_at as string | null;
    }
  }

  // --- Pull proposals (joined by grant_id to count per-org) ---
  const { data: proposalRows } = await adminClient
    .from("proposals")
    .select("grant_id");
  const proposalGrantIds = new Set<string>();
  for (const p of proposalRows || []) {
    if (p.grant_id) proposalGrantIds.add(p.grant_id);
  }

  // --- Pull all orgs so we can show names + "orgs with zero picks" context ---
  const { data: allOrgs } = await adminClient
    .from("organizations")
    .select("id, name");
  const orgNameById: Record<string, string> = {};
  for (const o of allOrgs || []) {
    if (o.id) orgNameById[o.id] = o.name || "(unnamed)";
  }

  // --- Aggregate by org ---
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

  const byOrg: Record<string, OrgStat> = {};

  function ensure(orgId: string): OrgStat {
    if (!byOrg[orgId]) {
      byOrg[orgId] = {
        org_id: orgId,
        name: orgNameById[orgId] || "(unknown org)",
        total_picks: 0,
        discovery: 0,
        screening: 0,
        pending_approval: 0,
        drafting: 0,
        submitted: 0,
        awarded: 0,
        closed: 0,
        proposals: 0,
        last_pickup_at: null,
      };
    }
    return byOrg[orgId];
  }

  for (const p of picks) {
    const s = ensure(p.org_id);
    s.total_picks++;
    switch (p.stage) {
      case "discovery":
        s.discovery++;
        break;
      case "screening":
        s.screening++;
        break;
      case "pending_approval":
        s.pending_approval++;
        break;
      case "drafting":
        s.drafting++;
        break;
      case "submission":
      case "submitted":
        s.submitted++;
        break;
      case "awarded":
        s.awarded++;
        break;
      case "closed":
      case "rejected":
        s.closed++;
        break;
    }
    if (proposalGrantIds.has(p.id)) s.proposals++;
    if (!s.last_pickup_at || p.created_at > s.last_pickup_at) {
      s.last_pickup_at = p.created_at;
    }
  }

  const orgs = Object.values(byOrg).sort((a, b) => b.total_picks - a.total_picks);

  // --- Aggregate by source (for the per-source bar chart on the list page) ---
  function extractDomain(u: string | null): string {
    if (!u) return "Unknown";
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch {
      return u.length > 40 ? u.slice(0, 40) : u;
    }
  }

  const bySource: Record<string, { source: string; count: number }> = {};
  for (const p of picks) {
    const key = p.source || extractDomain(p.source_url);
    if (!bySource[key]) bySource[key] = { source: key, count: 0 };
    bySource[key].count++;
  }
  const sources = Object.values(bySource).sort((a, b) => b.count - a.count);

  // --- Totals ---
  const uniqueCentralIds = new Set<string>();
  for (const p of picks) {
    if (p.central_grant_id) uniqueCentralIds.add(p.central_grant_id);
  }
  const totalsTotalPicks = picks.length;
  const orgsWithPicks = orgs.length;
  const orgsTotal = Object.keys(orgNameById).length;

  // Split: how many of these picks are of grants that were ALSO discovered
  // in this same range (true "fresh discoveries that landed in pipelines")
  // vs picks of older catalog grants (orgs catching up on the backlog).
  // Only computed when a range is actually applied — for "all time" both
  // counts collapse to the total and the breakdown isn't meaningful.
  let picksOfNewGrants = 0;
  let picksOfOlderGrants = 0;
  if (fromISO || toISO) {
    for (const p of picks) {
      const cgFirstSeen = p.central_grant_id
        ? centralFirstSeenById[p.central_grant_id]
        : null;
      const inRange =
        cgFirstSeen != null &&
        (!fromISO || cgFirstSeen >= fromISO) &&
        (!toISO || cgFirstSeen <= toISO);
      if (inRange) picksOfNewGrants++;
      else picksOfOlderGrants++;
    }
  }

  const totals = {
    orgs_with_picks: orgsWithPicks,
    orgs_total: orgsTotal,
    total_picks: totalsTotalPicks,
    picks_of_new_grants: picksOfNewGrants,
    picks_of_older_grants: picksOfOlderGrants,
    range_applied: !!(fromISO || toISO),
    unique_central_picks: uniqueCentralIds.size,
    avg_picks_per_active_org:
      orgsWithPicks > 0 ? Math.round((totalsTotalPicks / orgsWithPicks) * 10) / 10 : 0,
    sources_used: sources.length,
  };

  return new Response(JSON.stringify({ orgs, totals, sources }), {
    headers: { "Content-Type": "application/json" },
  });
}
