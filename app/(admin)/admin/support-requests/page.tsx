import { createAdminClient } from "@/lib/supabase/server";
import { SupportRequestsClient, type SupportRequestRow } from "./support-requests-client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  status?: string;
  category?: string;
  q?: string;
  id?: string;
}>;

export default async function AdminSupportRequestsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = params.status || "";
  const category = params.category || "";
  const q = (params.q || "").trim();
  const selectedId = params.id || "";

  const admin = createAdminClient();

  let query = admin
    .from("support_requests")
    .select(
      "id, org_id, user_id, submitter_name, submitter_email, org_plan, category, subject, message, status, created_at, resolved_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (status) query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  if (q) {
    const escaped = q.replace(/[%,]/g, " ").trim();
    if (escaped) {
      query = query.or(
        `subject.ilike.%${escaped}%,message.ilike.%${escaped}%,submitter_email.ilike.%${escaped}%,submitter_name.ilike.%${escaped}%`
      );
    }
  }

  const { data: requests, error } = await query;

  // Resolve org names for the rows we got back.
  const orgIds = Array.from(
    new Set((requests ?? []).map((r) => r.org_id).filter((x): x is string => !!x))
  );
  const orgIdToName = new Map<string, string>();
  if (orgIds.length > 0) {
    const { data: orgs } = await admin
      .from("organizations")
      .select("id, name")
      .in("id", orgIds);
    (orgs ?? []).forEach((o) => orgIdToName.set(o.id as string, o.name as string));
  }

  const rows: SupportRequestRow[] = (requests ?? []).map((r) => ({
    id: r.id as string,
    org_id: (r.org_id as string | null) ?? null,
    org_name: r.org_id ? orgIdToName.get(r.org_id as string) ?? null : null,
    user_id: (r.user_id as string | null) ?? null,
    submitter_name: (r.submitter_name as string) ?? "",
    submitter_email: (r.submitter_email as string) ?? "",
    org_plan: (r.org_plan as string | null) ?? null,
    category: (r.category as string) ?? "general",
    subject: (r.subject as string) ?? "",
    message: (r.message as string) ?? "",
    status: (r.status as string) ?? "open",
    created_at: r.created_at as string,
    resolved_at: (r.resolved_at as string | null) ?? null,
  }));

  // Counts by status (unfiltered) for the summary cards.
  const { data: statusBreakdown } = await admin
    .from("support_requests")
    .select("status");
  const counts = { open: 0, in_progress: 0, resolved: 0, closed: 0, total: 0 };
  (statusBreakdown ?? []).forEach((r) => {
    counts.total += 1;
    const s = (r.status as string) || "open";
    if (s in counts) (counts as Record<string, number>)[s] += 1;
  });

  return (
    <div className="p-4 sm:p-6">
      <SupportRequestsClient
        rows={rows}
        counts={counts}
        filters={{ status, category, q }}
        selectedId={selectedId}
        errorMessage={error?.message ?? null}
      />
    </div>
  );
}
