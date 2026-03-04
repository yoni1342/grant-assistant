import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { OrgDetailClient } from "./org-detail-client";

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all org data in parallel
  const [
    { data: organization },
    { data: profiles },
    { data: grants },
    { data: proposals },
    { data: workflowExecutions },
    { data: activityLog },
  ] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", id).single(),
    supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .eq("org_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("grants")
      .select("id, title, funder_name, stage, amount, created_at")
      .eq("org_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("proposals")
      .select("id, title, status, quality_score, created_at")
      .eq("org_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("workflow_executions")
      .select("id, workflow_name, status, created_at, completed_at")
      .eq("org_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("activity_log")
      .select("id, action, created_at")
      .eq("org_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!organization) notFound();

  return (
    <div className="p-6">
      <OrgDetailClient
        organization={organization}
        profiles={profiles || []}
        grants={grants || []}
        proposals={proposals || []}
        workflowExecutions={workflowExecutions || []}
        activityLog={activityLog || []}
      />
    </div>
  );
}
