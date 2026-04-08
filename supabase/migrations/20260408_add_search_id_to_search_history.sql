-- Link search_history entries to their search_results via search_id
ALTER TABLE search_history ADD COLUMN IF NOT EXISTS search_id text;

CREATE INDEX IF NOT EXISTS idx_search_history_search_id ON search_history (search_id);
