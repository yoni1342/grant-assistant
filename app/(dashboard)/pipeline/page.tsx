import { createClient, getUserOrgId } from "@/lib/supabase/server";
import { PipelineClient } from "./pipeline-client";
import { redirect } from "next/navigation";

export default async function PipelinePage() {
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) redirect("/login");

  const { data: grants } = await supabase
    .from("grants")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return <PipelineClient initialGrants={grants || []} />;
}
