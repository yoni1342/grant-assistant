-- Track grant eligible emails to avoid duplicate sends
CREATE TABLE IF NOT EXISTS grant_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  grant_id UUID NOT NULL,
  sent_to TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(notification_id)
);

CREATE INDEX idx_grant_email_log_notification_id ON grant_email_log(notification_id);
