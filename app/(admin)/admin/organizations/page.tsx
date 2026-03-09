import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrganizationsClient } from "./organizations-client";

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all organizations with their owner profile
  const { data: organizations } = await supabase
    .from("organizations")
    .select("*, profiles!profiles_org_id_fkey(id, full_name, email, role)")
    .order("created_at", { ascending: false });

  // Find owner for each org
  const orgsWithOwner = (organizations || []).map((org) => {
    const profiles = org.profiles as Array<{ id: string; full_name: string | null; email: string | null; role: string | null }> | null;
    const owner = profiles?.find((p) => p.role === "owner") || profiles?.[0] || null;
    return {
      id: org.id,
      name: org.name,
      sector: org.sector,
      status: org.status,
      rejection_reason: org.rejection_reason,
      created_at: org.created_at,
      owner_email: owner?.email || null,
      owner_name: owner?.full_name || null,
    };
  });

  return (
    <div className="p-6">
      <OrganizationsClient organizations={orgsWithOwner} />
    </div>
  );
}
