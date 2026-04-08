import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) redirect("/register");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*, grants(title, funder_name, stage)")
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Mark all as read on page load
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("org_id", profile.org_id)
    .eq("is_read", false);

  return (
    <div data-tour="notifications-area">
      <Suspense>
        <NotificationsClient
          initialNotifications={notifications || []}
          orgId={profile.org_id}
        />
      </Suspense>
    </div>
  );
}
