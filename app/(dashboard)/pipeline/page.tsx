import { createClient, getUserOrgId } from "@/lib/supabase/server";
import { PipelineClient } from "./pipeline-client";
import { GrantFetchBanner } from "./grant-fetch-banner";
import { redirect } from "next/navigation";

export default async function PipelinePage() {
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) redirect("/login");

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
      .single(),
  ]);

  return (
    <div>
      {fetchStatus && (
        <div className="px-6 pt-6">
          <GrantFetchBanner orgId={orgId} initialStatus={fetchStatus} />
        </div>
      )}
      <PipelineClient initialGrants={grants || []} />
    </div>
  );
}
