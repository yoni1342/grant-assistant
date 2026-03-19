import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GrantsClient } from "./grants-client";

export default async function AdminGrantsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: grants }, { data: organizations }] = await Promise.all([
    supabase
      .from("grants")
      .select("id, title, funder_name, amount, stage, screening_score, org_id, deadline, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("organizations")
      .select("id, name")
      .order("name"),
  ]);

  return (
    <div className="p-6">
      <GrantsClient
        grants={grants || []}
        organizations={organizations || []}
      />
    </div>
  );
}
