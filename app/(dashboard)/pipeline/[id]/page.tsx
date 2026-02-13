import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { GrantDetail } from "./grant-detail";

export default async function GrantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: grant } = await supabase
    .from("grants")
    .select("*")
    .eq("id", id)
    .single();

  if (!grant) {
    notFound();
  }

  const { data: activities } = await supabase
    .from("activity_log")
    .select("*")
    .eq("grant_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: workflows } = await supabase
    .from("workflow_executions")
    .select("*")
    .eq("grant_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch proposals for this grant
  const { data: proposals } = await supabase
    .from("proposals")
    .select("id, title, status")
    .eq("grant_id", id)
    .order("created_at", { ascending: false });

  return (
    <GrantDetail
      grant={grant}
      activities={activities || []}
      workflows={workflows || []}
      proposals={proposals || []}
    />
  );
}
