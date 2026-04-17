-- Allow notification_id to be a text string for dedup keys like "pending_approval:<grant_id>"
ALTER TABLE grant_email_log ALTER COLUMN notification_id TYPE TEXT USING notification_id::TEXT;
