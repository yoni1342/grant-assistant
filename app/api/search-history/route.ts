import { createClient, createAdminClient, getUserOrgId } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const adminDb = createAdminClient();
  const { data } = await adminDb
    .from("search_history")
    .select("id, query, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(8);

  return Response.json(data || []);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { query } = await req.json();
  if (!query?.trim()) {
    return Response.json({ error: "Missing query" }, { status: 400 });
  }

  const adminDb = createAdminClient();

  // Remove duplicate if exists
  await adminDb
    .from("search_history")
    .delete()
    .eq("org_id", orgId)
    .eq("query", query.trim());

  // Insert new entry
  await adminDb
    .from("search_history")
    .insert({ org_id: orgId, query: query.trim() });

  return Response.json({ success: true });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  const adminDb = createAdminClient();
  await adminDb
    .from("search_history")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  return Response.json({ success: true });
}
