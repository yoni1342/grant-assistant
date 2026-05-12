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

  // Latest IG post timestamp — passed to the sidebar so it can show an
  // "unseen" dot on the IG Posts link by comparing against localStorage.
  const { data: latestIgPost } = await supabase
    .from("ig_posts")
    .select("created_at")
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <AdminSidebar
        user={user}
        latestIgPostAt={latestIgPost?.created_at ?? null}
      />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-14 md:pt-0">{children}</main>
    </div>
  );
}
