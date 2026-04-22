import { createClient, createAdminClient, getUserOrgId } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { GrantDetail } from "@/app/(dashboard)/pipeline/[id]/grant-detail";

export default async function ArchivedGrantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) redirect("/login");

  const adminDb = createAdminClient();

  const { data: grant } = await adminDb
    .from("grants_full")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  if (!grant) notFound();

  const [{ data: proposals }, { data: org }] = await Promise.all([
    adminDb
      .from("proposals")
      .select("id, title, status, quality_score")
      .eq("grant_id", id)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    adminDb
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single(),
  ]);

  return (
    <GrantDetail
      grant={grant}
      proposals={proposals || []}
      orgName={org?.name || "your organization"}
      backHref="/dashboard/archive"
      backLabel="Archive"
    />
  );
}
