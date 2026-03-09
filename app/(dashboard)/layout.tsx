import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

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
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, is_platform_admin, organizations(status)")
    .eq("id", user.id)
    .single();

  if (profile?.is_platform_admin) {
    redirect("/admin");
  }

  const orgs = profile?.organizations as unknown as { status: string } | { status: string }[] | null;
  const orgStatus = Array.isArray(orgs) ? orgs[0]?.status : orgs?.status;

  if (!profile?.org_id) {
    redirect("/register");
  }

  if (orgStatus === "pending") {
    redirect("/pending-approval");
  }

  if (orgStatus === "rejected") {
    redirect("/rejected");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
