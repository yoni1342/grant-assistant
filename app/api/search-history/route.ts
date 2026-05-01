import { createClient, createAdminClient, getUserOrgId } from "@/lib/supabase/server";

type Filters = {
  orgType?: string[];
  profitStatus?: string[];
  industry?: string[];
  fundingCategory?: string[];
  location?: string[];
};

function hasAnyFilter(f: Filters | null | undefined): boolean {
  if (!f) return false;
  return Object.values(f).some((v) => Array.isArray(v) && v.length > 0);
}

export async function GET() {
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const adminDb = createAdminClient();

  // Try with filters column; fall back without if migration hasn't run yet.
  const initial = await adminDb
    .from("search_history")
    .select("id, query, search_id, filters, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(8);
  let data = initial.data;
  const dbError = initial.error;

  if (dbError && dbError.message?.includes("filters")) {
    const fallback = await adminDb
      .from("search_history")
      .select("id, query, search_id, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(8);
    data = fallback.data as typeof data;
  } else if (dbError && dbError.message?.includes("search_id")) {
    const fallback = await adminDb
      .from("search_history")
      .select("id, query, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(8);
    data = fallback.data as typeof data;
  }

  return Response.json(data || []);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { query, search_id, filters } = await req.json();
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

  // Insert with filters/search_id when present, fall back if columns missing.
  const row: Record<string, unknown> = { org_id: orgId, query: query.trim() };
  if (search_id) row.search_id = search_id;
  if (hasAnyFilter(filters)) row.filters = filters;

  const { error: insertError } = await adminDb
    .from("search_history")
    .insert(row);

  if (insertError && insertError.message?.includes("filters")) {
    delete row.filters;
    const retry = await adminDb.from("search_history").insert(row);
    if (retry.error && retry.error.message?.includes("search_id")) {
      await adminDb.from("search_history").insert({ org_id: orgId, query: query.trim() });
    }
  } else if (insertError && insertError.message?.includes("search_id")) {
    await adminDb.from("search_history").insert({ org_id: orgId, query: query.trim() });
  }

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
