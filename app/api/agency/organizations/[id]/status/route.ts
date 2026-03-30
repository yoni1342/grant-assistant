import { NextResponse } from "next/server";
import { createClient, getUserAgencyId, createAdminClient } from "@/lib/supabase/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: orgId } = await params;
  const supabase = await createClient();
  const { agencyId } = await getUserAgencyId(supabase);
  if (!agencyId) {
    return NextResponse.json({ error: "Not an agency user" }, { status: 403 });
  }

  const { status } = await req.json();
  const allowedStatuses = ["active", "suspended"];
  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: `Status must be one of: ${allowedStatuses.join(", ")}` }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Verify org belongs to this agency
  const { data: org } = await adminClient
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .eq("agency_id", agencyId)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const { error } = await adminClient
    .from("organizations")
    .update({ status })
    .eq("id", orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status });
}
