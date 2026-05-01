-- Persist filters used for each saved search so the discovery page can show
-- which filters a previous search used (and re-apply them on click).
ALTER TABLE search_history
  ADD COLUMN IF NOT EXISTS filters jsonb;
