import type { SupabaseClient } from "@supabase/supabase-js";

// A running workflow_executions row older than this is treated as dead (the
// n8n proposal workflow does not currently mark it `completed`, so without a
// time window one crashed run would lock an org out forever).
const STALE_LOCK_MINUTES = 10;

export const PROPOSAL_IN_FLIGHT_MESSAGE =
  "A proposal is already being generated for your organization. Please wait for it to finish before starting another.";

type BeginResult =
  | { blocked: true; error: string }
  | { blocked: false; workflowId: string };

/**
 * Check whether this org already has a proposal-generation run in flight;
 * if not, claim the slot by inserting a new workflow_executions row.
 *
 * Callers must use this to gate every entry point that triggers the
 * `generate-proposal` n8n workflow (API route, server actions). Under press
 * traffic, a synchronous proposal generation holds Supabase connections for
 * its full duration; without this cap a single org can exhaust the pool.
 */
export async function beginProposalGenerationOrBlock(
  supabase: SupabaseClient,
  orgId: string,
  grantId: string,
): Promise<BeginResult> {
  const cutoff = new Date(
    Date.now() - STALE_LOCK_MINUTES * 60_000,
  ).toISOString();

  const { data: inFlight } = await supabase
    .from("workflow_executions")
    .select("id")
    .eq("org_id", orgId)
    .eq("workflow_name", "generate-proposal")
    .eq("status", "running")
    .gte("created_at", cutoff)
    .limit(1)
    .maybeSingle();

  if (inFlight) {
    return { blocked: true, error: PROPOSAL_IN_FLIGHT_MESSAGE };
  }

  const { data: workflow, error: workflowError } = await supabase
    .from("workflow_executions")
    .insert({
      org_id: orgId,
      grant_id: grantId,
      workflow_name: "generate-proposal",
      status: "running",
      webhook_url: "/webhook/generate-proposal",
    })
    .select("id")
    .single();

  if (workflowError || !workflow) {
    return {
      blocked: true,
      error: "Unable to start proposal generation. Please try again.",
    };
  }

  return { blocked: false, workflowId: workflow.id };
}
