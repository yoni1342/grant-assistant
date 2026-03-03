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

  const agent = new https.Agent({
    rejectUnauthorized: false,
  });

  const response = await fetch(
    `${n8nUrl}/search-grant-with-query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET || "",
      },
      body: JSON.stringify({ ...body, org_id: orgId }),
      agent,
    },
  );

  const text = await response.text();
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

  return new Response(JSON.stringify({ success: true, data }), {
    headers: { "Content-Type": "application/json" },
  });
}
