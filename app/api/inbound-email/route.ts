import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { simpleParser } from "mailparser";
import { parseTicketRef, ticketRefToIdRange } from "@/lib/support/ticket";
import { notifyAdminsOfSupportActivity } from "@/lib/support/notify-admins";

// SES inbound pipeline: support@fundory.ai -> SES receipt rule -> S3 (raw MIME)
// + SNS notification -> this endpoint. We fetch the raw email from S3, parse it,
// and thread it onto the matching support_request (or open a new one), then
// alert every platform admin.
//
// Auth: SNS is subscribed with ?token=<INBOUND_EMAIL_SECRET>. SES inbound is
// only configured in us-east-1, so the S3 bucket + creds live there too.

export const runtime = "nodejs";
export const maxDuration = 60;

const INBOUND_SECRET = process.env.INBOUND_EMAIL_SECRET;
const BUCKET = process.env.INBOUND_EMAIL_BUCKET;
const KEY_PREFIX = process.env.INBOUND_EMAIL_PREFIX ?? "inbound/";
const REGION = process.env.AWS_SES_REGION || "us-east-1";

function getServiceClient() {
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function appOrigin(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    new URL(req.url).origin
  );
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  // @aws-sdk v3 GetObject body is a Node Readable in the node runtime.
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  // Shared-secret check (SNS subscribes with this token in the query string).
  if (!INBOUND_SECRET || req.nextUrl.searchParams.get("token") !== INBOUND_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let envelope: Record<string, unknown>;
  try {
    envelope = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const snsType = envelope.Type as string | undefined;

  // SNS subscription handshake — confirm by fetching the AWS-provided URL.
  if (snsType === "SubscriptionConfirmation") {
    const subscribeUrl = String(envelope.SubscribeURL || "");
    try {
      const host = new URL(subscribeUrl).hostname;
      if (!host.endsWith(".amazonaws.com")) {
        return NextResponse.json({ error: "Bad SubscribeURL" }, { status: 400 });
      }
      await fetch(subscribeUrl);
      console.log("[inbound-email] SNS subscription confirmed");
    } catch (e) {
      console.error("[inbound-email] subscription confirm failed:", e);
      return NextResponse.json({ error: "Confirm failed" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (snsType !== "Notification") {
    return NextResponse.json({ ok: true, ignored: snsType ?? "unknown" });
  }

  if (!BUCKET) {
    console.error("[inbound-email] INBOUND_EMAIL_BUCKET not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // The SES "Received" notification carries mail metadata + the messageId, which
  // is also the S3 object key (under our prefix). The raw MIME is in S3.
  let sesMessage: {
    mail?: { messageId?: string; commonHeaders?: { subject?: string; from?: string[] } };
  };
  try {
    sesMessage = JSON.parse(String(envelope.Message || "{}"));
  } catch {
    return NextResponse.json({ error: "Bad SES message" }, { status: 400 });
  }

  const sesMessageId = sesMessage.mail?.messageId;
  if (!sesMessageId) {
    return NextResponse.json({ ok: true, skipped: "no messageId" });
  }

  // Fetch + parse the raw email from S3.
  let raw: Buffer;
  try {
    const s3 = new S3Client({ region: REGION });
    const obj = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: `${KEY_PREFIX}${sesMessageId}` }),
    );
    raw = await streamToBuffer(obj.Body);
  } catch (e) {
    console.error("[inbound-email] S3 fetch failed:", e);
    return NextResponse.json({ error: "S3 fetch failed" }, { status: 502 });
  }

  const parsed = await simpleParser(raw);
  const fromAddr = parsed.from?.value?.[0];
  const submitterEmail = (fromAddr?.address || "").toLowerCase();
  const submitterName = fromAddr?.name?.trim() || submitterEmail || "Email sender";
  const subject = (parsed.subject || "(no subject)").trim();
  const bodyText =
    (parsed.text && parsed.text.trim()) ||
    (parsed.html ? String(parsed.html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "") ||
    "(empty message)";
  // Prefer the email's own Message-ID for de-dupe; fall back to the SES id.
  const emailMessageId = parsed.messageId || sesMessageId;

  // Auto-replies / bounces shouldn't open tickets.
  if (/^(mailer-daemon|postmaster|no-?reply)/i.test(submitterEmail)) {
    return NextResponse.json({ ok: true, skipped: "automated sender" });
  }

  const admin = getServiceClient();

  // Try to thread onto an existing ticket via the FND- ref in the subject.
  const ref = parseTicketRef(subject);
  let requestId: string | null = null;
  if (ref) {
    const range = ticketRefToIdRange(ref);
    if (range) {
      const { data: match } = await admin
        .from("support_requests")
        .select("id")
        .gte("id", range.gte)
        .lte("id", range.lte)
        .limit(1)
        .maybeSingle();
      requestId = match?.id ?? null;
    }
  }

  let kind: "new_request" | "customer_reply";

  if (requestId) {
    // Reply on an existing thread → append a message, reopen, bump activity.
    kind = "customer_reply";
    const { error: msgErr } = await admin.from("support_messages").insert({
      request_id: requestId,
      direction: "inbound",
      from_email: submitterEmail,
      from_name: submitterName,
      to_email: process.env.AWS_SES_REPLY_TO_EMAIL || "support@fundory.ai",
      body_text: bodyText,
      body_html: parsed.html ? String(parsed.html) : null,
      s3_key: `${KEY_PREFIX}${sesMessageId}`,
      email_message_id: emailMessageId,
    });
    if (msgErr) {
      // Unique violation = SNS re-delivery; treat as success.
      if (msgErr.code === "23505") {
        return NextResponse.json({ ok: true, deduped: true });
      }
      console.error("[inbound-email] message insert failed:", msgErr);
      return NextResponse.json({ error: "insert failed" }, { status: 500 });
    }
    await admin
      .from("support_requests")
      .update({ status: "open", last_message_at: new Date().toISOString() })
      .eq("id", requestId);
  } else {
    // No matching ticket → open a new request (idempotent on the Message-ID).
    kind = "new_request";
    const { data: created, error: reqErr } = await admin
      .from("support_requests")
      .insert({
        submitter_name: submitterName,
        submitter_email: submitterEmail,
        category: "general",
        subject,
        message: bodyText,
        inbound_message_id: emailMessageId,
      })
      .select("id")
      .single();
    if (reqErr) {
      if (reqErr.code === "23505") {
        return NextResponse.json({ ok: true, deduped: true });
      }
      console.error("[inbound-email] request insert failed:", reqErr);
      return NextResponse.json({ error: "insert failed" }, { status: 500 });
    }
    requestId = created.id;
  }

  // Fan the alert out to every platform admin (in-app + email). Best-effort.
  await notifyAdminsOfSupportActivity({
    admin,
    requestId: requestId!,
    kind,
    subject,
    preview: bodyText,
    submitterName,
    submitterEmail,
    appOrigin: appOrigin(req),
  }).catch((e) => console.error("[inbound-email] admin notify failed:", e));

  return NextResponse.json({ ok: true, requestId, kind });
}
