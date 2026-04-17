import { createAdminClient } from "@/lib/supabase/server";
import { canAutoFetchGrants } from "@/lib/stripe/config";

// Copy every currently-active grant from the central catalog into an
// organization's `grants` pipeline at stage = 'discovery'. Used when a
// new org joins so their pipeline is populated immediately, without
// having to wait for the daily scraper or run a per-org search.
//
// "Active" = no deadline, or deadline in the future. Mirrors the
// expired-grant filter used elsewhere in the app.
//
// Skipped for free-tier non-testers — they must use Discovery manually
// and are capped at 1 grant/day.
export async function seedOrgGrantsFromCentral(orgId: string): Promise<{
  copied: number;
  error?: string;
}> {
  const supabase = createAdminClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("plan, is_tester")
    .eq("id", orgId)
    .single();

  if (!canAutoFetchGrants(org)) {
    return { copied: 0 };
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: centralGrants, error: fetchError } = await supabase
    .from("central_grants")
    .select(
      "title, funder_name, organization, amount, deadline, description, eligibility, categories, metadata, source, source_id, source_url",
    )
    .or(`deadline.is.null,deadline.gte.${today}`);

  if (fetchError) {
    return { copied: 0, error: fetchError.message };
  }
  if (!centralGrants || centralGrants.length === 0) {
    return { copied: 0 };
  }

  // Skip grants this org already has (same source + source_id, or same
  // source + source_url when no source_id). Cheaper than per-row checks.
  const { data: existing } = await supabase
    .from("grants")
    .select("source, source_id, source_url")
    .eq("org_id", orgId);

  const existingKeys = new Set(
    (existing ?? []).map((g) =>
      g.source_id
        ? `id::${g.source}::${g.source_id}`
        : `url::${g.source}::${g.source_url}`,
    ),
  );

  const rows = centralGrants
    .filter((g) => {
      const key = g.source_id
        ? `id::${g.source}::${g.source_id}`
        : `url::${g.source}::${g.source_url}`;
      return !existingKeys.has(key);
    })
    .map((g) => ({
      org_id: orgId,
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
    }));

  if (rows.length === 0) return { copied: 0 };

  const { error: insertError } = await supabase.from("grants").insert(rows);
  if (insertError) {
    return { copied: 0, error: insertError.message };
  }

  return { copied: rows.length };
}
