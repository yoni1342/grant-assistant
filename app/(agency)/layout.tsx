import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AgencySidebar } from "@/components/agency-sidebar";
import { TourWrapper } from "@/components/tour-wrapper";

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
    .select("agency_id, preferences")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id) redirect("/dashboard");

  const prefs = (profile.preferences as Record<string, unknown>) || {};
  const toursCompleted = (prefs.tours_completed as Record<string, string>) || {};

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <AgencySidebar user={user} />
      <TourWrapper plan="agency" toursCompleted={toursCompleted}>
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-14 md:pt-0">{children}</main>
      </TourWrapper>
    </div>
  );
}
