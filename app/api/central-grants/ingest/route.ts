import { createAdminClient } from "@/lib/supabase/server";
import {
  normalizeSourceUrl,
  normalizeTitle,
  normalizeSource,
} from "@/lib/grants/source-url";

// Daily ingest endpoint for the global grant scraper workflow.
// The n8n workflow (running once per day, not per-org) POSTs batches
// of grants here. We upsert them into `central_grants` keyed by
// `(source_url, title_norm)` when a URL is present, falling back to
// `(source, source_id)` only when the source doesn't expose a URL.
//
// Why title+url together: the same grant gets scraped by Grants.gov,
// Grantivia, and the scanner; they share the URL but each pick a
// different `source` value. URL alone would be tempting, but some
// scrapers (e.g. CFNJ) point every grant at a generic landing page
// and would collapse unrelated grants into one. URL+title catches
// the cross-source dupes without merging unrelated ones.
//
// `source` is also normalized — the scanner workflow has historically
// sent JSON-blob source values with a per-run timestamp, which broke
// the old `(source, source_id)` index. They collapse to "Scanner" now.

const REFERENCE_DB_URL_PATTERNS: RegExp[] = [
  /\bprojects\.propublica\.org\/nonprofits\b/i,
  /\busaspending\.gov\b/i,
];

function isReferenceDatabaseUrl(url: string): boolean {
  return REFERENCE_DB_URL_PATTERNS.some((re) => re.test(url));
}

// Funder-overview placeholders: when the discovery agent can't find a real
// program for a foundation, it returns the foundation's homepage and tags
// the title with one of these suffixes. The funder is real, but the row is
// not an opportunity — no application page, no deadline, fabricated amount.
const FUNDER_OVERVIEW_TITLE_PATTERNS: RegExp[] = [
  / - (Major )?Philanthropic Foundation$/i,
  / - Potential Grant Source$/i,
];

function isFunderOverviewTitle(title: string): boolean {
  return FUNDER_OVERVIEW_TITLE_PATTERNS.some((re) => re.test(title));
}

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
  let rejected = 0;
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
    // Reject rows whose source is a reference database, not a grant listing.
    // ProPublica /nonprofits/ pages are 990 tax filings; usaspending.gov pages
    // are historical award records (formula-grant disbursements). Neither is
    // an open opportunity, but discovery agents have been ingesting them as if
    // they were — see 2026-04-28 cleanup that purged 2,668 rows.
    if (g.source_url && isReferenceDatabaseUrl(g.source_url)) {
      rejected++;
      errors.push(`Rejected "${g.title}": ${g.source_url} is a reference database, not a grant opportunity`);
      continue;
    }
    if (isFunderOverviewTitle(g.title)) {
      rejected++;
      errors.push(`Rejected "${g.title}": funder overview, not a specific grant program`);
      continue;
    }

    const normalizedUrl = normalizeSourceUrl(g.source_url);
    const normalizedTitle = normalizeTitle(g.title);
    const normalizedSource = normalizeSource(g.source);

    // Prefer (source_url, title_norm) dedup so the same opportunity scraped
    // by different sources collapses to one row. Existing-row writes only
    // bump last_seen_at — title/funder/source stay with whichever scraper
    // found the grant first, so re-ingest doesn't overwrite canonical data.
    if (normalizedUrl && normalizedTitle) {
      const { data: existing, error: lookupError } = await supabase
        .from("central_grants")
        .select("id, created_at")
        .eq("source_url", normalizedUrl)
        .eq("title_norm", normalizedTitle)
        .maybeSingle();

      if (lookupError) {
        errors.push(`${g.title}: ${lookupError.message}`);
        continue;
      }

      if (existing) {
        const { error: touchError } = await supabase
          .from("central_grants")
          .update({ last_seen_at: now })
          .eq("id", existing.id);
        if (touchError) {
          errors.push(`${g.title}: ${touchError.message}`);
          continue;
        }
        updated++;
        continue;
      }

      const { error: insertError } = await supabase
        .from("central_grants")
        .insert({
          title: g.title,
          title_norm: normalizedTitle,
          funder_name: g.funder_name ?? null,
          organization: g.organization ?? null,
          amount: g.amount == null ? null : String(g.amount),
          deadline: g.deadline ?? null,
          description: g.description ?? null,
          eligibility: g.eligibility ?? null,
          categories: g.categories ?? null,
          metadata: g.metadata ?? null,
          source: normalizedSource,
          source_id: g.source_id ?? null,
          source_url: normalizedUrl,
          last_seen_at: now,
        });
      if (insertError) {
        errors.push(`${g.title}: ${insertError.message}`);
        continue;
      }
      inserted++;
      continue;
    }

    // Fallback: no URL or no title, dedup on (source, source_id).
    const row = {
      title: g.title,
      title_norm: normalizedTitle,
      funder_name: g.funder_name ?? null,
      organization: g.organization ?? null,
      amount: g.amount == null ? null : String(g.amount),
      deadline: g.deadline ?? null,
      description: g.description ?? null,
      eligibility: g.eligibility ?? null,
      categories: g.categories ?? null,
      metadata: g.metadata ?? null,
      source: normalizedSource,
      source_id: g.source_id ?? null,
      source_url: normalizedUrl,
      last_seen_at: now,
    };

    const { data, error } = await supabase
      .from("central_grants")
      .upsert(row, { onConflict: "source,source_id", ignoreDuplicates: false })
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
    rejected,
    errors: errors.length > 0 ? errors : undefined,
  });
}
