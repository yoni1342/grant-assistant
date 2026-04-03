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

// GET: Called by admin panel to fetch aggregated stats
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
  const url = new URL(req.url);
  const from = url.searchParams.get("from"); // YYYY-MM-DD
  const to = url.searchParams.get("to"); // YYYY-MM-DD

  // Normalize source names — JSON objects get grouped by domain
  function normalizeSource(source: string): string {
    if (!source) return "Unknown";
    if (!source.startsWith("{")) return source;
    try {
      const parsed = JSON.parse(source);
      if (parsed.url) {
        const hostname = new URL(parsed.url).hostname.replace("www.", "");
        // Map known domains to clean names
        if (hostname.includes("grants.gov")) return "Grants.gov";
        return hostname;
      }
    } catch {
      // not JSON
    }
    return source;
  }

  // 1. Raw fetch counts — all time
  const { data: allTimeRaw } = await adminClient
    .from("grant_source_stats")
    .select("source, raw_count");

  // Raw fetch counts — filtered by date range
  let filteredRawQuery = adminClient
    .from("grant_source_stats")
    .select("source, raw_count");
  if (from) filteredRawQuery = filteredRawQuery.gte("fetch_date", from);
  if (to) filteredRawQuery = filteredRawQuery.lte("fetch_date", to);
  const { data: filteredRaw } = await filteredRawQuery;

  // 2. Grants stored (in grants table), by source — all
  const { data: allGrants } = await adminClient
    .from("grants")
    .select("source, stage, created_at, id");

  // 3. Proposals count by grant source
  const { data: allProposals } = await adminClient
    .from("proposals")
    .select("id, grant_id, created_at");

  // Build grant ID to normalized source mapping
  const grantSourceMap: Record<string, string> = {};
  for (const g of allGrants || []) {
    if (g.source) grantSourceMap[g.id] = normalizeSource(g.source);
  }

  interface Stats {
    raw_fetched_total: number;
    raw_fetched_filtered: number;
    stored_total: number;
    stored_filtered: number;
    eligible_total: number;
    eligible_filtered: number;
    pending_approval_total: number;
    pending_approval_filtered: number;
    proposals_total: number;
    proposals_filtered: number;
  }

  const sourceStats: Record<string, Stats> = {};

  function ensureSource(source: string) {
    if (!sourceStats[source]) {
      sourceStats[source] = {
        raw_fetched_total: 0,
        raw_fetched_filtered: 0,
        stored_total: 0,
        stored_filtered: 0,
        eligible_total: 0,
        eligible_filtered: 0,
        pending_approval_total: 0,
        pending_approval_filtered: 0,
        proposals_total: 0,
        proposals_filtered: 0,
      };
    }
  }

  // Raw fetched — all time
  for (const row of allTimeRaw || []) {
    const src = normalizeSource(row.source);
    ensureSource(src);
    sourceStats[src].raw_fetched_total += row.raw_count;
  }

  // Raw fetched — filtered date range
  for (const row of filteredRaw || []) {
    const src = normalizeSource(row.source);
    ensureSource(src);
    sourceStats[src].raw_fetched_filtered += row.raw_count;
  }

  // Helper: check if a timestamp falls within the date range
  function isInRange(dateStr: string | null) {
    if (!dateStr) return false;
    const d = dateStr.substring(0, 10); // YYYY-MM-DD from ISO timestamp
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }

  // Eligible stages (past screening)
  const eligibleStages = new Set([
    "screening",
    "pending_approval",
    "drafting",
    "submission",
    "awarded",
    "reporting",
    "closed",
  ]);

  // Grants — stored, eligible, pending_approval
  for (const g of allGrants || []) {
    const src = normalizeSource(g.source || "Unknown");
    ensureSource(src);
    const inRange = isInRange(g.created_at);

    sourceStats[src].stored_total++;
    if (inRange) sourceStats[src].stored_filtered++;

    if (g.stage && eligibleStages.has(g.stage)) {
      sourceStats[src].eligible_total++;
      if (inRange) sourceStats[src].eligible_filtered++;
    }

    if (g.stage === "pending_approval") {
      sourceStats[src].pending_approval_total++;
      if (inRange) sourceStats[src].pending_approval_filtered++;
    }
  }

  // Proposals — by grant source
  for (const p of allProposals || []) {
    const src = p.grant_id ? grantSourceMap[p.grant_id] || "Unknown" : "Unknown";
    ensureSource(src);
    sourceStats[src].proposals_total++;
    if (isInRange(p.created_at)) sourceStats[src].proposals_filtered++;
  }

  // Convert to array sorted by raw_fetched_total desc
  const result = Object.entries(sourceStats)
    .map(([source, stats]) => ({ source, ...stats }))
    .sort((a, b) => b.raw_fetched_total - a.raw_fetched_total);

  // Compute totals
  const emptyTotals: Stats = {
    raw_fetched_total: 0,
    raw_fetched_filtered: 0,
    stored_total: 0,
    stored_filtered: 0,
    eligible_total: 0,
    eligible_filtered: 0,
    pending_approval_total: 0,
    pending_approval_filtered: 0,
    proposals_total: 0,
    proposals_filtered: 0,
  };

  const totals = result.reduce((acc, row) => {
    (Object.keys(emptyTotals) as (keyof Stats)[]).forEach((k) => {
      acc[k] += row[k];
    });
    return acc;
  }, { ...emptyTotals });

  return new Response(
    JSON.stringify({ sources: result, totals, filters: { from, to } }),
    { headers: { "Content-Type": "application/json" } },
  );
}
