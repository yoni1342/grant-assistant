import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, preferences")
    .eq("id", user.id)
    .single();

  return (
    <div className="p-6">
      <SettingsClient
        profile={{
          full_name: profile?.full_name || "",
          email: profile?.email || user.email || "",
        }}
        preferences={
          (profile?.preferences as {
            theme?: string;
            timezone?: string;
            date_format?: string;
          }) || {}
        }
      />
    </div>
  );
}
