-- Set plan to 'agency' for all organizations managed by an agency
-- that currently have 'professional' plan
UPDATE organizations
SET plan = 'agency'
WHERE agency_id IS NOT NULL
  AND plan = 'professional';
