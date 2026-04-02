-- Store recent search queries per org for Discovery page
CREATE TABLE IF NOT EXISTS search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  query text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_history_org_date ON search_history (org_id, created_at DESC);

-- Keep only the 8 most recent per org via a trigger
CREATE OR REPLACE FUNCTION trim_search_history() RETURNS trigger AS $$
BEGIN
  DELETE FROM search_history
  WHERE id IN (
    SELECT id FROM search_history
    WHERE org_id = NEW.org_id
    ORDER BY created_at DESC
    OFFSET 8
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trim_search_history
  AFTER INSERT ON search_history
  FOR EACH ROW EXECUTE FUNCTION trim_search_history();
