import { NextResponse } from "next/server";
import { createClient, getUserAgencyId, createAdminClient } from "@/lib/supabase/server";
import { setActiveOrgId, clearActiveOrgId } from "@/lib/agency/context";

function getOrigin(req: Request): string {
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "http";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { agencyId } = await getUserAgencyId(supabase);
  if (!agencyId) {
    return NextResponse.json({ error: "Not an agency user" }, { status: 403 });
  }

  const { orgId } = await req.json();

  if (!orgId) {
    await clearActiveOrgId();
    return NextResponse.json({ ok: true });
  }

  // Validate the org belongs to this agency
  const adminClient = createAdminClient();
  const { data: org } = await adminClient
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .eq("agency_id", agencyId)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Organization not found in your agency" }, { status: 404 });
  }

  await setActiveOrgId(orgId);
  return NextResponse.json({ ok: true });
}

// GET handler for redirect-based org switching (from dashboard cards)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  const shouldRedirect = url.searchParams.get("redirect") === "true";

  const origin = getOrigin(req);

  const supabase = await createClient();
  const { agencyId } = await getUserAgencyId(supabase);
  if (!agencyId) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  if (!orgId) {
    await clearActiveOrgId();
    if (shouldRedirect) {
      return NextResponse.redirect(new URL("/agency", origin));
    }
    return NextResponse.json({ ok: true });
  }

  // Validate the org belongs to this agency
  const adminClient = createAdminClient();
  const { data: org } = await adminClient
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .eq("agency_id", agencyId)
    .single();

  if (!org) {
    if (shouldRedirect) {
      return NextResponse.redirect(new URL("/agency", origin));
    }
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  await setActiveOrgId(orgId);
  if (shouldRedirect) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }
  return NextResponse.json({ ok: true });
}
