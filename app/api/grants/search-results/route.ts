import { createClient, createAdminClient, getUserOrgId } from "@/lib/supabase/server";

export async function GET(req: Request) {
  // Authenticate
  const supabase = await createClient();
  const { orgId, error: authError } = await getUserOrgId(supabase);
  if (!orgId) {
    return new Response(
      JSON.stringify({ error: authError || "Not authenticated" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const { searchParams } = new URL(req.url);
  const searchId = searchParams.get("search_id");
  if (!searchId) {
    return new Response(
      JSON.stringify({ error: "search_id required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Use admin client to bypass RLS
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("search_results")
    .select("id, grant_data, is_complete, source_group")
    .eq("search_id", searchId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[grants/search-results] Failed to fetch search results:", error.message);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify(rows ?? []), {
    headers: { "Content-Type": "application/json" },
  });
}
