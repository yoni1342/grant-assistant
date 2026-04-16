import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AgenciesClient } from "./agencies-client";

export default async function AdminAgenciesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const adminClient = createAdminClient();

  // Fetch all agencies with owner profiles
  const { data: agencies } = await adminClient
    .from("agencies")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch owner profiles
  const ownerIds = [...new Set((agencies || []).map((a) => a.owner_user_id))];
  const ownerMap: Record<string, { full_name: string | null; email: string | null }> = {};
  if (ownerIds.length > 0) {
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ownerIds);
    for (const p of profiles || []) {
      ownerMap[p.id] = { full_name: p.full_name, email: p.email };
    }
  }

  // Count orgs per agency
  const agencyIds = (agencies || []).map((a) => a.id);
  const orgCounts: Record<string, number> = {};
  if (agencyIds.length > 0) {
    const { data: orgs } = await adminClient
      .from("organizations")
      .select("agency_id")
      .in("agency_id", agencyIds);
    for (const o of orgs || []) {
      if (o.agency_id) {
        orgCounts[o.agency_id] = (orgCounts[o.agency_id] || 0) + 1;
      }
    }
  }

  const agenciesWithDetails = (agencies || []).map((agency) => {
    const owner = ownerMap[agency.owner_user_id] || null;
    return {
      id: agency.id,
      name: agency.name,
      owner_name: owner?.full_name || null,
      owner_email: owner?.email || null,
      subscription_status: agency.subscription_status || null,
      trial_ends_at: agency.trial_ends_at || null,
      setup_complete: agency.setup_complete ?? true,
      org_count: orgCounts[agency.id] || 0,
      created_at: agency.created_at,
    };
  });

  return (
    <div className="p-6">
      <AgenciesClient agencies={agenciesWithDetails} />
    </div>
  );
}
