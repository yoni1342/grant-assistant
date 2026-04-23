import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";

// Hourly staggered grant-fetch rotation. Replaces the old n8n scheduleTrigger
// so that if n8n is briefly down we at least get Vercel cron logs + retries.
//
// Each fire calls the Supabase RPC `next_org_fetch_batch()` which atomically
// picks ceil(approved_orgs / 24) oldest orgs and stamps their
// last_grant_fetch_at = now(), then fans out to the n8n /webhook/fetch-grants
// endpoint per org (fire-and-forget).
//
// Configured in vercel.json to run at `0 * * * *`.

const CRON_SECRET = process.env.CRON_SECRET;

function getServiceClient() {
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET || "";
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "N8N_WEBHOOK_URL not set" },
      { status: 500 },
    );
  }

  const supabase = getServiceClient();
  const { data: batch, error } = await supabase.rpc("next_org_fetch_batch");
  if (error) {
    return NextResponse.json(
      { error: `next_org_fetch_batch: ${error.message}` },
      { status: 500 },
    );
  }

  const orgs = (batch ?? []) as { id: string; name: string }[];
  if (orgs.length === 0) {
    return NextResponse.json({ triggered: 0, orgs: [] });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  const triggered: string[] = [];
  const failures: { id: string; name: string; message: string }[] = [];

  for (const org of orgs) {
    try {
      await supabase
        .from("grant_fetch_status")
        .upsert(
          {
            org_id: org.id,
            status: "searching",
            stage_message: "Hourly grant refresh running...",
          },
          { onConflict: "org_id" },
        );

      // Fire-and-forget — the workflow is long-running. We just need the
      // webhook to accept the request; the downstream n8n execution is
      // observed via the Fetch Queue / System Errors admin pages.
      fetch(`${webhookUrl}/fetch-grants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": webhookSecret,
        },
        body: JSON.stringify({
          org_id: org.id,
          callback_url: appUrl ? `${appUrl}/api/grant-fetch-status` : undefined,
          is_new_org: false,
        }),
      }).catch((err) => {
        console.error(`[hourly-org-fetch] ${org.id} (${org.name}):`, err);
      });

      triggered.push(org.id);
      // 200ms stagger inside a batch so OpenAI doesn't see a thundering herd
      // when batch_size grows with org count.
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      failures.push({
        id: org.id,
        name: org.name,
        message: (err as Error).message,
      });
    }
  }

  return NextResponse.json({
    triggered: triggered.length,
    orgs: orgs.map((o) => ({ id: o.id, name: o.name })),
    failures: failures.length > 0 ? failures : undefined,
  });
}
