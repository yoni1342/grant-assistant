import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";

const CRON_SECRET = process.env.CRON_SECRET;

function getServiceClient() {
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Daily fan-out: triggers the n8n Grant fetch workflow once per approved
// org so the AI niche filter runs against whatever landed in central_grants
// in the last 24h. We stagger webhook calls so OpenAI concurrency inside
// the workflow doesn't get swamped when many orgs exist.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET || "";
  if (!webhookUrl) {
    return NextResponse.json({ error: "N8N_WEBHOOK_URL not set" }, { status: 500 });
  }

  const supabase = getServiceClient();
  // Free tier is manual-only — they add grants via Discovery, capped at
  // 1/day. Only paid plans (or testers) receive the daily auto-fetch.
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, plan, is_tester")
    .eq("status", "approved")
    .or("plan.neq.free,is_tester.eq.true");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!orgs?.length) {
    return NextResponse.json({ triggered: 0 });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  let triggered = 0;
  const failures: string[] = [];

  for (const org of orgs) {
    try {
      await supabase
        .from("grant_fetch_status")
        .upsert(
          {
            org_id: org.id,
            status: "searching",
            stage_message: "Daily grant refresh running...",
          },
          { onConflict: "org_id" },
        );

      // Fire-and-forget — the workflow is long-running and we don't want
      // this cron handler to sit open for minutes per org.
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
        console.error(`[fan-out-central-grants] ${org.id}:`, err);
      });

      triggered++;
      // Small stagger so we don't hit OpenAI with every org's first batch
      // simultaneously. 2s × N orgs is fine for a daily job.
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      failures.push(`${org.id}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({
    triggered,
    failures: failures.length > 0 ? failures : undefined,
  });
}
