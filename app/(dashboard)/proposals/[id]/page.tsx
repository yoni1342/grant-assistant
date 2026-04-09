import { createClient, createAdminClient, getUserOrgId } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ProposalDetailClient } from "./components/proposal-detail-client";

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) redirect("/login");

  const adminDb = createAdminClient();

  // Fetch proposal with sections and grant data
  const { data: proposalData, error } = await adminDb
    .from("proposals")
    .select(`
      *,
      grant:grants (
        id,
        title,
        funder_name,
        deadline,
        description,
        amount,
        org_id
      )
    `)
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  if (error || !proposalData) {
    notFound();
  }

  // Fetch proposal sections and deduplicate by sort_order (keep latest)
  const { data: rawSections } = await adminDb
    .from("proposal_sections")
    .select("*")
    .eq("proposal_id", id)
    .order("created_at", { ascending: false });

  const sections = rawSections
    ? Object.values(
        rawSections.reduce((acc: Record<number, typeof rawSections[0]>, s) => {
          if (!acc[s.sort_order]) acc[s.sort_order] = s;
          return acc;
        }, {})
      ).sort((a, b) => a.sort_order - b.sort_order)
    : null;

  // Fetch funder data if grant has a funder_name
  let funder = null;
  if (proposalData.grant?.funder_name && proposalData.grant?.org_id) {
    const { data: funderData } = await adminDb
      .from("funders")
      .select("*")
      .eq("org_id", proposalData.grant.org_id)
      .eq("name", proposalData.grant.funder_name)
      .single();

    funder = funderData;
  }

  return (
    <ProposalDetailClient
      proposal={proposalData}
      sections={sections || []}
      grant={proposalData.grant}
      funder={funder}
    />
  );
}
