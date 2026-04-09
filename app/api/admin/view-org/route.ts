import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { setAdminViewOrgId, clearAdminViewOrgId } from "@/lib/admin/context";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify user is a platform admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_platform_admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { orgId } = await req.json();

  if (!orgId) {
    await clearAdminViewOrgId();
    return NextResponse.json({ ok: true });
  }

  // Validate the org exists
  const adminClient = createAdminClient();
  const { data: org } = await adminClient
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .single();

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  await setAdminViewOrgId(orgId);
  return NextResponse.json({ ok: true, orgName: org.name });
}
