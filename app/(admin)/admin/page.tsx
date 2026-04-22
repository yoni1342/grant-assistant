import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OverviewClient } from "./overview-client";
import { getLiveMrrFromStripe } from "@/lib/stripe/metrics";

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all platform data in parallel
  const [
    { data: organizations },
    { count: totalUsers },
    { data: grants },
    { data: proposals },
    { data: workflowExecutions },
    { data: activityLog },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, status, created_at, sector, plan, subscription_status, trial_ends_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("grants")
      .select("id, created_at, stage")
      .order("created_at", { ascending: false }),
    supabase
      .from("proposals")
      .select("id, created_at, status")
      .order("created_at", { ascending: false }),
    supabase
      .from("workflow_executions")
      .select("id, created_at, status")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("activity_log")
      .select("id, action, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Find last 5 pending orgs with owner info
  const pendingOrgs = (organizations || []).filter(
    (o) => o.status === "pending"
  );
  const pendingOrgIds = pendingOrgs.slice(0, 5).map((o) => o.id);

  let pendingWithOwners: Array<{
    id: string;
    name: string;
    created_at: string | null;
    owner_name: string | null;
    owner_email: string | null;
  }> = [];

  if (pendingOrgIds.length > 0) {
    const { data: ownerProfiles } = await supabase
      .from("profiles")
      .select("org_id, full_name, email, role")
      .in("org_id", pendingOrgIds)
      .eq("role", "owner");

    pendingWithOwners = pendingOrgs.slice(0, 5).map((org) => {
      const owner = ownerProfiles?.find((p) => p.org_id === org.id);
      return {
        id: org.id,
        name: org.name,
        created_at: org.created_at,
        owner_name: owner?.full_name || null,
        owner_email: owner?.email || null,
      };
    });
  }

  // Count deactivated users via auth admin API
  const adminClient = createAdminClient();
  const { data: authData } = await adminClient.auth.admin.listUsers();
  const deactivatedUsers = (authData?.users || []).filter(
    (u) => u.banned_until && new Date(u.banned_until) > new Date()
  ).length;

  let mrr: number | null = null;
  try {
    mrr = await getLiveMrrFromStripe();
  } catch (err) {
    console.error("[admin/overview] Failed to fetch MRR from Stripe:", err);
  }

  return (
    <div className="p-6">
      <OverviewClient
        organizations={organizations || []}
        totalUsers={totalUsers || 0}
        deactivatedUsers={deactivatedUsers}
        grants={grants || []}
        proposals={proposals || []}
        workflowExecutions={workflowExecutions || []}
        activityLog={activityLog || []}
        pendingOrgsWithOwners={pendingWithOwners}
        mrr={mrr}
      />
    </div>
  );
}
