import { createClient, createAdminClient, getUserOrgId } from "@/lib/supabase/server";
import {
  sendSupportRequestReceivedEmail,
  sendSupportRequestInternalEmail,
} from "@/lib/email/service";

const ALLOWED_CATEGORIES = new Set([
  "general",
  "billing",
  "bug",
  "grants",
  "proposals",
  "feature",
]);

const SUBJECT_MAX = 200;
const MESSAGE_MAX = 5000;

function shortTicketRef(uuid: string): string {
  return "FND-" + uuid.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function appOrigin(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    new URL(req.url).origin
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { orgId } = await getUserOrgId(supabase);

  let body: {
    subject?: unknown;
    message?: unknown;
    category?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const category =
    typeof body.category === "string" && ALLOWED_CATEGORIES.has(body.category)
      ? body.category
      : "general";

  if (!subject || subject.length > SUBJECT_MAX) {
    return Response.json(
      { error: `Subject is required (max ${SUBJECT_MAX} chars)` },
      { status: 400 },
    );
  }
  if (!message || message.length > MESSAGE_MAX) {
    return Response.json(
      { error: `Message is required (max ${MESSAGE_MAX} chars)` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Resolve submitter + org metadata for the notification payloads.
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const submitterEmail = profile?.email || user.email || "";
  const submitterName =
    profile?.full_name?.trim() ||
    (user.user_metadata?.full_name as string | undefined) ||
    submitterEmail ||
    "Fundory user";

  let organizationName: string | null = null;
  let organizationPlan: string | null = null;
  if (orgId) {
    const { data: org } = await admin
      .from("organizations")
      .select("name, plan")
      .eq("id", orgId)
      .maybeSingle();
    organizationName = org?.name ?? null;
    organizationPlan = org?.plan ?? null;
  }

  // Insert audit row first so we have the ticket ref even if downstream sends fail.
  const { data: inserted, error: insertErr } = await admin
    .from("support_requests")
    .insert({
      org_id: orgId,
      user_id: user.id,
      submitter_name: submitterName,
      submitter_email: submitterEmail,
      org_plan: organizationPlan,
      category,
      subject,
      message,
    })
    .select("id, created_at")
    .single();

  if (insertErr || !inserted) {
    console.error("[support-requests] insert failed:", insertErr);
    return Response.json(
      { error: "Could not save your request. Please try again." },
      { status: 500 },
    );
  }

  const ticketRef = shortTicketRef(inserted.id);
  const adminUrl = `${appOrigin(req)}/admin/support-requests?id=${inserted.id}`;

  // Fan out: ack to user, internal email to support inbox, Slack ping.
  // Each is best-effort — the request is already persisted.
  const tasks: Array<Promise<unknown>> = [];

  if (submitterEmail) {
    tasks.push(
      sendSupportRequestReceivedEmail({
        toEmail: submitterEmail,
        fullName: submitterName,
        ticketRef,
        subject,
        message,
      }).catch((e) =>
        console.error("[support-requests] ack email failed:", e),
      ),
    );
  }

  tasks.push(
    sendSupportRequestInternalEmail({
      ticketRef,
      category,
      subject,
      message,
      submitterName,
      submitterEmail,
      organizationName,
      organizationPlan,
      adminUrl,
    }).catch((e) =>
      console.error("[support-requests] internal email failed:", e),
    ),
  );

  const slackUrl = process.env.N8N_SUPPORT_NOTIFIER_URL;
  const slackSecret = process.env.N8N_SUPPORT_NOTIFIER_SECRET;
  if (slackUrl && slackSecret) {
    tasks.push(
      fetch(slackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": slackSecret,
        },
        body: JSON.stringify({
          ticketRef,
          category,
          subject,
          message,
          submitterName,
          submitterEmail,
          organizationName,
          organizationPlan,
          adminUrl,
        }),
      })
        .then(async (r) => {
          if (!r.ok)
            console.error(
              "[support-requests] Slack notifier non-2xx:",
              r.status,
              await r.text().catch(() => ""),
            );
        })
        .catch((e) =>
          console.error("[support-requests] Slack notifier error:", e),
        ),
    );
  } else {
    console.warn(
      "[support-requests] N8N_SUPPORT_NOTIFIER_URL/SECRET not set — skipping Slack",
    );
  }

  await Promise.all(tasks);

  return Response.json({ ok: true, ticketRef, id: inserted.id });
}
