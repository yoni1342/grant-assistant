-- Add "archived" value to the grant_stage enum
ALTER TYPE grant_stage ADD VALUE IF NOT EXISTS 'archived';
