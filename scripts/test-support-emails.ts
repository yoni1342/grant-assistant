/**
 * One-off smoke test for the two support-request emails.
 * Usage:  npx tsx scripts/test-support-emails.ts <to-email>
 */
import {
  sendSupportRequestReceivedEmail,
  sendSupportRequestInternalEmail,
} from "../lib/email/service";

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: npx tsx scripts/test-support-emails.ts <to-email>");
    process.exit(1);
  }

  const ticketRef = "FND-EMAILTEST";
  const subject = "Smoke test: support email path";
  const message =
    "This is a test message verifying the support-request email pipeline (user ack + internal team copy). Please ignore.\n\n— support smoke test";

  console.log("[1/2] sending user-ack email to:", to);
  await sendSupportRequestReceivedEmail({
    toEmail: to,
    fullName: "Smoke Tester",
    ticketRef,
    subject,
    message,
  });

  console.log("[2/2] sending internal-team email (to support@fundory.ai)");
  await sendSupportRequestInternalEmail({
    ticketRef,
    category: "general",
    subject,
    message,
    submitterName: "Smoke Tester",
    submitterEmail: to,
    organizationName: "Fundory Internal",
    organizationPlan: "agency",
    adminUrl: "https://fundory.ai/admin/support-requests?id=test",
  });

  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
