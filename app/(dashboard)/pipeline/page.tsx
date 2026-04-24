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

  // Match the 10-minute stale window used by proposal-concurrency.ts so a
  // crashed workflow doesn't leave the UI in a permanent "generating" state.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const generatingCutoff = new Date(nowMs - 10 * 60 * 1000).toISOString();

  const [grantsResult, { data: fetchSchedule }, { data: proposals }, { data: runningProposalRows }] = await Promise.all([
    adminDb
      .from("grants_full")
      .select("*")
      .eq("org_id", orgId)
      .neq("stage", "archived")
      .order("created_at", { ascending: false }),
    // Single source of truth for "is a fetch in progress?" — the same view
    // the admin Fetch Queue reads. run_state='running' iff last_grant_fetch_at
    // is within the 30-minute window and no catalog/manual grants have landed
    // yet. Decouples UI from n8n's (unreliable) terminal status write.
    adminDb
      .from("org_fetch_schedule")
      .select("run_state, last_grant_fetch_at")
      .eq("id", orgId)
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

  // A grant is "generating" only if a workflow row says so AND no proposal
  // artifact exists yet. The proposals row is the source of truth for
  // completion — once it's there, the card must show "done" regardless of
  // whether workflow_executions was ever flipped from 'running' to 'completed'
  // (n8n doesn't reliably do that write).
  const grantsWithProposals = new Set(
    (proposals || [])
      .map((p) => p.grant_id)
      .filter((id): id is string => !!id),
  );
  const generatingGrantIds = Array.from(
    new Set(
      (runningProposalRows || [])
        .map((r) => r.grant_id)
        .filter(
          (id): id is string => !!id && !grantsWithProposals.has(id),
        ),
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
  const isFetching = fetchSchedule?.run_state === "running";

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

  // Banner visibility window: same 30-minute cutoff the view uses to classify
  // run_state='running'. When this timestamp passes client-side, the banner
  // self-hides even if the page isn't reloaded.
  const bannerHideAt =
    isFetching && fetchSchedule?.last_grant_fetch_at
      ? new Date(
          new Date(fetchSchedule.last_grant_fetch_at).getTime() + 30 * 60 * 1000,
        ).toISOString()
      : didTriggerFetch
        ? new Date(nowMs + 30 * 60 * 1000).toISOString()
        : null;

  return (
    <div data-tour="pipeline-board">
      {bannerHideAt && (
        <div className="px-4 sm:px-6 pt-4 sm:pt-6">
          <GrantFetchBanner hideAt={bannerHideAt} />
        </div>
      )}
      <PipelineClient
        initialGrants={grants || []}
        orgId={orgId}
        isFetchingGrants={!!bannerHideAt}
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
