import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ProposalDetailClient } from "./components/proposal-detail-client";

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch proposal with sections and grant data
  const { data: proposalData, error } = await supabase
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
    .single();

  if (error || !proposalData) {
    notFound();
  }

  // Fetch proposal sections
  const { data: sections } = await supabase
    .from("proposal_sections")
    .select("*")
    .eq("proposal_id", id);

  // Fetch funder data if grant has a funder_name
  let funder = null;
  if (proposalData.grant?.funder_name && proposalData.grant?.org_id) {
    const { data: funderData } = await supabase
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
