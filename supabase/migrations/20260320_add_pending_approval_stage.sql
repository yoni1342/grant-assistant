-- Add pending_approval to grant_stage enum
ALTER TYPE grant_stage ADD VALUE IF NOT EXISTS 'pending_approval' AFTER 'screening';
