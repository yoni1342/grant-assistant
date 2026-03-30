-- Enforce 1 grant/day limit for free-tier organizations at the database level.
-- Professional and agency plans are unrestricted.

CREATE OR REPLACE FUNCTION check_daily_grant_limit()
RETURNS TRIGGER AS $$
DECLARE
  org_plan TEXT;
  daily_count INT;
  daily_limit INT := 1;
BEGIN
  -- Look up the organization's plan
  SELECT plan INTO org_plan
  FROM organizations
  WHERE id = NEW.org_id;

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

-- Drop old trigger and function
DROP TRIGGER IF EXISTS enforce_monthly_grant_limit ON grants;
DROP FUNCTION IF EXISTS check_monthly_grant_limit();

-- Create new trigger
DROP TRIGGER IF EXISTS enforce_daily_grant_limit ON grants;
CREATE TRIGGER enforce_daily_grant_limit
  BEFORE INSERT ON grants
  FOR EACH ROW
  EXECUTE FUNCTION check_daily_grant_limit();
