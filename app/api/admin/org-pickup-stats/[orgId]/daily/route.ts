import { createAdminClient, createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// GET /api/admin/org-pickup-stats/[orgId]/daily
// Returns a time-bucketed series of this org's catalog-grant pickups.
//
// Params:
//   from, to   — ISO 8601 range (required; client always passes them)
//   granularity — "hour" | "day" (auto-picked client-side: hour for today,
//                 day for longer ranges). Defaults to "day" if omitted.
// Output shape:
//   { points: [{ bucket: ISO-string, count: number }] }
// Missing buckets in the range are filled with count=0 so the chart has
// a continuous x-axis instead of gaps.
// ---------------------------------------------------------------------------

type Granularity = "hour" | "day";

function startOfBucket(d: Date, gran: Granularity): Date {
  const x = new Date(d);
  if (gran === "hour") {
    x.setUTCMinutes(0, 0, 0);
  } else {
    x.setUTCHours(0, 0, 0, 0);
  }
  return x;
}

function addBucket(d: Date, gran: Granularity, n = 1): Date {
  const x = new Date(d);
  if (gran === "hour") x.setUTCHours(x.getUTCHours() + n);
  else x.setUTCDate(x.getUTCDate() + n);
  return x;
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
  const granParam = url.searchParams.get("granularity");
  const granularity: Granularity = granParam === "hour" ? "hour" : "day";

  const now = new Date();
  const to = toParam ? new Date(toParam) : now;
  // Default from: 7 days back when caller omits it.
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

  // Pull all catalog picks for this org in the range (paginated — orgs
  // rarely have >1000 picks in a single window, but be safe).
  const PAGE_SIZE = 1000;
  const timestamps: string[] = [];
  let page = 0;
  while (true) {
    const { data } = await adminClient
      .from("grants_full")
      .select("created_at")
      .eq("org_id", orgId)
      .eq("source_type", "catalog")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    for (const r of data) if (r.created_at) timestamps.push(r.created_at);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  // Bucket into the requested granularity.
  const counts = new Map<string, number>();
  for (const ts of timestamps) {
    const bucket = startOfBucket(new Date(ts), granularity).toISOString();
    counts.set(bucket, (counts.get(bucket) || 0) + 1);
  }

  // Fill missing buckets with 0 so the chart line stays continuous.
  const points: { bucket: string; count: number }[] = [];
  let cursor = startOfBucket(from, granularity);
  const end = startOfBucket(to, granularity);
  // Guard against runaway loops (e.g. 10-year custom range at hour granularity).
  const MAX_BUCKETS = 3000;
  let safety = 0;
  while (cursor <= end && safety++ < MAX_BUCKETS) {
    const key = cursor.toISOString();
    points.push({ bucket: key, count: counts.get(key) || 0 });
    cursor = addBucket(cursor, granularity);
  }

  const total = timestamps.length;
  return new Response(
    JSON.stringify({ points, total, granularity }),
    { headers: { "Content-Type": "application/json" } },
  );
}
