import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrganizationsClient } from "./organizations-client";

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Use admin client to bypass RLS — admin needs to see all orgs' data
  const adminClient = createAdminClient();

  // Fetch all organizations with their owner profile
  const { data: organizations } = await adminClient
    .from("organizations")
    .select("*, profiles!profiles_org_id_fkey(id, full_name, email, role)")
    .order("created_at", { ascending: false });

  // Fetch all documents for all orgs (budgets and narratives are derived from documents)
  const orgIds = (organizations || []).map((o) => o.id);

  const { data: allDocuments } = await adminClient
    .from("documents")
    .select("id, org_id, title, name, category, ai_category, file_type, file_size, extraction_status, extracted_text, metadata, created_at")
    .in("org_id", orgIds.length > 0 ? orgIds : ["_none_"])
    .order("created_at", { ascending: false });

  // Group by org_id
  const documentsByOrg: Record<string, typeof allDocuments> = {};
  const budgetsByOrg: Record<string, Record<string, unknown>[]> = {};
  const narrativesByOrg: Record<string, Record<string, unknown>[]> = {};

  for (const doc of allDocuments || []) {
    if (!documentsByOrg[doc.org_id]) documentsByOrg[doc.org_id] = [];
    documentsByOrg[doc.org_id]!.push(doc);

    if (doc.category === "budget") {
      if (!budgetsByOrg[doc.org_id]) budgetsByOrg[doc.org_id] = [];
      budgetsByOrg[doc.org_id].push({
        id: doc.id,
        org_id: doc.org_id,
        name: doc.title || doc.name || "Untitled Budget",
        narrative: doc.extracted_text,
        total_amount: (doc.metadata as Record<string, unknown>)?.total_amount ?? null,
        is_template: (doc.metadata as Record<string, unknown>)?.is_template ?? false,
        created_at: doc.created_at,
      });
    } else if (doc.category === "narrative") {
      if (!narrativesByOrg[doc.org_id]) narrativesByOrg[doc.org_id] = [];
      narrativesByOrg[doc.org_id].push({
        id: doc.id,
        org_id: doc.org_id,
        title: doc.title || doc.name || "Untitled",
        content: doc.extracted_text || "",
        category: doc.ai_category || null,
        created_at: doc.created_at,
      });
    }
  }

  // Find owner for each org and include full org data
  const orgsWithOwner = (organizations || []).map((org) => {
    const profiles = org.profiles as Array<{
      id: string;
      full_name: string | null;
      email: string | null;
      role: string | null;
    }> | null;
    const owner =
      profiles?.find((p) => p.role === "owner") || profiles?.[0] || null;
    return {
      id: org.id,
      name: org.name,
      sector: org.sector,
      status: org.status,
      rejection_reason: org.rejection_reason,
      created_at: org.created_at,
      owner_email: owner?.email || null,
      owner_name: owner?.full_name || null,
      // Full org details
      mission: org.mission,
      ein: org.ein,
      address: org.address,
      phone: org.phone,
      email: org.email,
      website: org.website,
      founding_year: org.founding_year,
      description: org.description,
      executive_summary: org.executive_summary,
      annual_budget: org.annual_budget,
      staff_count: org.staff_count,
      geographic_focus: org.geographic_focus,
      // Billing data
      plan: org.plan || null,
      is_tester: org.is_tester || false,
      subscription_status: org.subscription_status || null,
      trial_ends_at: org.trial_ends_at || null,
      // Related data
      documents: documentsByOrg[org.id] || [],
      budgets: budgetsByOrg[org.id] || [],
      narratives: narrativesByOrg[org.id] || [],
    };
  });

  return (
    <div className="p-6">
      <OrganizationsClient organizations={orgsWithOwner} />
    </div>
  );
}
