import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_platform_admin, created_at, org_id, organizations(name)")
    .order("created_at", { ascending: false });

  // Fetch auth users to get ban status
  const adminClient = createAdminClient();
  const { data: authData } = await adminClient.auth.admin.listUsers();
  const authUsersMap = new Map(
    (authData?.users || []).map((u) => [u.id, u])
  );

  const users = (profiles || []).map((p) => {
    const authUser = authUsersMap.get(p.id);
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      role: p.role,
      is_platform_admin: p.is_platform_admin,
      created_at: p.created_at,
      org_name: (p.organizations as unknown as { name: string } | null)?.name || null,
      banned_until: authUser?.banned_until ?? null,
    };
  });

  return (
    <div className="p-6">
      <UsersClient users={users} currentUserId={user.id} />
    </div>
  );
}
