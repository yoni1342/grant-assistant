-- Log of n8n workflow failures forwarded by the Error Notification Handler workflow.
-- Populated by n8n via the "Supabase account" credential (service role).
-- Read-only surface in the admin panel at /admin/system-errors.

CREATE TABLE IF NOT EXISTS n8n_workflow_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name TEXT,
  failed_node TEXT,
  execution_id TEXT,
  execution_mode TEXT,
  error_message TEXT,
  execution_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_n8n_workflow_errors_created_at ON n8n_workflow_errors(created_at DESC);
CREATE INDEX idx_n8n_workflow_errors_workflow_name ON n8n_workflow_errors(workflow_name);

ALTER TABLE n8n_workflow_errors ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read. Service role bypasses RLS and handles inserts from n8n.
CREATE POLICY "Platform admins can read n8n_workflow_errors"
  ON n8n_workflow_errors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_platform_admin = true
    )
  );
