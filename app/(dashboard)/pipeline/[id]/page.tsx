import { createClient, createAdminClient, getUserOrgId } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { GrantDetail } from "./grant-detail";

const BACK_MAP: Record<string, { href: string; label: string }> = {
  deadlines: { href: "/dashboard/deadlines", label: "Deadlines" },
  "no-deadline": { href: "/dashboard/no-deadline", label: "Ongoing Grants" },
  "past-deadlines": { href: "/dashboard/past-deadlines", label: "Past Deadlines" },
};

export default async function GrantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const back = from ? BACK_MAP[from] : undefined;
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) redirect("/login");

  const adminDb = createAdminClient();

  const { data: grant } = await adminDb
    .from("grants")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  if (!grant) {
    notFound();
  }

  // Fetch proposals and org name for this grant
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
      {...(back && { backHref: back.href, backLabel: back.label })}
    />
  );
}
