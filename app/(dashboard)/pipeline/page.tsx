import { createClient, createAdminClient, getUserOrgId } from "@/lib/supabase/server";
import { PipelineClient } from "./pipeline-client";
import { GrantFetchBanner } from "./grant-fetch-banner";
import { redirect } from "next/navigation";
import { triggerFetchGrants } from "./actions";
import { excludeFetchedExpired } from "@/lib/grants/filters";

export default async function PipelinePage() {
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) redirect("/login");

  // Use admin client for data fetching — RLS policies don't support agency users
  // who switch between orgs. Auth is already validated by getUserOrgId above.
  const adminDb = createAdminClient();

  // eslint-disable-next-line react-hooks/purity
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // Match the 10-minute stale window used by proposal-concurrency.ts so a
  // crashed workflow doesn't leave the UI in a permanent "generating" state.
  // eslint-disable-next-line react-hooks/purity
  const generatingCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const [grantsResult, { data: fetchStatus }, { data: proposals }, { data: runningProposalRows }] = await Promise.all([
    adminDb
      .from("grants_full")
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
    adminDb
      .from("workflow_executions")
      .select("grant_id")
      .eq("org_id", orgId)
      .eq("workflow_name", "generate-proposal")
      .eq("status", "running")
      .gte("created_at", generatingCutoff),
  ]);

  const generatingGrantIds = Array.from(
    new Set(
      (runningProposalRows || [])
        .map((r) => r.grant_id)
        .filter((id): id is string => !!id),
    ),
  );

  // Delete grants that were already expired when fetched (deadline < created_at).
  // These are irrelevant — the user never had a chance at them.
  // Grants that expire AFTER being added are handled by the close-expired-grants cron.
  const allFetched = grantsResult.data || [];
  const validGrants = excludeFetchedExpired(allFetched);
  if (validGrants.length < allFetched.length) {
    const validIds = new Set(validGrants.map((g) => g.id));
    const expiredIds = allFetched.filter((g) => !validIds.has(g.id)).map((g) => g.id);
    await adminDb.from("grants").delete().in("id", expiredIds);
  }
  const grants = validGrants;

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

  const didTriggerFetch = isEmpty && !isFetching && (orgPlan !== "free" || org?.is_tester);
  if (didTriggerFetch) {
    await triggerFetchGrants(orgId);
  }

  // Use existing status if already fetching, or construct it directly
  // when we just triggered — avoids a re-fetch race condition
  const activeFetchStatus = isFetching
    ? fetchStatus
    : didTriggerFetch
      ? { org_id: orgId, status: "searching", stage_message: "Automatically fetching grants for your organization…", error_message: null }
      : null;

  return (
    <div data-tour="pipeline-board">
      {activeFetchStatus && (
        <div className="px-4 sm:px-6 pt-4 sm:pt-6">
          <GrantFetchBanner orgId={orgId} initialStatus={activeFetchStatus} />
        </div>
      )}
      <PipelineClient
        initialGrants={grants || []}
        orgId={orgId}
        isFetchingGrants={!!activeFetchStatus}
        initialGeneratingGrantIds={generatingGrantIds}
        proposalQualityMap={
          (proposals || []).reduce((acc, p) => {
            if (p.grant_id && p.quality_score != null) {
              const existing = acc[p.grant_id];
              if (existing == null || p.quality_score > existing) {
                acc[p.grant_id] = p.quality_score;
              }
            }
            return acc;
          }, {} as Record<string, number>)
        }
      />
    </div>
  );
}
