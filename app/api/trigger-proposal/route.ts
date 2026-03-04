import fetch from "node-fetch";
import https from "https";
import { createClient, getUserOrgId } from "@/lib/supabase/server";

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
  const payload = { ...body, org_id: orgId };
  const fullUrl = `${n8nUrl}/generate-proposal`;

  console.log('[trigger-proposal] URL:', fullUrl);
  console.log('[trigger-proposal] Payload:', JSON.stringify(payload));

  const agent = new https.Agent({
    rejectUnauthorized: false,
  });

  try {
    const response = await fetch(
      fullUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET || "",
        },
        body: JSON.stringify(payload),
        agent,
      },
    );

    console.log('[trigger-proposal] n8n status:', response.status);
    const text = await response.text();
    console.log('[trigger-proposal] n8n response:', text.substring(0, 500));

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: data?.message || data || "Workflow failed" }),
        { status: response.status, headers: { "Content-Type": "application/json" } },
      );
    }

    // n8n returned 200 but empty body means workflow took wrong path
    if (!text || text.trim() === '') {
      return new Response(
        JSON.stringify({ success: false, error: "Workflow returned empty response — check n8n logs" }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error('[trigger-proposal] Fetch error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
