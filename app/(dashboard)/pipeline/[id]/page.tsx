import { createClient, getUserOrgId } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { GrantDetail } from "./grant-detail";

export default async function GrantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) redirect("/login");

  const { data: grant } = await supabase
    .from("grants")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  if (!grant) {
    notFound();
  }

  const { data: activities } = await supabase
    .from("activity_log")
    .select("*")
    .eq("grant_id", id)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: workflows } = await supabase
    .from("workflow_executions")
    .select("*")
    .eq("grant_id", id)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch proposals and org name for this grant
  const [{ data: proposals }, { data: org }] = await Promise.all([
    supabase
      .from("proposals")
      .select("id, title, status, quality_score")
      .eq("grant_id", id)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single(),
  ]);

  return (
    <GrantDetail
      grant={grant}
      activities={activities || []}
      workflows={workflows || []}
      proposals={proposals || []}
      orgName={org?.name || "your organization"}
    />
  );
}
