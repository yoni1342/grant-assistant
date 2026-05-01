import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { getActiveOrgId } from "@/lib/agency/context";
import { getAdminViewOrgId } from "@/lib/admin/context";
import { AdminViewBanner } from "@/components/admin-view-banner";
import { ReadOnlyProvider } from "@/components/read-only-provider";
import { TourWrapper } from "@/components/tour-wrapper";

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
    .select("org_id, is_platform_admin, agency_id, preferences, organizations(status)")
    .eq("id", user.id)
    .single();

  // Fallback if agency_id column doesn't exist yet
  if (!profile) {
    const fallback = await supabase
      .from("profiles")
      .select("org_id, is_platform_admin, preferences, organizations(status)")
      .eq("id", user.id)
      .single();
    profile = fallback.data ? { ...fallback.data, agency_id: null } as unknown as typeof profile : null;
  }

  // Admin viewing as organization — allow through with read-only mode
  const isAdminView = profile?.is_platform_admin === true;
  let adminViewOrgId: string | null = null;
  let adminViewOrgName: string | null = null;

  if (isAdminView) {
    adminViewOrgId = await getAdminViewOrgId();
    if (!adminViewOrgId) {
      redirect("/admin");
    }
    // Fetch the org name for the banner
    const adminClient = createAdminClient();
    const { data: viewedOrg } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", adminViewOrgId)
      .single();
    if (!viewedOrg) {
      redirect("/admin");
    }
    adminViewOrgName = viewedOrg.name;
  }

  if (!isAdminView) {
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
  }

  const activeOrgId = profile?.agency_id ? await getActiveOrgId() : null;

  // Fetch plan, name and tour preferences for the tour provider / sidebar
  const resolvedOrgId = isAdminView ? adminViewOrgId : (activeOrgId || profile?.org_id);
  let orgPlan = "free";
  let orgName: string | null = null;
  if (resolvedOrgId) {
    const adminClient = createAdminClient();
    const { data: org } = await adminClient
      .from("organizations")
      .select("plan, name")
      .eq("id", resolvedOrgId)
      .single();
    if (org?.plan) orgPlan = org.plan;
    if (org?.name) orgName = org.name;
  }
  const prefs = (profile?.preferences as Record<string, unknown>) || {};
  const toursCompleted = (prefs.tours_completed as Record<string, string>) || {};

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <Sidebar
        user={user}
        agencyId={isAdminView ? undefined : (profile?.agency_id ?? null)}
        activeOrgId={isAdminView ? adminViewOrgId : activeOrgId}
        organizationName={orgName}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 pt-14 md:pt-0">
        {isAdminView && adminViewOrgName && (
          <AdminViewBanner orgName={adminViewOrgName} />
        )}
        <ReadOnlyProvider readOnly={isAdminView}>
          <TourWrapper plan={orgPlan} toursCompleted={toursCompleted}>
            <main className={`flex-1 overflow-y-auto overflow-x-hidden${isAdminView ? " read-only-mode" : ""}`}>{children}</main>
          </TourWrapper>
        </ReadOnlyProvider>
      </div>
    </div>
  );
}
