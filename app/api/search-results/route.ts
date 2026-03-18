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
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
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
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
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
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // Clean up search results older than 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await supabase.from("search_results").delete().lt("created_at", oneHourAgo);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { "Content-Type": "application/json" } },
  );
}
