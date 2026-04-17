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
    const { data } = await adminClient
      .from("central_grants")
      .select("id, title, funder_name, organization, amount, deadline, description, eligibility, source_url, source_id, first_seen_at, last_seen_at")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
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

  // Get org pipeline grants to check pickup
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
