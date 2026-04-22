import { createAdminClient } from "@/lib/supabase/server";
import { canAutoFetchGrants } from "@/lib/stripe/config";

// Link every currently-active catalog grant into an organization's
// `grants` pipeline at stage = 'discovery'. Used when a new org joins
// so their pipeline is populated immediately, without having to wait
// for the daily scraper or run a per-org search.
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
    .select("id")
    .or(`deadline.is.null,deadline.gte.${today}`);

  if (fetchError) {
    return { copied: 0, error: fetchError.message };
  }
  if (!centralGrants || centralGrants.length === 0) {
    return { copied: 0 };
  }

  const { data: existing } = await supabase
    .from("grants")
    .select("central_grant_id")
    .eq("org_id", orgId)
    .not("central_grant_id", "is", null);

  const existingCentralIds = new Set(
    (existing ?? []).map((g) => g.central_grant_id),
  );

  const rows = centralGrants
    .filter((g) => !existingCentralIds.has(g.id))
    .map((g) => ({
      org_id: orgId,
      central_grant_id: g.id,
      stage: "discovery" as const,
    }));

  if (rows.length === 0) return { copied: 0 };

  const { error: insertError } = await supabase.from("grants").insert(rows);
  if (insertError) {
    return { copied: 0, error: insertError.message };
  }

  return { copied: rows.length };
}
