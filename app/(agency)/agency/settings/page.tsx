import { createClient, getUserAgencyId } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AgencySettingsClient } from "./settings-client";

export default async function AgencySettingsPage() {
  const supabase = await createClient();
  const { agencyId } = await getUserAgencyId(supabase);
  if (!agencyId) redirect("/login");

  const { data: agency } = await supabase
    .from("agencies")
    .select("id, name, created_at, subscription_status, trial_ends_at")
    .eq("id", agencyId)
    .single();

  if (!agency) redirect("/agency");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch profile for the owner
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, preferences")
    .eq("id", user.id)
    .single();

  // Count orgs
  const { count: orgCount } = await supabase
    .from("organizations")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .neq("plan", "agency");

  return (
    <AgencySettingsClient
      user={user}
      agency={agency}
      profile={profile!}
      orgCount={orgCount || 0}
    />
  );
}
