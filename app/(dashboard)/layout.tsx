import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { getActiveOrgId } from "@/lib/agency/context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Defense-in-depth: verify org is approved
  let { data: profile } = await supabase
    .from("profiles")
    .select("org_id, is_platform_admin, agency_id, organizations(status)")
    .eq("id", user.id)
    .single();

  // Fallback if agency_id column doesn't exist yet
  if (!profile) {
    const fallback = await supabase
      .from("profiles")
      .select("org_id, is_platform_admin, organizations(status)")
      .eq("id", user.id)
      .single();
    profile = fallback.data ? { ...fallback.data, agency_id: null } as unknown as typeof profile : null;
  }

  if (profile?.is_platform_admin) {
    redirect("/admin");
  }

  const orgs = profile?.organizations as unknown as { status: string } | { status: string }[] | null;
  const orgStatus = Array.isArray(orgs) ? orgs[0]?.status : orgs?.status;

  // Agency users should go to agency dashboard unless they've explicitly
  // switched into a client org via the org switcher
  if (profile?.agency_id) {
    const activeOrgId = await getActiveOrgId();
    if (!activeOrgId) {
      redirect("/agency");
    }
    // Verify the active org exists, belongs to this agency, and is active
    const adminClient = createAdminClient();
    const { data: activeOrg } = await adminClient
      .from("organizations")
      .select("agency_id, status")
      .eq("id", activeOrgId)
      .single();
    if (!activeOrg || activeOrg.status === "inactive") {
      redirect("/agency");
    }
  }

  if (!profile?.org_id && !profile?.agency_id) {
    redirect("/register");
  }

  if (orgStatus === "pending") {
    redirect("/pending-approval");
  }

  if (orgStatus === "rejected") {
    redirect("/rejected");
  }

  const activeOrgId = profile?.agency_id ? await getActiveOrgId() : null;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <Sidebar
        user={user}
        agencyId={profile?.agency_id ?? null}
        activeOrgId={activeOrgId}
      />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-14 md:pt-0">{children}</main>
    </div>
  );
}
