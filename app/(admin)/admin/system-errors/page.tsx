import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { FUNDORY_WORKFLOWS } from "@/lib/n8n/fundory-workflows";
import { SystemErrorsClient, type GroupRow, type RawRow, type FilterOption } from "./system-errors-client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  range?: string;
  from?: string;
  to?: string;
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

function parseLocalDatetimeToIso(s: string | undefined): string | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export default async function SystemErrorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const requestedRange = params.range || "7d";
  const isCustom = requestedRange === "custom";
  const range =
    isCustom || RANGE_TO_HOURS[requestedRange] !== undefined ? requestedRange : "7d";
  const workflow = params.workflow || "";
  const org = params.org || "";
  const errorType = params.type || "";
  const view = params.view === "raw" ? "raw" : "grouped";
  const fromParam = isCustom ? params.from || "" : "";
  const toParam = isCustom ? params.to || "" : "";

  const admin = createAdminClient();

  let sinceIso: string | null;
  let untilIso: string | null = null;
  if (isCustom) {
    sinceIso = parseLocalDatetimeToIso(fromParam);
    untilIso = parseLocalDatetimeToIso(toParam);
  } else {
    sinceIso = computeSinceIso(RANGE_TO_HOURS[range]);
  }

  // Pull rows in the active window from n8n_workflow_errors and aggregate in
  // app code so the count / first-seen / last-seen reflect the filter window
  // instead of being all-time-per-fingerprint (which is what the precomputed
  // n8n_workflow_errors_grouped view returns).
  type AggRow = {
    id: string;
    fingerprint: string | null;
    workflow_name: string | null;
    failed_node: string | null;
    error_type: string | null;
    org_id: string | null;
    error_message: string | null;
    execution_url: string | null;
    execution_id: string | null;
    execution_mode: string | null;
    resolved_at: string | null;
    created_at: string;
  };

  const PAGE_SIZE = 1000;
  const HARD_CAP = 25000; // safety bound; "All time" + heavy 429 days fits within this
  const aggRows: AggRow[] = [];
  let aggErr: string | null = null;
  let pageStart = 0;
  while (aggRows.length < HARD_CAP) {
    let q = admin
      .from("n8n_workflow_errors")
      .select(
        "id, fingerprint, workflow_name, failed_node, error_type, org_id, error_message, execution_url, execution_id, execution_mode, resolved_at, created_at"
      )
      .order("created_at", { ascending: false })
      .range(pageStart, pageStart + PAGE_SIZE - 1);
    if (sinceIso) q = q.gte("created_at", sinceIso);
    if (untilIso) q = q.lte("created_at", untilIso);
    q = q.in("workflow_name", FUNDORY_WORKFLOWS as unknown as string[]);
    if (workflow) q = q.eq("workflow_name", workflow);
    if (errorType) q = q.eq("error_type", errorType);
    const { data, error } = await q;
    if (error) {
      aggErr = error.message;
      break;
    }
    if (!data || data.length === 0) break;
    aggRows.push(...(data as AggRow[]));
    if (data.length < PAGE_SIZE) break;
    pageStart += PAGE_SIZE;
  }

  // Raw view: filter from the rows we already fetched (org filter is raw-only).
  let raw: RawRow[] = [];
  if (view === "raw") {
    raw = aggRows
      .filter((r) => !org || r.org_id === org)
      .slice(0, 500)
      .map((r) => ({
        id: r.id,
        workflow_name: r.workflow_name,
        failed_node: r.failed_node,
        execution_id: r.execution_id,
        execution_mode: r.execution_mode,
        error_message: r.error_message,
        execution_url: r.execution_url,
        error_type: r.error_type,
        org_id: r.org_id,
        created_at: r.created_at,
      }));
  }

  // Filter options — restrict to Fundory workflows that have actually emitted
  // an error (avoid offering empty-state filter values for unrelated workflows).
  const { data: wfNamesData } = await admin
    .from("n8n_workflow_errors")
    .select("workflow_name")
    .in("workflow_name", FUNDORY_WORKFLOWS as unknown as string[]);
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

  const orgIdToName = new Map<string, string>(
    (orgsData ?? []).map((o) => [o.id as string, o.name as string])
  );

  // Aggregate by fingerprint over the rows we just fetched. Mirrors the
  // n8n_workflow_errors_grouped view's logic but bounded to the time window.
  // Rows arrive ordered by created_at desc → first row encountered for a
  // fingerprint is the most-recent occurrence (use it for sample fields).
  function legacyFingerprint(wf: string | null, node: string | null): string {
    return (
      "legacy:" +
      createHash("md5").update(`${wf ?? ""}:${node ?? ""}`).digest("hex")
    );
  }

  type Group = {
    fingerprint: string;
    workflow_name: string | null;
    failed_node: string | null;
    error_type: string;
    occurrences: number;
    org_ids: Set<string>;
    last_seen_at: string;
    first_seen_at: string;
    sample_message: string | null;
    sample_execution_url: string | null;
    resolved: boolean;
  };

  const groups = new Map<string, Group>();
  for (const r of aggRows) {
    const fp = r.fingerprint || legacyFingerprint(r.workflow_name, r.failed_node);
    let g = groups.get(fp);
    if (!g) {
      g = {
        fingerprint: fp,
        workflow_name: r.workflow_name,
        failed_node: r.failed_node,
        error_type: r.error_type ?? "unknown",
        occurrences: 0,
        org_ids: new Set<string>(),
        last_seen_at: r.created_at,
        first_seen_at: r.created_at,
        sample_message: r.error_message,
        sample_execution_url: r.execution_url,
        resolved: true,
      };
      groups.set(fp, g);
    }
    g.occurrences += 1;
    if (r.org_id) g.org_ids.add(r.org_id);
    if (r.created_at < g.first_seen_at) g.first_seen_at = r.created_at;
    if (r.resolved_at == null) g.resolved = false;
  }

  const groupedRows: GroupRow[] = Array.from(groups.values())
    .sort((a, b) => (a.last_seen_at < b.last_seen_at ? 1 : -1))
    .map((g) => ({
      fingerprint: g.fingerprint,
      workflow_name: g.workflow_name,
      failed_node: g.failed_node,
      error_type: g.error_type,
      occurrences: g.occurrences,
      affected_org_count: g.org_ids.size,
      affected_org_names: Array.from(g.org_ids)
        .map((id) => orgIdToName.get(id) ?? null)
        .filter((x): x is string => !!x),
      last_seen_at: g.last_seen_at,
      first_seen_at: g.first_seen_at,
      sample_message: g.sample_message,
      sample_execution_url: g.sample_execution_url,
      resolved: g.resolved,
    }));

  return (
    <div className="p-4 sm:p-6">
      <SystemErrorsClient
        groupedRows={groupedRows}
        rawRows={raw}
        workflowOptions={workflowNames}
        orgOptions={orgOptions}
        filters={{ range, from: fromParam, to: toParam, workflow, org, type: errorType, view }}
        errorMessage={aggErr ?? null}
      />
    </div>
  );
}
