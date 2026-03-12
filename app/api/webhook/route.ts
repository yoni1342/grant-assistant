import fetch from "node-fetch";
import https from "https";
import { createClient, getUserOrgId } from "@/lib/supabase/server";

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
