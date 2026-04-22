import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

// POST: Called by n8n workflow to record raw fetch counts per source
export async function POST(req: Request) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = await req.json();
  const { org_id, sources } = body;
  // sources: Array<{ source: string, raw_count: number }>

  if (!org_id || !sources || !Array.isArray(sources)) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing org_id or sources array" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  // Upsert each source count — add to existing count if already fetched today
  for (const { source, raw_count } of sources) {
    if (!source || typeof raw_count !== "number") continue;

    // Check if row exists for today
    const { data: existing } = await supabase
      .from("grant_source_stats")
      .select("id, raw_count")
      .eq("org_id", org_id)
      .eq("source", source)
      .eq("fetch_date", today)
      .maybeSingle();

    if (existing) {
      // Add to existing count (multiple fetches in a day accumulate)
      await supabase
        .from("grant_source_stats")
        .update({ raw_count: existing.raw_count + raw_count })
        .eq("id", existing.id);
    } else {
      await supabase.from("grant_source_stats").insert({
        org_id,
        source,
        raw_count,
        fetch_date: today,
      });
    }
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { "Content-Type": "application/json" } },
  );
}

// ---------------------------------------------------------------------------
// GET: Called by admin panel — now driven by central_grants table
// ---------------------------------------------------------------------------

/** Extract a readable domain from a source_url */
function extractDomain(url: string | null): string {
  if (!url) return "Unknown";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.length > 40 ? url.slice(0, 40) : url;
  }
}

