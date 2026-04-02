import { createClient, createAdminClient, getUserOrgId } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ArchiveClient } from "./archive-client";

export default async function ArchivePage() {
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) redirect("/login");

  const adminDb = createAdminClient();

  const { data: grants } = await adminDb
    .from("grants")
    .select("id, title, funder_name, stage, amount, deadline, created_at")
    .eq("org_id", orgId)
    .eq("stage", "archived")
    .order("updated_at", { ascending: false });

  return <ArchiveClient initialGrants={grants || []} />;
}
