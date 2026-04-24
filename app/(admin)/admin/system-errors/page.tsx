import { createAdminClient } from "@/lib/supabase/server";
import { SystemErrorsClient, type GroupRow, type RawRow, type FilterOption } from "./system-errors-client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  range?: string;
  workflow?: string;
  org?: string;
  type?: string;
  view?: string;
}>;

const RANGE_TO_HOURS: Record<string, number | null> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  all: null,
};

function computeSinceIso(rangeHours: number | null): string | null {
  if (rangeHours === null) return null;
  const ms = rangeHours * 60 * 60 * 1000;
  return new Date(Date.now() - ms).toISOString();
}

export default async function SystemErrorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const range = params.range && RANGE_TO_HOURS[params.range] !== undefined ? params.range : "7d";
  const workflow = params.workflow || "";
  const org = params.org || "";
  const errorType = params.type || "";
  const view = params.view === "raw" ? "raw" : "grouped";

  const admin = createAdminClient();

  const rangeHours = RANGE_TO_HOURS[range];
  const sinceIso = computeSinceIso(rangeHours);

  // Grouped rows — always fetch so the summary card counts stay accurate.
  let groupedQ = admin
    .from("n8n_workflow_errors_grouped")
    .select(
      "fingerprint, workflow_name, failed_node, error_type, occurrences, affected_org_count, org_ids, last_seen_at, first_seen_at, sample_message, sample_execution_url, resolved"
    )
    .order("last_seen_at", { ascending: false });
  if (sinceIso) groupedQ = groupedQ.gte("last_seen_at", sinceIso);
  if (workflow) groupedQ = groupedQ.eq("workflow_name", workflow);
  if (errorType) groupedQ = groupedQ.eq("error_type", errorType);
  const { data: grouped, error: groupedErr } = await groupedQ.limit(500);

  // Raw rows — only when requested.
  let raw: RawRow[] = [];
  let rawErr: string | null = null;
  if (view === "raw") {
    let rawQ = admin
      .from("n8n_workflow_errors")
      .select(
        "id, workflow_name, failed_node, execution_id, execution_mode, error_message, execution_url, error_type, org_id, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (sinceIso) rawQ = rawQ.gte("created_at", sinceIso);
    if (workflow) rawQ = rawQ.eq("workflow_name", workflow);
    if (org) rawQ = rawQ.eq("org_id", org);
    if (errorType) rawQ = rawQ.eq("error_type", errorType);
    const { data, error } = await rawQ;
    raw = (data ?? []) as RawRow[];
    rawErr = error?.message ?? null;
  }

  // Filter options.
  const { data: wfNamesData } = await admin
    .from("n8n_workflow_errors")
    .select("workflow_name")
    .not("workflow_name", "is", null);
  const workflowNames = Array.from(
    new Set((wfNamesData ?? []).map((r) => r.workflow_name as string).filter(Boolean))
  )
    .sort()
    .map((n): FilterOption => ({ value: n, label: n }));

  const { data: orgsData } = await admin
    .from("organizations")
    .select("id, name")
    .order("name", { ascending: true });
  const orgOptions: FilterOption[] = (orgsData ?? []).map((o) => ({
    value: o.id as string,
    label: o.name as string,
  }));

  // Resolve org ids → names for the grouped view.
  const allOrgIds = new Set<string>();
  (grouped ?? []).forEach((g) => {
    const ids = (g.org_ids as string[] | null) ?? [];
    ids.forEach((id) => allOrgIds.add(id));
  });
  const orgIdToName = new Map<string, string>(
    (orgsData ?? []).map((o) => [o.id as string, o.name as string])
  );

  const groupedRows: GroupRow[] = (grouped ?? []).map((g) => ({
    fingerprint: g.fingerprint as string,
    workflow_name: (g.workflow_name as string | null) ?? null,
    failed_node: (g.failed_node as string | null) ?? null,
    error_type: (g.error_type as string | null) ?? "unknown",
    occurrences: Number(g.occurrences ?? 0),
    affected_org_count: Number(g.affected_org_count ?? 0),
    affected_org_names: ((g.org_ids as string[] | null) ?? [])
      .map((id) => orgIdToName.get(id) ?? null)
      .filter((x): x is string => !!x),
    last_seen_at: g.last_seen_at as string,
    first_seen_at: g.first_seen_at as string,
    sample_message: (g.sample_message as string | null) ?? null,
    sample_execution_url: (g.sample_execution_url as string | null) ?? null,
    resolved: Boolean(g.resolved),
  }));

  return (
    <div className="p-4 sm:p-6">
      <SystemErrorsClient
        groupedRows={groupedRows}
        rawRows={raw}
        workflowOptions={workflowNames}
        orgOptions={orgOptions}
        filters={{ range, workflow, org, type: errorType, view }}
        errorMessage={groupedErr?.message ?? rawErr ?? null}
      />
    </div>
  );
}
