import { NextResponse } from "next/server";
import { createClient, getUserAgencyId, createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { agencyId } = await getUserAgencyId(supabase);
  if (!agencyId) {
    return NextResponse.json({ error: "Not an agency user" }, { status: 403 });
  }

  // Use admin client to bypass RLS — agency owner needs to see all client orgs
  const adminClient = createAdminClient();
  const { data: orgs, error } = await adminClient
    .from("organizations")
    .select("id, name, sector, status, mission, created_at")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[agency/organizations] Failed to fetch orgs:", error.message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ orgs });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { agencyId } = await getUserAgencyId(supabase);
  if (!agencyId) {
    return NextResponse.json({ error: "Not an agency user" }, { status: 403 });
  }

  const body = await req.json();
  const { name, ein, mission, sector, address, phone, website, founding_year, geographic_focus, description, questionnaire } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Check if agency is a tester (subscription_status indicates trial/test access)
  const { data: agency } = await adminClient
    .from("agencies")
    .select("subscription_status")
    .eq("id", agencyId)
    .single();
  const isTester = agency?.subscription_status === "trialing" || agency?.subscription_status === "active";

  // Create org under the agency with agency plan and approved status
  const { data: org, error } = await adminClient
    .from("organizations")
    .insert({
      name: name.trim(),
      ein: ein || null,
      mission: mission || null,
      sector: sector || null,
      address: address || null,
      phone: phone || null,
      website: website || null,
      founding_year: founding_year || null,
      geographic_focus: geographic_focus || [],
      description: description || null,
      agency_id: agencyId,
      plan: "agency",
      is_tester: isTester,
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[agency/organizations] Failed to create org:", error.message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  // Process questionnaire data if provided
  if (questionnaire && org) {
    const q = questionnaire;

    await adminClient.from('organizations').update({
      annual_budget: q.annualBudget || null,
      staff_count: q.staffCount || null,
      description: q.orgDescription || description || null,
      executive_summary: q.executiveSummary || null,
    }).eq('id', org.id);

    if (q.annualBudget || q.budgetNarrative) {
      await adminClient.from('documents').insert({
        org_id: org.id,
        title: 'Organization Budget',
        name: 'Organization Budget',
        category: 'budget',
        extracted_text: q.budgetNarrative || null,
        extraction_status: 'completed',
        metadata: {
          total_amount: q.annualBudget,
          is_template: true,
          source: 'questionnaire',
        },
      });
    }

    const narrativeEntries = [
      { title: 'Mission', content: q.missionNarrative || '', ai_category: 'mission' },
      { title: 'Impact', content: q.impactNarrative || '', ai_category: 'impact' },
      { title: 'Methods & Approach', content: q.methodsNarrative || '', ai_category: 'methods' },
      { title: 'Budget Narrative', content: q.budgetNarrative || '', ai_category: 'budget_narrative' },
    ].filter(n => n.content.trim());

    if (narrativeEntries.length > 0) {
      await adminClient.from('documents').insert(
        narrativeEntries.map(n => ({
          org_id: org.id,
          title: n.title,
          name: n.title,
          category: 'narrative',
          ai_category: n.ai_category,
          extracted_text: n.content,
          extraction_status: 'completed',
          metadata: { source: 'questionnaire' },
        }))
      );
    }
  }

  return NextResponse.json({ org });
}
