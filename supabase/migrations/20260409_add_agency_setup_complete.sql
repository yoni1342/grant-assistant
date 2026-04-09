-- Add setup_complete flag to agencies table
-- Defaults to true so existing agencies are unaffected
-- Set to false when an agency is created via admin tester toggle (needs user to fill info)
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS setup_complete BOOLEAN DEFAULT true;
