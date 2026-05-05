import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { FUNDORY_WORKFLOWS } from "@/lib/n8n/fundory-workflows";
import {
  OrgFetchHistoryClient,
  type DayRow,
  type ErrorRow,
} from "./org-history-client";

export const dynamic = "force-dynamic";

const PRESETS = ["live", "yesterday", "7d", "30d", "custom"] as const;
type Preset = (typeof PRESETS)[number];

function resolveRange(preset: Preset, from?: string, to?: string) {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const utcDay = (offsetDays: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };
  if (preset === "live") return { from: todayIso, to: todayIso };
  if (preset === "yesterday") {
    const y = utcDay(-1);
    return { from: y, to: y };
  }
  if (preset === "7d") return { from: utcDay(-6), to: todayIso };
  if (preset === "30d") return { from: utcDay(-29), to: todayIso };
  return {
    from: from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : utcDay(-6),
    to: to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : todayIso,
  };
}

export default async function OrgFetchHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const { orgId } = await params;
  const sp = await searchParams;
  const preset: Preset = (PRESETS as readonly string[]).includes(sp.preset ?? "")
    ? (sp.preset as Preset)
    : "7d";
  const range = resolveRange(preset, sp.from, sp.to);

  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select(
      "id, name, plan, status, sector, email, website, created_at, is_tester, subscription_status",
    )
    .eq("id", orgId)
    .single();

  if (!org) notFound();

  const { data: queueRow } = await admin
    .from("org_fetch_schedule")
    .select(
      "id, name, last_grant_fetch_at, queue_position, hours_until_next_fetch, estimated_next_fetch_at, run_state, grants_added_in_run, last_error_message, last_error_type, last_error_at",
    )
    .eq("id", orgId)
    .maybeSingle();

  const { data: historyData, error: historyErr } = await admin
    .from("org_fetch_history_daily")
    .select(
      "day, grants_added, error_count, last_error_type, last_error_message, last_error_at, outcome",
    )
    .eq("org_id", orgId)
    .gte("day", range.from)
    .lte("day", range.to)
    .order("day", { ascending: false });

  // Lifetime grant pickup counts (across all time, not just range).
  const { count: lifetimeGrants } = await admin
    .from("grants")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  // Individual error rows for this org in the same date window. Bound to
  // FUNDORY_WORKFLOWS so unrelated n8n projects on the same host never leak in.
  const sinceIso = `${range.from}T00:00:00.000Z`;
  const untilIso = `${range.to}T23:59:59.999Z`;
  const { data: errorRowsData, error: errorRowsErr } = await admin
    .from("n8n_workflow_errors")
    .select(
      "id, workflow_name, failed_node, error_type, error_message, execution_id, execution_mode, execution_url, created_at",
    )
    .eq("org_id", orgId)
    .in("workflow_name", FUNDORY_WORKFLOWS as unknown as string[])
    .gte("created_at", sinceIso)
    .lte("created_at", untilIso)
    .order("created_at", { ascending: false })
    .limit(500);

  const errorRows: ErrorRow[] = (errorRowsData ?? []).map((r) => ({
    id: r.id as string,
    workflow_name: (r.workflow_name as string | null) ?? null,
    failed_node: (r.failed_node as string | null) ?? null,
    error_type: (r.error_type as string | null) ?? null,
    error_message: (r.error_message as string | null) ?? null,
    execution_id: (r.execution_id as string | null) ?? null,
    execution_mode: (r.execution_mode as string | null) ?? null,
    execution_url: (r.execution_url as string | null) ?? null,
    created_at: r.created_at as string,
  }));

  const days: DayRow[] = (historyData ?? []).map((h) => ({
    day: h.day as string,
    grants_added: Number(h.grants_added ?? 0),
    error_count: Number(h.error_count ?? 0),
    last_error_type: (h.last_error_type as string | null) ?? null,
    last_error_message: (h.last_error_message as string | null) ?? null,
    last_error_at: (h.last_error_at as string | null) ?? null,
    outcome: (h.outcome as DayRow["outcome"]) ?? "quiet",
  }));

  return (
    <div className="p-4 sm:p-6">
      <OrgFetchHistoryClient
        orgId={orgId}
        orgMeta={{
          name: org.name as string,
          plan: (org.plan as string | null) ?? null,
          status: (org.status as string | null) ?? null,
          sector: (org.sector as string | null) ?? null,
          email: (org.email as string | null) ?? null,
          website: (org.website as string | null) ?? null,
          created_at: (org.created_at as string | null) ?? null,
          is_tester: Boolean(org.is_tester),
          subscription_status: (org.subscription_status as string | null) ?? null,
        }}
        queueRow={
          queueRow
            ? {
                queue_position: Number(queueRow.queue_position ?? 0),
                hours_until_next_fetch: Number(
                  queueRow.hours_until_next_fetch ?? 0,
                ),
                estimated_next_fetch_at:
                  (queueRow.estimated_next_fetch_at as string) ?? "",
                last_grant_fetch_at:
                  (queueRow.last_grant_fetch_at as string | null) ?? null,
                run_state:
                  (queueRow.run_state as
                    | "never"
                    | "running"
                    | "success"
                    | "failed") ?? "never",
                grants_added_in_run: Number(queueRow.grants_added_in_run ?? 0),
                last_error_type:
                  (queueRow.last_error_type as string | null) ?? null,
                last_error_message:
                  (queueRow.last_error_message as string | null) ?? null,
                last_error_at:
                  (queueRow.last_error_at as string | null) ?? null,
              }
            : null
        }
        days={days}
        lifetimeGrants={lifetimeGrants ?? 0}
        historyError={historyErr?.message ?? null}
        errorRows={errorRows}
        errorRowsError={errorRowsErr?.message ?? null}
        filters={{ preset, from: range.from, to: range.to }}
      />
    </div>
  );
}
