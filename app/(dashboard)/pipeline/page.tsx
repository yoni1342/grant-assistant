import { createClient, getUserOrgId } from "@/lib/supabase/server";
import { PipelineClient } from "./pipeline-client";
import { GrantFetchBanner } from "./grant-fetch-banner";
import { redirect } from "next/navigation";
import { triggerFetchGrants } from "./actions";

export default async function PipelinePage() {
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) redirect("/login");

  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const [{ data: grants }, { data: fetchStatus }] = await Promise.all([
    supabase
      .from("grants")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("grant_fetch_status")
      .select("*")
      .eq("org_id", orgId)
      .neq("status", "complete")
      .gte("updated_at", staleThreshold)
      .single(),
  ]);

  // Auto-trigger fetch-grants when pipeline is empty and no fetch is in progress
  const isEmpty = !grants || grants.length === 0;
  const isFetching = !!fetchStatus;
  if (isEmpty && !isFetching) {
    await triggerFetchGrants(orgId);
  }

  // Re-fetch status after triggering so the banner shows immediately
  const activeFetchStatus = isFetching
    ? fetchStatus
    : isEmpty
      ? (await supabase
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
      <PipelineClient initialGrants={grants || []} />
    </div>
  );
}
