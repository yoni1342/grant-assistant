import { Suspense } from "react";
import {
  createClient,
  getUserOrgId,
  isAdminViewMode,
} from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Resolves the correct org_id for normal users, agency users switching
  // between orgs, and platform admins viewing another org via adminViewOrgId.
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) redirect("/register");

  const adminView = await isAdminViewMode(supabase);

  // RLS on notifications now also permits platform admins to read any org's
  // notifications, so the user's own Supabase client works for everyone.
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*, grants:grants_full(title, funder_name, stage)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  // Only mark as read for real users on their own org — admins in view mode
  // should not mutate the org's state by browsing.
  if (!adminView) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("org_id", orgId)
      .eq("is_read", false);
  }

  return (
    <div data-tour="notifications-area">
      <Suspense>
        <NotificationsClient
          initialNotifications={notifications || []}
          orgId={orgId}
        />
      </Suspense>
    </div>
  );
}
