import { createClient, createAdminClient, getUserOrgId } from "@/lib/supabase/server";
import { PipelineClient } from "./pipeline-client";
import { GrantFetchBanner } from "./grant-fetch-banner";
import { redirect } from "next/navigation";
import { triggerFetchGrants } from "./actions";

export default async function PipelinePage() {
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) redirect("/login");

  // Use admin client for data fetching — RLS policies don't support agency users
  // who switch between orgs. Auth is already validated by getUserOrgId above.
  const adminDb = createAdminClient();

  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const [{ data: grants }, { data: fetchStatus }, { data: proposals }] = await Promise.all([
    adminDb
      .from("grants")
      .select("*")
      .eq("org_id", orgId)
      .neq("stage", "archived")
      .order("created_at", { ascending: false }),
    adminDb
      .from("grant_fetch_status")
      .select("*")
      .eq("org_id", orgId)
      .neq("status", "complete")
      .gte("updated_at", staleThreshold)
      .single(),
    adminDb
      .from("proposals")
      .select("id, grant_id, quality_score")
      .eq("org_id", orgId),
  ]);

  // Auto-trigger fetch-grants when pipeline is empty and no fetch is in progress
  // Only for professional and agency plans — free tier must use Discovery manually
  const isEmpty = !grants || grants.length === 0;
  const isFetching = !!fetchStatus;

  const { data: org } = await adminDb
    .from("organizations")
    .select("plan, is_tester")
    .eq("id", orgId)
    .single();
  const orgPlan = org?.plan || "free";

  if (isEmpty && !isFetching && (orgPlan !== "free" || org?.is_tester)) {
    await triggerFetchGrants(orgId);
  }

  // Re-fetch status after triggering so the banner shows immediately
  const activeFetchStatus = isFetching
    ? fetchStatus
    : isEmpty
      ? (await adminDb
          .from("grant_fetch_status")
          .select("*")
          .eq("org_id", orgId)
          .neq("status", "complete")
          .gte("updated_at", staleThreshold)
          .single()).data
      : null;

  return (
    <div>
      {activeFetchStatus && (
        <div className="px-6 pt-6">
          <GrantFetchBanner orgId={orgId} initialStatus={activeFetchStatus} />
        </div>
      )}
      <PipelineClient initialGrants={grants || []} isFetchingGrants={!!activeFetchStatus} proposalQualityMap={
        (proposals || []).reduce((acc, p) => {
          if (p.grant_id && p.quality_score != null) {
            const existing = acc[p.grant_id];
            if (existing == null || p.quality_score > existing) {
              acc[p.grant_id] = p.quality_score;
            }
          }
          return acc;
        }, {} as Record<string, number>)
      } />
    </div>
  );
}
