import fetch from "node-fetch";
import https from "https";
import { createClient, createAdminClient, getUserOrgId } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import type { PlanId } from "@/lib/stripe/config";
import { friendlyWorkflowError } from "@/lib/errors";

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

  // Validate grant exists and has a title before proposal generation
  if (service === "proposal-generation") {
    if (!data.grantId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing grantId.", code: "INVALID_GRANT" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    const adminSupabase = createAdminClient();
    const { data: grant } = await adminSupabase
      .from("grants")
      .select("title")
      .eq("id", data.grantId)
      .eq("org_id", orgId)
      .single();

    if (!grant || !grant.title?.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Cannot generate proposal: grant is missing a title.",
          code: "INVALID_GRANT",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // Validate and enforce limits for add-to-pipeline
  if (service === "grant-screening") {
    // Reject grants with no title
    if (!data.title || !String(data.title).trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Cannot add grant: missing title.",
          code: "INVALID_GRANT",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const adminSupabase = createAdminClient();
    const { data: org } = await adminSupabase
      .from("organizations")
      .select("plan, is_tester")
      .eq("id", orgId)
      .single();

    const plan = (org?.plan as PlanId) || "free";
    const limit = org?.is_tester ? null : (PLANS[plan]?.dailyGrantLimit ?? null);

    if (limit !== null) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const { count } = await adminSupabase
        .from("grant_usage_log")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", startOfDay);

      if ((count ?? 0) >= limit) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `You've reached your daily limit of ${limit} grant${limit === 1 ? "" : "s"}. Upgrade to Professional for unlimited grants.`,
            code: "GRANT_LIMIT_REACHED",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    // Log this addition so deletes/archives don't reset the daily count
    await adminSupabase.from("grant_usage_log").insert({ org_id: orgId });
  }

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

    // Fire-and-forget: trigger n8n webhook without awaiting.
    // The workflow writes results directly to search_results table.
    // We must NOT await this — if n8n uses responseNode mode, the fetch
    // would block until the entire workflow completes, preventing the
    // API from returning the search_id to the frontend.
    fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET || "",
      },
      body: JSON.stringify(discoveryPayload),
      agent,
    }).catch((err) => {
      console.error("[webhook/grant-discovery] Fetch error:", err);
      // Write error completion marker so frontend stops loading
      adminSupabase.from("search_results").insert({
        search_id: searchId,
        org_id: orgId,
        source_group: "__status__:no_results",
        grant_data: { status: "no_results", stage_message: "Failed to connect to search workflow. Please try again." },
        is_complete: false,
      }).then(() =>
        adminSupabase.from("search_results").insert({
          search_id: searchId,
          org_id: orgId,
          source_group: "__done__",
          grant_data: [],
          is_complete: true,
        })
      );
    });

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
          error: friendlyWorkflowError(service, responseData?.message || responseData),
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } },
      );
    }

    // Empty response means workflow took a wrong path
    if (!text || text.trim() === "") {
      console.error(`[webhook/${service}] Empty response from n8n`);
      return new Response(
        JSON.stringify({
          success: false,
          error: friendlyWorkflowError(service),
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    // Forward n8n's success/failure status
    if (responseData && responseData.success === false) {
      return new Response(
        JSON.stringify({
          success: false,
          error: friendlyWorkflowError(service, responseData.message),
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: friendlyWorkflowError(service, err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
