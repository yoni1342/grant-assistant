import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AgencySidebar } from "@/components/agency-sidebar";

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id) redirect("/dashboard");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AgencySidebar user={user} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
