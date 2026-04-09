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
  const { org_id, status, stage_message, error_message } = body;

  if (!org_id || !status) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing org_id or status" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("grant_fetch_status")
    .upsert(
      {
        org_id,
        status,
        stage_message: stage_message || status,
        error_message: error_message || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" },
    );

  if (error) {
    console.error("[grant-fetch-status] Failed to upsert status:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: "Something went wrong. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Clean up completed statuses older than 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  await supabase
    .from("grant_fetch_status")
    .delete()
    .eq("status", "complete")
    .lt("updated_at", fiveMinAgo);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { "Content-Type": "application/json" } },
  );
}
