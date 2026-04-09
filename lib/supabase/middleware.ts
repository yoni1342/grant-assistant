import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getRedirectUrl(request: NextRequest, pathname: string) {
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  return new URL(pathname, `${protocol}://${host}`);
}

/**
 * Cached profile shape stored in a cookie to avoid hitting Supabase on every request.
 * Refreshed every 5 minutes.
 */
interface CachedProfile {
  is_platform_admin: boolean;
  org_id: string | null;
  agency_id: string | null;
  org_status: string | null;
  agency_setup_complete: boolean | null;
  ts: number; // timestamp when cached
}

const PROFILE_CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

function getCachedProfile(request: NextRequest): CachedProfile | null {
  const raw = request.cookies.get("x-profile-cache")?.value;
  if (!raw) return null;
  try {
    const parsed: CachedProfile = JSON.parse(raw);
    if (Date.now() - parsed.ts > PROFILE_CACHE_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setCachedProfile(response: NextResponse, profile: CachedProfile) {
  response.cookies.set("x-profile-cache", JSON.stringify(profile), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min hard expiry on cookie itself
  });
}

function clearCachedProfile(response: NextResponse) {
  response.cookies.delete("x-profile-cache");
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // Refresh the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- Not authenticated ---
  if (!user) {
    if (
      pathname === "/" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/auth")
    ) {
      clearCachedProfile(supabaseResponse);
      return supabaseResponse;
    }
    clearCachedProfile(supabaseResponse);
    return NextResponse.redirect(getRedirectUrl(request, "/login"));
  }

  // --- Try cached profile first, fetch from DB only if stale/missing ---
  // Always re-fetch on status pages so admin changes take effect immediately
  const skipCache = pathname.startsWith("/pending-approval") || pathname.startsWith("/rejected") || pathname.startsWith("/suspended") || pathname === "/dashboard";
  let cached = skipCache ? null : getCachedProfile(request);

  if (!cached) {
    const { data: rawProfile, error: profileError } = await supabase
      .from("profiles")
      .select("is_platform_admin, org_id, agency_id, organizations(status), agencies(setup_complete)")
      .eq("id", user.id)
      .single();

    // Fallback: if agency_id column doesn't exist yet, retry without it
    let profile = rawProfile;
    if (profileError && (profileError.message?.includes("agency_id") || profileError.message?.includes("agencies"))) {
      const fallback = await supabase
        .from("profiles")
        .select("is_platform_admin, org_id, organizations(status)")
        .eq("id", user.id)
        .single();
      profile = fallback.data ? { ...fallback.data, agency_id: null, agencies: null } as unknown as typeof profile : null;
    }

    const orgs = profile?.organizations as unknown as { status: string } | { status: string }[] | null;
    const orgStatus = Array.isArray(orgs) ? orgs[0]?.status : orgs?.status;

    const agencies = profile?.agencies as unknown as { setup_complete: boolean } | { setup_complete: boolean }[] | null;
    const agencySetupComplete = Array.isArray(agencies) ? agencies[0]?.setup_complete : agencies?.setup_complete;

    cached = {
      is_platform_admin: profile?.is_platform_admin === true,
      org_id: profile?.org_id ?? null,
      agency_id: profile?.agency_id ?? null,
      org_status: orgStatus ?? null,
      agency_setup_complete: agencySetupComplete ?? null,
      ts: Date.now(),
    };

    setCachedProfile(supabaseResponse, cached);
  }

  const isAdmin = cached.is_platform_admin;
  const orgStatus = cached.org_status;
  const hasOrg = !!cached.org_id;
  const hasAgency = !!cached.agency_id;

  // --- Authenticated: redirect away from login/signup/landing ---
  if (pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname === "/") {
    if (hasAgency) {
      return NextResponse.redirect(getRedirectUrl(request, "/agency"));
    }
    return NextResponse.redirect(getRedirectUrl(request, "/dashboard"));
  }

  // --- Platform admin ---
  if (isAdmin) {
    // Allow admin to view dashboard routes when viewing as an organization
    const adminViewOrgId = request.cookies.get("admin-view-org-id")?.value;
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/auth") ||
      (adminViewOrgId && (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/discovery") ||
        pathname.startsWith("/pipeline") ||
        pathname.startsWith("/documents") ||
        pathname.startsWith("/narratives") ||
        pathname.startsWith("/proposals") ||
        pathname.startsWith("/notifications") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/billing") ||
        pathname.startsWith("/submissions") ||
        pathname.startsWith("/awards")
      ))
    ) {
      return supabaseResponse;
    }
    return NextResponse.redirect(getRedirectUrl(request, "/admin"));
  }

  // --- Agency user: route to /agency by default ---
  if (hasAgency) {
    // Force agency setup if not completed yet
    if (cached.agency_setup_complete === false) {
      if (pathname.startsWith("/agency/setup") || pathname.startsWith("/auth")) {
        return supabaseResponse;
      }
      return NextResponse.redirect(getRedirectUrl(request, "/agency/setup"));
    }

    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(getRedirectUrl(request, "/agency"));
    }
    if (
      pathname.startsWith("/pending-approval") ||
      pathname.startsWith("/rejected") ||
      pathname.startsWith("/register")
    ) {
      return NextResponse.redirect(getRedirectUrl(request, "/agency"));
    }
    // Allow /agency and /dashboard routes (org context via cookie)
    return supabaseResponse;
  }

  // --- Has org, status = pending ---
  if (hasOrg && orgStatus === "pending") {
    if (
      pathname.startsWith("/pending-approval") ||
      pathname.startsWith("/auth")
    ) {
      return supabaseResponse;
    }
    return NextResponse.redirect(getRedirectUrl(request, "/pending-approval"));
  }

  // --- Has org, status = rejected ---
  if (hasOrg && orgStatus === "rejected") {
    if (
      pathname.startsWith("/rejected") ||
      pathname.startsWith("/auth")
    ) {
      return supabaseResponse;
    }
    return NextResponse.redirect(getRedirectUrl(request, "/rejected"));
  }

  // --- Has org, status = suspended ---
  if (hasOrg && orgStatus === "suspended") {
    if (
      pathname.startsWith("/suspended") ||
      pathname.startsWith("/auth")
    ) {
      return supabaseResponse;
    }
    return NextResponse.redirect(getRedirectUrl(request, "/suspended"));
  }

  // --- Has org, status = approved ---
  if (hasOrg && orgStatus === "approved") {
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(getRedirectUrl(request, "/dashboard"));
    }
    if (
      pathname.startsWith("/pending-approval") ||
      pathname.startsWith("/rejected") ||
      pathname.startsWith("/register")
    ) {
      return NextResponse.redirect(getRedirectUrl(request, "/dashboard"));
    }
    return supabaseResponse;
  }

  // --- No org, not admin → send to register ---
  if (!hasOrg && !isAdmin) {
    if (
      pathname.startsWith("/register") ||
      pathname.startsWith("/auth")
    ) {
      return supabaseResponse;
    }
    return NextResponse.redirect(getRedirectUrl(request, "/register"));
  }

  return supabaseResponse;
}
