import { NextResponse } from "next/server";
import { createClient, getUserAgencyId } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { agencyId } = await getUserAgencyId(supabase);
  if (!agencyId) {
    return NextResponse.json({ error: "Not an agency user" }, { status: 403 });
  }

  // Fetch all orgs
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, sector, status")
    .eq("agency_id", agencyId);

  const orgIds = (orgs || []).map((o) => o.id);

  if (orgIds.length === 0) {
    return NextResponse.json({
      orgs: [],
      grants: [],
      totalGrants: 0,
      totalOrgs: 0,
    });
  }

  // Fetch all grants
  const { data: grants } = await supabase
    .from("grants")
    .select("id, org_id, title, stage, amount, deadline, funder_name")
    .in("org_id", orgIds);

  return NextResponse.json({
    orgs: orgs || [],
    grants: grants || [],
    totalGrants: grants?.length || 0,
    totalOrgs: orgs?.length || 0,
  });
}
