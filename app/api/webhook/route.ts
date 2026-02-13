import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// Use service-role client for n8n webhooks (bypasses RLS)
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function validateWebhookSecret(request: NextRequest): boolean {
  const secret = request.headers.get("x-webhook-secret");
  return secret === process.env.N8N_WEBHOOK_SECRET;
}

export async function POST(request: NextRequest) {
  if (!validateWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, data } = body;

    const supabase = createServiceClient();

    switch (action) {
      case "update_grant": {
        const { id, ...updates } = data;
        const { error } = await supabase
          .from("grants")
          .update(updates)
          .eq("id", id);
        if (error) throw error;
        break;
      }

      case "insert_grants": {
        const { error } = await supabase.from("grants").insert(data.grants);
        if (error) throw error;
        break;
      }

      case "update_workflow": {
        const { id, ...updates } = data;
        const { error } = await supabase
          .from("workflow_executions")
          .update(updates)
          .eq("id", id);
        if (error) throw error;
        break;
      }

      case "log_activity": {
        const { error } = await supabase.from("activity_log").insert(data);
        if (error) throw error;
        break;
      }

      case "update_document": {
        const { id, ...updates } = data;
        const { error } = await supabase
          .from("documents")
          .update(updates)
          .eq("id", id);
        if (error) throw error;
        break;
      }

      case "insert_proposal": {
        const { data: proposal, error } = await supabase
          .from("proposals")
          .insert(data.proposal)
          .select()
          .single();
        if (error) throw error;
        break;
      }

      case "insert_proposal_sections": {
        const { error } = await supabase
          .from("proposal_sections")
          .insert(data.sections);
        if (error) throw error;
        break;
      }

      case "update_proposal": {
        const { id, ...updates } = data;
        const { error } = await supabase
          .from("proposals")
          .update(updates)
          .eq("id", id);
        if (error) throw error;
        break;
      }

      case "insert_funder": {
        const { error } = await supabase
          .from("funders")
          .insert(data.funder);
        if (error) throw error;
        break;
      }

      case "update_funder": {
        const { id, ...updates } = data;
        const { error } = await supabase
          .from("funders")
          .update(updates)
          .eq("id", id);
        if (error) throw error;
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
