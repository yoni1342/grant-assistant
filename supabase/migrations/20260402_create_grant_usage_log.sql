-- Track every grant addition for accurate daily usage counting.
-- Unlike counting the grants table, this is not affected by deletes or archives.
CREATE TABLE IF NOT EXISTS grant_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_grant_usage_log_org_date ON grant_usage_log (org_id, created_at);
