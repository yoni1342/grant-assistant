import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getActiveOrgId } from "@/lib/agency/context";
import { getAdminViewOrgId } from "@/lib/admin/context";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Create a Supabase admin client using the service role key.
 * Use this for admin operations like creating/deleting users.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Get the authenticated user's org_id from their profile.
 * For agency users, checks the active-org-id cookie and validates ownership.
 * Returns { orgId, error } — use orgId to scope all queries.
 */
/**
 * Check if the current user is an admin viewing an org (read-only mode).
 */
export async function isAdminViewMode(supabase: SupabaseClient): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_platform_admin) return false;
  const adminViewOrgId = await getAdminViewOrgId();
  return !!adminViewOrgId;
}

export async function getUserOrgId(supabase: SupabaseClient): Promise<{ orgId: string | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { orgId: null, error: "Not authenticated" };
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("org_id, agency_id, is_platform_admin")
    .eq("id", user.id)
    .single();

  // Fallback if agency_id column doesn't exist yet
  if (!profile) {
    const fallback = await supabase
      .from("profiles")
      .select("org_id, is_platform_admin")
      .eq("id", user.id)
      .single();
    profile = fallback.data ? { ...fallback.data, agency_id: null } as unknown as typeof profile : null;
  }

  // Admin viewing as organization: return the viewed org ID
  if (profile?.is_platform_admin) {
    const adminViewOrgId = await getAdminViewOrgId();
    if (adminViewOrgId) {
      return { orgId: adminViewOrgId, error: null };
    }
    return { orgId: null, error: "No organization context for admin" };
  }

  // Agency user: check for active org cookie
  if (profile?.agency_id) {
    const activeOrgId = await getActiveOrgId();
    if (activeOrgId) {
      // Validate the org belongs to this agency
      const adminClient = createAdminClient();
      const { data: org } = await adminClient
        .from("organizations")
        .select("id")
        .eq("id", activeOrgId)
        .eq("agency_id", profile.agency_id)
        .single();
      if (org) {
        return { orgId: org.id, error: null };
      }
    }
    // No active org selected — return the profile's own org_id if any
    if (profile.org_id) {
      return { orgId: profile.org_id, error: null };
    }
    return { orgId: null, error: "No active organization selected" };
  }

  if (!profile?.org_id) {
    return { orgId: null, error: "No organization found for user" };
  }

  return { orgId: profile.org_id, error: null };
}

/**
 * Get the authenticated user's agency_id from their profile.
 */
export async function getUserAgencyId(supabase: SupabaseClient): Promise<{ agencyId: string | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { agencyId: null, error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id) {
    // Fallback if agency_id column doesn't exist yet
    return { agencyId: null, error: "No agency found for user" };
  }

  return { agencyId: profile.agency_id, error: null };
}
