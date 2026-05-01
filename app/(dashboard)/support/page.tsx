import { redirect } from "next/navigation";
import { createClient, getUserOrgId } from "@/lib/supabase/server";
import { SupportClient } from "./support-client";

export const metadata = {
  title: "Help & Support · Fundory",
};

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { orgId } = await getUserOrgId(supabase);

  const [{ data: profile }, recent] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("support_requests")
      .select("id, subject, category, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <SupportClient
      submitterName={profile?.full_name || (user.user_metadata?.full_name as string | undefined) || ""}
      submitterEmail={profile?.email || user.email || ""}
      hasOrg={!!orgId}
      recentRequests={recent.data || []}
    />
  );
}
