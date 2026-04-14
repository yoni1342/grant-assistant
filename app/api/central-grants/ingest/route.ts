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

function normalizeDeadline(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
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
  const newlyInsertedIds: string[] = [];

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
      deadline: normalizeDeadline(g.deadline),
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
      newlyInsertedIds.push(data.id);
    } else {
      updated++;
    }
  }

  // Fan newly-inserted central grants out to every approved org's pipeline
  // so existing users keep seeing fresh grants daily — same UX as before
  // the central catalog existed. Updates to already-known grants don't
  // get fanned out (we don't want to overwrite per-org screening state).
  let fannedOut = 0;
  if (newlyInsertedIds.length > 0) {
    const { data: newCentralGrants, error: fetchErr } = await supabase
      .from("central_grants")
      .select(
        "title, funder_name, organization, amount, deadline, description, eligibility, categories, metadata, source, source_id, source_url",
      )
      .in("id", newlyInsertedIds);

    if (fetchErr) {
      errors.push(`fan-out fetch failed: ${fetchErr.message}`);
    } else if (newCentralGrants && newCentralGrants.length > 0) {
      const { data: orgs, error: orgsErr } = await supabase
        .from("organizations")
        .select("id")
        .eq("status", "approved");

      if (orgsErr) {
        errors.push(`fan-out orgs fetch failed: ${orgsErr.message}`);
      } else if (orgs && orgs.length > 0) {
        const rows = orgs.flatMap((org) =>
          newCentralGrants.map((g) => ({
            org_id: org.id,
            title: g.title,
            funder_name: g.funder_name,
            organization: g.organization,
            amount: g.amount,
            deadline: g.deadline,
            description: g.description,
            eligibility: g.eligibility,
            categories: g.categories,
            metadata: g.metadata,
            source: g.source,
            source_id: g.source_id,
            source_url: g.source_url,
            stage: "discovery" as const,
          })),
        );

        // Insert in chunks; ignore unique-violation duplicates if an org
        // already has the grant from a prior run.
        const chunkSize = 500;
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          const { error: insErr, count } = await supabase
            .from("grants")
            .insert(chunk, { count: "exact" });
          if (insErr) {
            errors.push(`fan-out insert failed: ${insErr.message}`);
          } else {
            fannedOut += count ?? chunk.length;
          }
        }
      }
    }
  }

  return Response.json({
    success: true,
    inserted,
    updated,
    fanned_out: fannedOut,
    errors: errors.length > 0 ? errors : undefined,
  });
}
