-- Add "suspended" to the org_status enum so agencies can suspend client organizations
ALTER TYPE org_status ADD VALUE IF NOT EXISTS 'suspended';
