import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProposalsClient } from "./proposals-client";

export default async function AdminProposalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: proposals }, { data: organizations }] = await Promise.all([
    supabase
      .from("proposals")
      .select("id, title, status, quality_score, org_id, grant_id, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("organizations")
      .select("id, name")
      .order("name"),
  ]);

  // Fetch grant titles for display
  const grantIds = [...new Set((proposals || []).map((p) => p.grant_id).filter(Boolean))];
  const grantMap: Record<string, string> = {};
  if (grantIds.length > 0) {
    const { data: grants } = await supabase
      .from("grants_full")
      .select("id, title")
      .in("id", grantIds);
    for (const g of grants || []) {
      if (g.id && g.title) grantMap[g.id] = g.title;
    }
  }

  return (
    <div className="p-6">
      <ProposalsClient
        proposals={proposals || []}
        organizations={organizations || []}
        grantMap={grantMap}
      />
    </div>
  );
}
