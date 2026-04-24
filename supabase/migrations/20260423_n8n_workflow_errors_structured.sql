-- Structured error attribution for the admin System Errors redesign.
-- Adds org_id (so errors can be filtered per organization), error_type
-- (coarse classification populated by the Error Notification Handler n8n
-- workflow), fingerprint (md5 of workflow+node+type for grouping), and
-- resolved_at (reserved for future "mark handled" UX).

ALTER TABLE n8n_workflow_errors
  ADD COLUMN IF NOT EXISTS org_id      uuid REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS error_type  text,
  ADD COLUMN IF NOT EXISTS fingerprint text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_n8n_workflow_errors_org_id
  ON n8n_workflow_errors (org_id);
CREATE INDEX IF NOT EXISTS idx_n8n_workflow_errors_fingerprint
  ON n8n_workflow_errors (fingerprint);
CREATE INDEX IF NOT EXISTS idx_n8n_workflow_errors_workflow_created
  ON n8n_workflow_errors (workflow_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_n8n_workflow_errors_type
  ON n8n_workflow_errors (error_type);

-- Grouped rollup: one row per fingerprint with counts, affected orgs, and
-- first/last occurrence. Backs the Grouped view on /admin/system-errors.
-- Legacy rows (fingerprint IS NULL) collapse under a synthetic
-- "legacy:<md5(workflow+node)>" key so they still group meaningfully.
CREATE OR REPLACE VIEW public.n8n_workflow_errors_grouped
WITH (security_invoker = on) AS
SELECT
  COALESCE(e.fingerprint, 'legacy:' || md5(COALESCE(e.workflow_name,'') || ':' || COALESCE(e.failed_node,''))) AS fingerprint,
  MIN(e.workflow_name) AS workflow_name,
  MIN(e.failed_node)   AS failed_node,
  MIN(COALESCE(e.error_type, 'unknown')) AS error_type,
  COUNT(*)::int        AS occurrences,
  COUNT(DISTINCT e.org_id) FILTER (WHERE e.org_id IS NOT NULL)::int AS affected_org_count,
  array_agg(DISTINCT e.org_id) FILTER (WHERE e.org_id IS NOT NULL)  AS org_ids,
  MAX(e.created_at)    AS last_seen_at,
  MIN(e.created_at)    AS first_seen_at,
  MAX(e.error_message) AS sample_message,
  MAX(e.execution_url) AS sample_execution_url,
  BOOL_AND(e.resolved_at IS NOT NULL) AS resolved
FROM n8n_workflow_errors e
GROUP BY COALESCE(e.fingerprint, 'legacy:' || md5(COALESCE(e.workflow_name,'') || ':' || COALESCE(e.failed_node,'')));

GRANT SELECT ON public.n8n_workflow_errors_grouped TO authenticated, service_role;
