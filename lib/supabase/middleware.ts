import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getRedirectUrl(request: NextRequest, pathname: string) {
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  return new URL(pathname, `${protocol}://${host}`);
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
      pathname.startsWith("/auth")
    ) {
      return supabaseResponse;
    }
    return NextResponse.redirect(getRedirectUrl(request, "/login"));
  }

  // --- Authenticated: redirect away from login/signup/landing ---
  if (pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname === "/") {
    return NextResponse.redirect(getRedirectUrl(request, "/dashboard"));
  }

  // Fetch profile + org status in one query
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin, org_id, organizations(status)")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.is_platform_admin === true;
  const orgs = profile?.organizations as unknown as { status: string } | { status: string }[] | null;
  const orgStatus = Array.isArray(orgs) ? orgs[0]?.status : orgs?.status;
  const hasOrg = !!profile?.org_id;

  // --- Platform admin ---
  if (isAdmin) {
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/auth")
    ) {
      return supabaseResponse;
    }
    return NextResponse.redirect(getRedirectUrl(request, "/admin"));
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

  // --- Has org, status = approved ---
  if (hasOrg && orgStatus === "approved") {
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(getRedirectUrl(request, "/"));
    }
    if (
      pathname.startsWith("/pending-approval") ||
      pathname.startsWith("/rejected") ||
      pathname.startsWith("/register")
    ) {
      return NextResponse.redirect(getRedirectUrl(request, "/"));
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
