import { createAdminClient, createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// GET /api/grant-source-stats/daily
// Returns a time-bucketed series of NEW central-grant discoveries (the
// rate at which fresh grants enter the catalog).
// Used by the source-analytics page's line chart.
//
// Params:
//   from, to     — ISO 8601 range (required; defaults to last 7 days)
//   granularity  — "hour" | "day"
// Output:
//   { points: [{ bucket, count }], total, granularity }
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
  const timestamps: string[] = [];
  let page = 0;
  while (true) {
    const { data } = await adminClient
      .from("central_grants")
      .select("first_seen_at")
      .gte("first_seen_at", from.toISOString())
      .lte("first_seen_at", to.toISOString())
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    for (const r of data) if (r.first_seen_at) timestamps.push(r.first_seen_at);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  const counts = new Map<string, number>();
  for (const ts of timestamps) {
    const bucket = startOfBucket(new Date(ts), granularity).toISOString();
    counts.set(bucket, (counts.get(bucket) || 0) + 1);
  }

  const points: { bucket: string; count: number }[] = [];
  let cursor = startOfBucket(from, granularity);
  const end = startOfBucket(to, granularity);
  const MAX_BUCKETS = 3000;
  let safety = 0;
  while (cursor <= end && safety++ < MAX_BUCKETS) {
    const key = cursor.toISOString();
    points.push({ bucket: key, count: counts.get(key) || 0 });
    cursor = addBucket(cursor, granularity);
  }

  return new Response(
    JSON.stringify({ points, total: timestamps.length, granularity }),
    { headers: { "Content-Type": "application/json" } },
  );
}
