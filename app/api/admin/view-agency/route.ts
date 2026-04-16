import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const ADMIN_VIEW_AGENCY_COOKIE = "admin-view-agency-id";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_platform_admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { agencyId } = await req.json();
  const cookieStore = await cookies();

  if (!agencyId) {
    cookieStore.delete(ADMIN_VIEW_AGENCY_COOKIE);
    return NextResponse.json({ ok: true });
  }

  // Validate the agency exists
  const adminClient = createAdminClient();
  const { data: agency } = await adminClient
    .from("agencies")
    .select("id, name")
    .eq("id", agencyId)
    .single();

  if (!agency) {
    return NextResponse.json({ error: "Agency not found" }, { status: 404 });
  }

  cookieStore.set(ADMIN_VIEW_AGENCY_COOKIE, agencyId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
  });

  return NextResponse.json({ ok: true, agencyName: agency.name });
}
