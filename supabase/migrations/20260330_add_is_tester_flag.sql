-- Add is_tester flag to organizations for pilot testers who bypass payment requirements.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_tester BOOLEAN NOT NULL DEFAULT false;

-- Update the daily grant limit trigger to skip enforcement for testers
CREATE OR REPLACE FUNCTION check_daily_grant_limit()
RETURNS TRIGGER AS $$
DECLARE
  org_plan TEXT;
  org_is_tester BOOLEAN;
  daily_count INT;
  daily_limit INT := 1;
BEGIN
  -- Look up the organization's plan and tester status
  SELECT plan, is_tester INTO org_plan, org_is_tester
  FROM organizations
  WHERE id = NEW.org_id;

  -- Skip limit for testers
  IF org_is_tester THEN
    RETURN NEW;
  END IF;

  -- Only enforce limit for free-tier orgs
  IF org_plan = 'free' THEN
    SELECT COUNT(*) INTO daily_count
    FROM grants
    WHERE org_id = NEW.org_id
      AND created_at >= DATE_TRUNC('day', NOW())
      AND created_at < DATE_TRUNC('day', NOW()) + INTERVAL '1 day';

    IF daily_count >= daily_limit THEN
      RAISE EXCEPTION 'Daily grant limit reached. Free plan allows % grant per day. Upgrade to Professional for unlimited grants.', daily_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
