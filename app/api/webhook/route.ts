import fetch from "node-fetch";
import https from "https";
import { createClient, createAdminClient, getUserOrgId } from "@/lib/supabase/server";

// Map service names to n8n webhook paths
const SERVICE_MAP: Record<string, string> = {
  "grant-discovery": "search-grant-with-query",
  "grant-screening": "save-grant-to-pipeline",
  "proposal-generation": "generate-proposal",
};

export async function POST(req: Request) {
  // Authenticate user and get org_id
  const supabase = await createClient();
  const { orgId, error: authError } = await getUserOrgId(supabase);
  if (!orgId) {
    return new Response(
      JSON.stringify({ success: false, error: authError || "Not authenticated" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const n8nUrl = process.env.N8N_WEBHOOK_URL;
  if (!n8nUrl) {
    return new Response(
      JSON.stringify({ success: false, error: "N8N_WEBHOOK_URL not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = await req.json();
  const { service, ...data } = body;

  if (!service || !SERVICE_MAP[service]) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Unknown service: ${service}. Available: ${Object.keys(SERVICE_MAP).join(", ")}`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const webhookPath = SERVICE_MAP[service];
  const fullUrl = `${n8nUrl}/${webhookPath}`;
  const payload = { ...data, org_id: orgId };

  const agent = new https.Agent({ rejectUnauthorized: false });

  // For grant-discovery, fire-and-forget to n8n.
  // n8n writes status updates and results directly to Supabase search_results table.
  // Frontend picks them up via Supabase Realtime subscription.
  if (service === "grant-discovery") {
    const searchId = crypto.randomUUID();

    const discoveryPayload = { ...payload, search_id: searchId };

    // Write initial status update so frontend shows "Searching..."
    const adminSupabase = createAdminClient();
    await adminSupabase.from("search_results").insert({
      search_id: searchId,
      org_id: orgId,
      source_group: "__status__:searching",
      grant_data: { status: "searching", stage_message: "Searching grant databases..." },
      is_complete: false,
    });

    try {
      // n8n webhook responds immediately (onReceived mode).
      // Workflow writes results directly to search_results table when done.
      await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET || "",
        },
        body: JSON.stringify(discoveryPayload),
        agent,
      });
    } catch (err) {
      console.error("[webhook/grant-discovery] Fetch error:", err);
      // Write error completion marker so frontend stops loading
      await adminSupabase.from("search_results").insert({
        search_id: searchId,
        org_id: orgId,
        source_group: "__status__:no_results",
        grant_data: { status: "no_results", stage_message: "Failed to connect to search workflow. Please try again." },
        is_complete: false,
      });
      await adminSupabase.from("search_results").insert({
        search_id: searchId,
        org_id: orgId,
        source_group: "__done__",
        grant_data: [],
        is_complete: true,
      });
      return new Response(
        JSON.stringify({ success: false, error: String(err) }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, search_id: searchId }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET || "",
      },
      body: JSON.stringify(payload),
      agent,
    });

    const text = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(text);
    } catch {
      responseData = text;
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData?.message || responseData || "Workflow failed",
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } },
      );
    }

    // Empty response means workflow took a wrong path
    if (!text || text.trim() === "") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Workflow returned empty response — check n8n logs",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    // Forward n8n's success/failure status
    if (responseData && responseData.success === false) {
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.message || "Workflow returned failure",
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(`[webhook/${service}] Fetch error:`, err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
