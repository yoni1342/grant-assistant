import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { OrgDetailClient } from "./org-detail-client";

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Use admin client to bypass RLS — admin needs to see any org's data
  const adminClient = createAdminClient();

  // Fetch all org data in parallel
  const [
    { data: organization },
    { data: profiles },
    { data: grants },
    { data: proposals },
    { data: workflowExecutions },
    { data: activityLog },
    { data: documents },
  ] = await Promise.all([
    adminClient.from("organizations").select("*").eq("id", id).single(),
    adminClient
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .eq("org_id", id)
      .order("created_at", { ascending: true }),
    adminClient
      .from("grants")
      .select("id, title, funder_name, stage, amount, created_at")
      .eq("org_id", id)
      .order("created_at", { ascending: false }),
    adminClient
      .from("proposals")
      .select("id, title, status, quality_score, created_at")
      .eq("org_id", id)
      .order("created_at", { ascending: false }),
    adminClient
      .from("workflow_executions")
      .select("id, workflow_name, status, created_at, completed_at")
      .eq("org_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    adminClient
      .from("activity_log")
      .select("id, action, created_at")
      .eq("org_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    adminClient
      .from("documents")
      .select("id, title, name, category, ai_category, file_type, file_size, file_path, extraction_status, extracted_text, metadata, created_at")
      .eq("org_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!organization) notFound();

  // Derive budgets and narratives from documents
  const allDocs = documents || [];
  const budgets = allDocs
    .filter((d) => d.category === "budget")
    .map((d) => ({
      id: d.id,
      name: d.title || d.name || "Untitled Budget",
      narrative: d.extracted_text,
      total_amount: (d.metadata as Record<string, unknown>)?.total_amount ?? null,
      is_template: (d.metadata as Record<string, unknown>)?.is_template ?? false,
      created_at: d.created_at,
    }));
  const narratives = allDocs
    .filter((d) => d.category === "narrative")
    .map((d) => ({
      id: d.id,
      title: d.title || d.name || "Untitled",
      content: d.extracted_text || "",
      category: d.ai_category || null,
      created_at: d.created_at,
    }));

  return (
    <div className="p-6">
      <OrgDetailClient
        organization={organization}
        profiles={profiles || []}
        grants={grants || []}
        proposals={proposals || []}
        workflowExecutions={workflowExecutions || []}
        activityLog={activityLog || []}
        documents={allDocs}
        budgets={budgets}
        narratives={narratives}
      />
    </div>
  );
}
