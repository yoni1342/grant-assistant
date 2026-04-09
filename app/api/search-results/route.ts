import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = await req.json();
  const { search_id, org_id, grants, source_group, done, status, stage_message } = body;

  if (!search_id || !org_id) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing search_id or org_id" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createAdminClient();

  if (done) {
    const { error } = await supabase.from("search_results").insert({
      search_id,
      org_id,
      source_group: "__done__",
      grant_data: [],
      is_complete: true,
    });

    if (error) {
      console.error("[search-results] Failed to insert done row:", error.message);
      return new Response(
        JSON.stringify({ success: false, error: "Something went wrong. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  } else if (status && stage_message) {
    // Status update from workflow — store as a status row
    const { error } = await supabase.from("search_results").insert({
      search_id,
      org_id,
      source_group: `__status__:${status}`,
      grant_data: { status, stage_message },
    });

    if (error) {
      console.error("[search-results] Failed to insert status row:", error.message);
      return new Response(
        JSON.stringify({ success: false, error: "Something went wrong. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  } else if (grants && grants.length > 0) {
    const { error } = await supabase.from("search_results").insert({
      search_id,
      org_id,
      source_group: source_group || "unknown",
      grant_data: grants,
    });

    if (error) {
      console.error("[search-results] Failed to insert grants row:", error.message);
      return new Response(
        JSON.stringify({ success: false, error: "Something went wrong. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // Clean up search results older than 1 hour, but preserve results linked to search history
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: historyRows } = await supabase
    .from("search_history")
    .select("search_id")
    .not("search_id", "is", null);
  const preservedIds = new Set((historyRows || []).map((r: { search_id: string }) => r.search_id));

  if (preservedIds.size === 0) {
    await supabase.from("search_results").delete().lt("created_at", oneHourAgo);
  } else {
    // Delete old results that are NOT linked to a search history entry
    const { data: oldRows } = await supabase
      .from("search_results")
      .select("id, search_id")
      .lt("created_at", oneHourAgo);
    const toDelete = (oldRows || [])
      .filter((r: { id: string; search_id: string }) => !preservedIds.has(r.search_id))
      .map((r: { id: string }) => r.id);
    if (toDelete.length > 0) {
      await supabase.from("search_results").delete().in("id", toDelete);
    }
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { "Content-Type": "application/json" } },
  );
}
