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
  const sourceName = decodeURIComponent(source);
  const adminClient = createAdminClient();
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  // Normalize source names — JSON objects get grouped by domain
  function normalizeSource(s: string): string {
    if (!s) return "Unknown";
    if (!s.startsWith("{")) return s;
    try {
      const parsed = JSON.parse(s);
      if (parsed.url) {
        const hostname = new URL(parsed.url).hostname.replace("www.", "");
        if (hostname.includes("grants.gov")) return "Grants.gov";
        return hostname;
      }
    } catch {
      // not JSON
    }
    return s;
  }

  // Get raw fetch counts — fetch all then filter by normalized source
  const { data: allRawStats } = await adminClient
    .from("grant_source_stats")
    .select("source, raw_count, fetch_date");

  const matchingRaw = (allRawStats || []).filter((r) => normalizeSource(r.source) === sourceName);
  const raw_fetched_total = matchingRaw.reduce((sum, r) => sum + r.raw_count, 0);
  const raw_fetched_filtered = matchingRaw.filter((r) => {
    const d = r.fetch_date;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }).reduce((sum, r) => sum + r.raw_count, 0);

  // Get all grants then filter by normalized source
  const { data: allGrants } = await adminClient
    .from("grants")
    .select("id, title, funder_name, source, source_url, stage, screening_score, deadline, amount, created_at, org_id")
    .order("created_at", { ascending: false });

  const grants = (allGrants || []).filter((g) => normalizeSource(g.source || "Unknown") === sourceName);

  // Get proposals linked to these grants
  const grantIds = (grants || []).map((g) => g.id);
  let proposals: Array<{ id: string; grant_id: string | null; created_at: string | null }> = [];
  if (grantIds.length > 0) {
    const { data } = await adminClient
      .from("proposals")
      .select("id, grant_id, created_at")
      .in("grant_id", grantIds);
    proposals = data || [];
  }

  // Build proposal count per grant
  const proposalsByGrant: Record<string, number> = {};
  for (const p of proposals) {
    if (p.grant_id) {
      proposalsByGrant[p.grant_id] = (proposalsByGrant[p.grant_id] || 0) + 1;
    }
  }

  const eligibleStages = new Set([
    "screening",
    "pending_approval",
    "drafting",
    "submission",
    "awarded",
    "reporting",
    "closed",
  ]);

  function isInRange(dateStr: string | null) {
    if (!dateStr) return false;
    const d = dateStr.substring(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }

  // Build per-grant detail rows
  const rows = (grants || []).map((g) => ({
    id: g.id,
    title: g.title,
    funder_name: g.funder_name,
    source_url: g.source_url,
    stage: g.stage,
    screening_score: g.screening_score,
    deadline: g.deadline,
    amount: g.amount,
    created_at: g.created_at,
    is_eligible: g.stage ? eligibleStages.has(g.stage) : false,
    is_pending: g.stage === "pending_approval",
    proposals_count: proposalsByGrant[g.id] || 0,
    in_range: isInRange(g.created_at),
  }));

  // Summary stats
  const total = rows.length;
  const filtered = rows.filter((r) => r.in_range).length;
  const eligible_total = rows.filter((r) => r.is_eligible).length;
  const eligible_filtered = rows.filter((r) => r.is_eligible && r.in_range).length;
  const pending_total = rows.filter((r) => r.is_pending).length;
  const pending_filtered = rows.filter((r) => r.is_pending && r.in_range).length;
  const proposals_total = proposals.length;
  const proposals_filtered = proposals.filter((p) => isInRange(p.created_at)).length;

  return new Response(
    JSON.stringify({
      source: sourceName,
      grants: rows,
      summary: {
        raw_fetched_total,
        raw_fetched_filtered,
        stored_total: total,
        stored_filtered: filtered,
        eligible_total,
        eligible_filtered,
        pending_approval_total: pending_total,
        pending_approval_filtered: pending_filtered,
        proposals_total,
        proposals_filtered,
      },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}
