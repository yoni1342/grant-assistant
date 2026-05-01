import { createAdminClient, createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// GET /api/admin/org-pickup-stats/daily
// Returns a time-bucketed series of catalog-grant pickups across ALL orgs.
// Used by the org-pickup list page's line chart.
//
// Params:
//   from, to     — ISO 8601 range (required; defaults to last 7 days)
//   granularity  — "hour" | "day" (defaults to "day")
// Output:
//   { points: [{ bucket, count }], total, granularity }
// Missing buckets are filled with count=0 for a continuous line.
// ---------------------------------------------------------------------------

type Granularity = "hour" | "day";

function startOfBucket(d: Date, gran: Granularity): Date {
  const x = new Date(d);
  if (gran === "hour") x.setUTCMinutes(0, 0, 0);
  else x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addBucket(d: Date, gran: Granularity, n = 1): Date {
  const x = new Date(d);
  if (gran === "hour") x.setUTCHours(x.getUTCHours() + n);
  else x.setUTCDate(x.getUTCDate() + n);
  return x;
}

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
  const granParam = url.searchParams.get("granularity");
  const granularity: Granularity = granParam === "hour" ? "hour" : "day";

  const now = new Date();
  const to = toParam ? new Date(toParam) : now;
  const from = fromParam
    ? new Date(fromParam)
    : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
    return new Response(JSON.stringify({ error: "Invalid range" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const adminClient = createAdminClient();

  const PAGE_SIZE = 1000;
  type Row = { created_at: string; org_id: string | null };
  const rows: Row[] = [];
  let page = 0;
  while (true) {
    const { data } = await adminClient
      .from("grants_full")
      .select("created_at, org_id")
      .eq("source_type", "catalog")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    for (const r of data) {
      if (r.created_at) rows.push({ created_at: r.created_at, org_id: r.org_id ?? null });
    }
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  // Resolve org_id → name once, in a single query, for tooltip display.
  const orgIds = Array.from(new Set(rows.map((r) => r.org_id).filter(Boolean) as string[]));
  const orgNames = new Map<string, string>();
  if (orgIds.length > 0) {
    const { data: orgsData } = await adminClient
      .from("organizations")
      .select("id, name")
      .in("id", orgIds);
    for (const o of orgsData || []) orgNames.set(o.id, o.name || "Unknown org");
  }

  // Per-bucket totals + per-org-per-bucket breakdown.
  const counts = new Map<string, number>();
  const orgCounts = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const bucket = startOfBucket(new Date(r.created_at), granularity).toISOString();
    counts.set(bucket, (counts.get(bucket) || 0) + 1);
    if (r.org_id) {
      let inner = orgCounts.get(bucket);
      if (!inner) {
        inner = new Map();
        orgCounts.set(bucket, inner);
      }
      inner.set(r.org_id, (inner.get(r.org_id) || 0) + 1);
    }
  }

  const TOP_ORGS_PER_BUCKET = 5;
  type OrgSlice = { id: string; name: string; count: number };
  type Point = { bucket: string; count: number; orgs: OrgSlice[]; otherOrgsCount: number };

  const points: Point[] = [];
  let cursor = startOfBucket(from, granularity);
  const end = startOfBucket(to, granularity);
  const MAX_BUCKETS = 3000;
  let safety = 0;
  while (cursor <= end && safety++ < MAX_BUCKETS) {
    const key = cursor.toISOString();
    const total = counts.get(key) || 0;
    const inner = orgCounts.get(key);
    let orgs: OrgSlice[] = [];
    let otherOrgsCount = 0;
    if (inner) {
      const sorted = Array.from(inner.entries())
        .map(([id, count]) => ({ id, count, name: orgNames.get(id) || "Unknown org" }))
        .sort((a, b) => b.count - a.count);
      orgs = sorted.slice(0, TOP_ORGS_PER_BUCKET);
      otherOrgsCount = sorted.slice(TOP_ORGS_PER_BUCKET).reduce((s, x) => s + x.count, 0);
    }
    points.push({ bucket: key, count: total, orgs, otherOrgsCount });
    cursor = addBucket(cursor, granularity);
  }

  return new Response(
    JSON.stringify({ points, total: rows.length, granularity }),
    { headers: { "Content-Type": "application/json" } },
  );
}
