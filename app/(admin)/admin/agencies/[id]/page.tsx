import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { AgencyDetailClient } from "./agency-detail-client";
import { excludeFetchedExpired } from "@/lib/grants/filters";

export default async function AdminAgencyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const adminClient = createAdminClient();

  // Fetch agency
  const { data: agency } = await adminClient
    .from("agencies")
    .select("*")
    .eq("id", id)
    .single();

  if (!agency) notFound();

  // Fetch owner profile
  const { data: ownerProfile } = await adminClient
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("id", agency.owner_user_id)
    .single();

  // Fetch orgs under this agency
  const { data: orgs } = await adminClient
    .from("organizations")
    .select("id, name, sector, status, plan, is_tester, created_at")
    .eq("agency_id", id)
    .order("created_at", { ascending: false });

  // Grant counts per org (exclude archived and fetched-expired to match user dashboard)
  const orgIds = (orgs || []).map((o) => o.id);
  const grantCounts: Record<string, number> = {};
  if (orgIds.length > 0) {
    const { data: grants } = await adminClient
      .from("grants_full")
      .select("org_id, deadline, created_at")
      .in("org_id", orgIds)
      .neq("stage", "archived");
    if (grants) {
      const filtered = excludeFetchedExpired(grants);
      for (const g of filtered) {
        if (!g.org_id) continue;
        grantCounts[g.org_id] = (grantCounts[g.org_id] || 0) + 1;
      }
    }
  }

  return (
    <AgencyDetailClient
      agency={{
        id: agency.id,
        name: agency.name,
        owner_user_id: agency.owner_user_id,
        subscription_status: agency.subscription_status || null,
        trial_ends_at: agency.trial_ends_at || null,
        setup_complete: agency.setup_complete ?? true,
        created_at: agency.created_at,
        updated_at: agency.updated_at,
      }}
      owner={ownerProfile ? {
        id: ownerProfile.id,
        full_name: ownerProfile.full_name,
        email: ownerProfile.email,
        avatar_url: ownerProfile.avatar_url,
      } : null}
      orgs={(orgs || []).map((o) => ({
        ...o,
        grant_count: grantCounts[o.id] || 0,
      }))}
    />
  );
}
