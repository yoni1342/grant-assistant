import { cookies } from "next/headers";

const ADMIN_VIEW_ORG_COOKIE = "admin-view-org-id";

export async function getAdminViewOrgId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_VIEW_ORG_COOKIE)?.value ?? null;
}

export async function setAdminViewOrgId(orgId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_VIEW_ORG_COOKIE, orgId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 1 day — short-lived for security
  });
}

export async function clearAdminViewOrgId() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_VIEW_ORG_COOKIE);
}
