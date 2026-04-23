import { createAdminClient } from "@/lib/supabase/server";
import {
  FetchQueueClient,
  type HistoryRow,
  type QueueRow,
} from "./fetch-queue-client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  preset?: string;
  from?: string;
  to?: string;
}>;

const PRESETS = ["yesterday", "7d", "30d", "custom"] as const;
type Preset = (typeof PRESETS)[number];

function resolveRange(preset: Preset, from?: string, to?: string) {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const utcDay = (offsetDays: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  if (preset === "yesterday") {
    const y = utcDay(-1);
    return { from: y, to: y };
  }
  if (preset === "7d") return { from: utcDay(-6), to: todayIso };
  if (preset === "30d") return { from: utcDay(-29), to: todayIso };
  // custom — fall back sensibly if inputs missing
  return {
    from: from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : utcDay(-6),
    to: to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : todayIso,
  };
}

export default async function FetchQueuePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const preset: Preset = (PRESETS as readonly string[]).includes(params.preset ?? "")
    ? (params.preset as Preset)
    : "yesterday";
  const range = resolveRange(preset, params.from, params.to);

  const admin = createAdminClient();

  const { data: queueData, error: queueErr } = await admin
    .from("org_fetch_schedule")
    .select(
      "id, name, last_grant_fetch_at, queue_position, batch_size, hours_until_next_fetch, estimated_next_fetch_at, run_state, grants_added_in_run, last_error_message, last_error_type, last_error_at"
    )
    .order("queue_position", { ascending: true });

  const rows: QueueRow[] = (queueData ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    last_grant_fetch_at: (r.last_grant_fetch_at as string | null) ?? null,
    queue_position: Number(r.queue_position),
    batch_size: Number(r.batch_size),
    hours_until_next_fetch: Number(r.hours_until_next_fetch),
    estimated_next_fetch_at: r.estimated_next_fetch_at as string,
    run_state: (r.run_state as QueueRow["run_state"]) ?? "never",
    grants_added_in_run: Number(r.grants_added_in_run ?? 0),
    last_error_message: (r.last_error_message as string | null) ?? null,
    last_error_type: (r.last_error_type as string | null) ?? null,
    last_error_at: (r.last_error_at as string | null) ?? null,
  }));

  const { data: historyData, error: historyErr } = await admin
    .from("org_fetch_history_daily")
    .select(
      "org_id, org_name, day, grants_added, error_count, last_error_type, last_error_message, last_error_at, outcome"
    )
    .gte("day", range.from)
    .lte("day", range.to)
    .order("day", { ascending: false })
    .order("grants_added", { ascending: false });

  const history: HistoryRow[] = (historyData ?? []).map((h) => ({
    org_id: h.org_id as string,
    org_name: (h.org_name as string | null) ?? "—",
    day: h.day as string,
    grants_added: Number(h.grants_added ?? 0),
    error_count: Number(h.error_count ?? 0),
    last_error_type: (h.last_error_type as string | null) ?? null,
    last_error_message: (h.last_error_message as string | null) ?? null,
    last_error_at: (h.last_error_at as string | null) ?? null,
    outcome: (h.outcome as HistoryRow["outcome"]) ?? "quiet",
  }));

  return (
    <div className="p-4 sm:p-6">
      <FetchQueueClient
        rows={rows}
        errorMessage={queueErr?.message ?? null}
        history={history}
        historyError={historyErr?.message ?? null}
        filters={{ preset, from: range.from, to: range.to }}
      />
    </div>
  );
}
