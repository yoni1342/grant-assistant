import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Defense-in-depth: middleware handles routing, but double-check
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_platform_admin) redirect("/");

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <AdminSidebar user={user} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-14 md:pt-0">{children}</main>
    </div>
  );
}
