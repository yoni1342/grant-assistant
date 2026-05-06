import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AdminProposalDetailClient } from "./admin-proposal-detail-client";

export default async function AdminProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; proposalId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id: orgId, proposalId } = await params;
  const sp = await searchParams;
  const from = sp.from === "proposal-quality" ? "proposal-quality" : null;
  const adminDb = createAdminClient();

  const { data: proposal, error } = await adminDb
    .from("proposals")
    .select(
      `
      *,
      grant:grants_full (
        id,
        title,
        funder_name,
        deadline,
        description,
        amount,
        org_id
      )
    `,
    )
    .eq("id", proposalId)
    .eq("org_id", orgId)
    .single();

  if (error || !proposal) notFound();

  const { data: rawSections } = await adminDb
    .from("proposal_sections")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: false });

  const sections = rawSections
    ? Object.values(
        rawSections.reduce((acc: Record<number, (typeof rawSections)[0]>, s) => {
          if (!acc[s.sort_order]) acc[s.sort_order] = s;
          return acc;
        }, {}),
      ).sort((a, b) => a.sort_order - b.sort_order)
    : [];

  const { data: org } = await adminDb
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .single();

  return (
    <AdminProposalDetailClient
      proposal={proposal}
      sections={sections}
      grant={proposal.grant}
      orgId={orgId}
      orgName={org?.name || "Organization"}
      from={from}
    />
  );
}
