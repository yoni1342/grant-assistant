import { createClient } from "@/lib/supabase/server";
import { SystemErrorsClient } from "./system-errors-client";

export const dynamic = "force-dynamic";

function countLast24h(errors: { created_at: string }[]): number {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return errors.filter((e) => new Date(e.created_at).getTime() >= cutoff).length;
}

export default async function SystemErrorsPage() {
  const supabase = await createClient();

  const { data: errors } = await supabase
    .from("n8n_workflow_errors")
    .select("id, workflow_name, failed_node, execution_id, execution_mode, error_message, execution_url, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="p-4 sm:p-6">
      <SystemErrorsClient errors={errors || []} last24h={countLast24h(errors || [])} />
    </div>
  );
}
