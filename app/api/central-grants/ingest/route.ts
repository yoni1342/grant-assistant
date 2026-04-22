import { createAdminClient } from "@/lib/supabase/server";

// Daily ingest endpoint for the global grant scraper workflow.
// The n8n workflow (running once per day, not per-org) POSTs batches
// of grants here. We upsert them into `central_grants` keyed by
// (source, source_id) — falling back to (source, source_url) when the
// source doesn't expose a stable id.

interface IncomingGrant {
  title: string;
  funder_name?: string | null;
  organization?: string | null;
  amount?: string | number | null;
  deadline?: string | null;
  description?: string | null;
  eligibility?: unknown;
  categories?: unknown;
  metadata?: Record<string, unknown> | null;
  source: string;
  source_id?: string | null;
  source_url?: string | null;
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { grants?: IncomingGrant[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const grants = body.grants;
  if (!Array.isArray(grants) || grants.length === 0) {
    return Response.json({ success: false, error: "Missing grants array" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  // Upsert one grant at a time so we can pick the right conflict target
  // depending on whether source_id is present. Bulk upsert isn't safe here
  // because the dedupe key differs per row.
  for (const g of grants) {
    if (!g.title || !g.source) {
      errors.push("Skipped grant missing title or source");
      continue;
    }
    if (!g.source_id && !g.source_url) {
      errors.push(`Skipped "${g.title}": no source_id or source_url`);
      continue;
    }

    const row = {
      title: g.title,
      funder_name: g.funder_name ?? null,
      organization: g.organization ?? null,
      amount: g.amount == null ? null : String(g.amount),
      deadline: g.deadline ?? null,
      description: g.description ?? null,
      eligibility: g.eligibility ?? null,
      categories: g.categories ?? null,
      metadata: g.metadata ?? null,
      source: g.source,
      source_id: g.source_id ?? null,
      source_url: g.source_url ?? null,
      last_seen_at: now,
    };

    const conflictTarget = g.source_id ? "source,source_id" : "source,source_url";

    const { data, error } = await supabase
      .from("central_grants")
      .upsert(row, { onConflict: conflictTarget, ignoreDuplicates: false })
      .select("id, created_at, updated_at")
      .single();

    if (error) {
      errors.push(`${g.title}: ${error.message}`);
      continue;
    }

    if (data && data.created_at === data.updated_at) {
      inserted++;
    } else {
      updated++;
    }
  }

  // Fan-out to per-org pipelines happens in the daily
  // /api/cron/fan-out-central-grants route, which triggers the n8n
  // Grant fetch workflow per approved org so the AI niche filter runs.
  return Response.json({
    success: true,
    inserted,
    updated,
    errors: errors.length > 0 ? errors : undefined,
  });
}
