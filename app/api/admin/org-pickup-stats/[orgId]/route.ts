import { createAdminClient, createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// GET /api/admin/org-pickup-stats/[orgId]
// Detail view: one org's full pickup activity.
// Returns:
//   - org meta (id, name, created_at)
//   - summary (totals, stage breakdown, unique sources, proposal count)
//   - per-source-domain breakdown
//   - full grant list (title, funder, amount, deadline, stage, source, picked_at)
//
// Optional filters: from / to (ISO) on grants.created_at.
// ---------------------------------------------------------------------------

function extractDomain(url: string | null): string {
  if (!url) return "Unknown";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.length > 40 ? url.slice(0, 40) : url;
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
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

  const { orgId } = await params;
  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const fromISO = fromParam ? new Date(fromParam).toISOString() : null;
  const toISO = toParam ? new Date(toParam).toISOString() : null;

  const adminClient = createAdminClient();

  // --- Org meta ---
  const { data: orgRow } = await adminClient
    .from("organizations")
    .select("id, name, created_at, sector, geographic_focus")
    .eq("id", orgId)
    .maybeSingle();

  if (!orgRow) {
    return new Response(JSON.stringify({ error: "Organization not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- All catalog-sourced pickups for this org ---
  type Pick = {
    id: string;
    central_grant_id: string | null;
    stage: string | null;
    created_at: string;
    title: string | null;
    funder_name: string | null;
    amount: string | null;
    deadline: string | null;
    source: string | null;
    source_url: string | null;
  };

  const PAGE_SIZE = 1000;
  const picks: Pick[] = [];
  let page = 0;
  while (true) {
    let q = adminClient
      .from("grants_full")
      .select(
        "id, central_grant_id, stage, created_at, title, funder_name, amount, deadline, source, source_url",
      )
      .eq("org_id", orgId)
      .eq("source_type", "catalog")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .order("created_at", { ascending: false });
    if (fromISO) q = q.gte("created_at", fromISO);
    if (toISO) q = q.lte("created_at", toISO);
    const { data } = await q;
    if (!data || data.length === 0) break;
    for (const r of data) picks.push(r as Pick);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  // --- Proposals for this org's grants ---
  const grantIds = picks.map((p) => p.id);
  const proposalCountByGrant: Record<string, number> = {};
  let totalProposals = 0;
  if (grantIds.length > 0) {
    // Chunk the IN clause to be safe
    const CHUNK = 500;
    for (let i = 0; i < grantIds.length; i += CHUNK) {
      const slice = grantIds.slice(i, i + CHUNK);
      const { data } = await adminClient
        .from("proposals")
        .select("grant_id")
        .in("grant_id", slice);
      for (const p of data || []) {
        if (p.grant_id) {
          proposalCountByGrant[p.grant_id] =
            (proposalCountByGrant[p.grant_id] || 0) + 1;
          totalProposals++;
        }
      }
    }
  }

  // --- Stage breakdown ---
  const stageCounts: Record<string, number> = {
    discovery: 0,
    screening: 0,
    pending_approval: 0,
    drafting: 0,
    submitted: 0,
    awarded: 0,
    closed: 0,
  };
  for (const p of picks) {
    switch (p.stage) {
      case "discovery":
        stageCounts.discovery++;
        break;
      case "screening":
        stageCounts.screening++;
        break;
      case "pending_approval":
        stageCounts.pending_approval++;
        break;
      case "drafting":
        stageCounts.drafting++;
        break;
      case "submission":
      case "submitted":
        stageCounts.submitted++;
        break;
      case "awarded":
        stageCounts.awarded++;
        break;
      case "closed":
      case "rejected":
        stageCounts.closed++;
        break;
    }
  }

  // --- Source-domain breakdown ---
  const bySource: Record<string, { source: string; count: number }> = {};
  for (const p of picks) {
    const key = p.source || extractDomain(p.source_url);
    if (!bySource[key]) bySource[key] = { source: key, count: 0 };
    bySource[key].count++;
  }
  const sourceBreakdown = Object.values(bySource).sort(
    (a, b) => b.count - a.count,
  );

  // --- Unique central grants ---
  const uniqueCentral = new Set<string>();
  for (const p of picks) {
    if (p.central_grant_id) uniqueCentral.add(p.central_grant_id);
  }

  // --- Shape the grant list for the client ---
  const grants = picks.map((p) => ({
    id: p.id,
    central_grant_id: p.central_grant_id,
    title: p.title || "(untitled)",
    funder_name: p.funder_name,
    amount: p.amount,
    deadline: p.deadline,
    stage: p.stage,
    source: p.source,
    source_domain: extractDomain(p.source_url),
    source_url: p.source_url,
    picked_at: p.created_at,
    proposals: proposalCountByGrant[p.id] || 0,
  }));

  const summary = {
    total_picks: picks.length,
    unique_central_picks: uniqueCentral.size,
    total_proposals: totalProposals,
    sources_used: sourceBreakdown.length,
    stage_counts: stageCounts,
    first_pickup_at:
      picks.length > 0 ? picks[picks.length - 1].created_at : null,
    last_pickup_at: picks.length > 0 ? picks[0].created_at : null,
  };

  return new Response(
    JSON.stringify({
      org: orgRow,
      summary,
      source_breakdown: sourceBreakdown,
      grants,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}