export async function GET(req: Request) {
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

  // Verify platform admin
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

  const adminClient = createAdminClient();

  // --- Parse date-range filter (from/to query params, ISO 8601) ---
  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const fromISO = fromParam ? new Date(fromParam).toISOString() : null;
  const toISO = toParam ? new Date(toParam).toISOString() : null;

  // --- Fetch all central grants (up to 10 000) ---
  let allCentral: Array<{
    id: string;
    source_url: string | null;
    deadline: string | null;
    first_seen_at: string | null;
    last_seen_at: string | null;
    eligibility: unknown;
  }> = [];

  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    let q = adminClient
      .from("central_grants")
      .select("id, source_url, deadline, first_seen_at, last_seen_at, eligibility")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (fromISO) q = q.gte("first_seen_at", fromISO);
    if (toISO) q = q.lte("first_seen_at", toISO);
    const { data } = await q;
    if (!data || data.length === 0) break;
    allCentral = allCentral.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  // --- Fetch org pipeline grants (source_url used to match back to central) ---
  const allOrgGrants: Array<{
    id: string;
    source_url: string | null;
    stage: string | null;
    source: string | null;
  }> = [];

  page = 0;
  while (true) {
    const { data } = await adminClient
      .from("grants_full")
      .select("id, source_url, stage, source")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (!row.id) continue;
      allOrgGrants.push({
        id: row.id,
        source_url: row.source_url,
        stage: row.stage,
        source: row.source,
      });
    }
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  // --- Fetch proposals ---
  const { data: allProposals } = await adminClient
    .from("proposals")
    .select("id, grant_id");

  // Build sets for quick lookup
  const orgGrantsByUrl: Record<string, typeof allOrgGrants> = {};
  for (const g of allOrgGrants) {
    const key = g.source_url || g.id;
    if (!orgGrantsByUrl[key]) orgGrantsByUrl[key] = [];
    orgGrantsByUrl[key].push(g);
  }

  const proposalsByGrant: Record<string, number> = {};
  for (const p of allProposals || []) {
    if (p.grant_id) proposalsByGrant[p.grant_id] = (proposalsByGrant[p.grant_id] || 0) + 1;
  }

  const now = new Date();
  const rangeEnd = toISO ? new Date(toISO) : now;
  const sevenDaysAgo = new Date(rangeEnd.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const todayStr = rangeEnd.toISOString().split("T")[0];

  // --- Aggregate by source domain ---
  interface SourceStats {
    source: string;
    total: number;
    active: number;
    new_7d: number;
    new_today: number;
    picked_up: number;
    screened: number;
    pending_approval: number;
    proposals: number;
    avg_eligibility: number;
    eligibility_count: number;
    last_seen: string | null;
    stale: boolean;
  }

  const bySource: Record<string, SourceStats> = {};

  function ensureSource(domain: string): SourceStats {
    if (!bySource[domain]) {
      bySource[domain] = {
        source: domain,
        total: 0,
        active: 0,
        new_7d: 0,
        new_today: 0,
        picked_up: 0,
        screened: 0,
        pending_approval: 0,
        proposals: 0,
        avg_eligibility: 0,
        eligibility_count: 0,
        last_seen: null,
        stale: false,
      };
    }
    return bySource[domain];
  }

  const eligibleStages = new Set([
    "screening", "pending_approval", "drafting",
    "submission", "awarded", "reporting", "closed",
  ]);

  for (const cg of allCentral) {
    const domain = extractDomain(cg.source_url);
    const s = ensureSource(domain);
    s.total++;

    // Active = future deadline or no deadline
    const isActive = !cg.deadline || cg.deadline >= todayStr;
    if (isActive) s.active++;

    // New this week / today
    if (cg.first_seen_at && cg.first_seen_at >= sevenDaysAgo) s.new_7d++;
    if (cg.first_seen_at && cg.first_seen_at.startsWith(todayStr)) s.new_today++;

    // Freshness
    if (cg.last_seen_at) {
      if (!s.last_seen || cg.last_seen_at > s.last_seen) s.last_seen = cg.last_seen_at;
    }

    // Eligibility score
    const elig = cg.eligibility as { confidence?: number } | null;
    if (elig?.confidence != null) {
      s.avg_eligibility += elig.confidence;
      s.eligibility_count++;
    }

    // Org pipeline pickup: check if any org grant has matching source_url
    const orgMatches = cg.source_url ? orgGrantsByUrl[cg.source_url] : null;
    if (orgMatches && orgMatches.length > 0) {
      s.picked_up++;
      for (const og of orgMatches) {
        if (og.stage && eligibleStages.has(og.stage)) s.screened++;
        if (og.stage === "pending_approval") s.pending_approval++;
        const pc = proposalsByGrant[og.id] || 0;
        s.proposals += pc;
      }
    }
  }

  // Finalize averages & staleness (relative to range end, or now if no filter)
  const staleThreshold = new Date(rangeEnd.getTime() - 48 * 60 * 60 * 1000).toISOString();
  for (const s of Object.values(bySource)) {
    if (s.eligibility_count > 0) {
      s.avg_eligibility = Math.round(s.avg_eligibility / s.eligibility_count);
    }
    s.stale = !s.last_seen || s.last_seen < staleThreshold;
  }

  // Sort by total desc
  const sources = Object.values(bySource).sort((a, b) => b.total - a.total);

  // Totals
  const totals = {
    total: allCentral.length,
    active: sources.reduce((a, s) => a + s.active, 0),
    new_7d: sources.reduce((a, s) => a + s.new_7d, 0),
    new_today: sources.reduce((a, s) => a + s.new_today, 0),
    sources_tracked: sources.length,
    picked_up: sources.reduce((a, s) => a + s.picked_up, 0),
    screened: sources.reduce((a, s) => a + s.screened, 0),
    pending_approval: sources.reduce((a, s) => a + s.pending_approval, 0),
    proposals: sources.reduce((a, s) => a + s.proposals, 0),
  };

  // New grants per day for chart — spans the filter range, defaults to last 14 days
  const chartStart = fromISO ? new Date(fromISO) : new Date(rangeEnd.getTime() - 13 * 24 * 60 * 60 * 1000);
  const chartEnd = rangeEnd;
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayCount = Math.max(
    1,
    Math.min(
      366,
      Math.ceil((chartEnd.getTime() - chartStart.getTime()) / msPerDay) + 1,
    ),
  );
  const dailyCounts: Record<string, Record<string, number>> = {};
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(chartStart.getTime() + i * msPerDay);
    dailyCounts[d.toISOString().split("T")[0]] = {};
  }
  for (const cg of allCentral) {
    const day = cg.first_seen_at?.split("T")[0];
    if (day && dailyCounts[day] !== undefined) {
      const domain = extractDomain(cg.source_url);
      dailyCounts[day][domain] = (dailyCounts[day][domain] || 0) + 1;
    }
  }
  const daily = Object.entries(dailyCounts).map(([date, bySrc]) => ({
    date,
    total: Object.values(bySrc).reduce((a, b) => a + b, 0),
    by_source: bySrc,
  }));

  return new Response(
    JSON.stringify({ sources, totals, daily }),
    { headers: { "Content-Type": "application/json" } },
  );
}
