-- Track profile completion reminder emails to avoid duplicate sends
CREATE TABLE IF NOT EXISTS profile_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reminder_day INTEGER NOT NULL, -- 3, 7, or 14
  sent_to TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, reminder_day)
);

-- Index for fast lookup by org
CREATE INDEX idx_profile_reminder_log_org_id ON profile_reminder_log(org_id);
