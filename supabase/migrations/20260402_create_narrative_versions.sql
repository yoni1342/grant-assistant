-- Store narrative version history
CREATE TABLE IF NOT EXISTS narrative_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  category text,
  tags jsonb,
  version_number int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_narrative_versions_doc ON narrative_versions (document_id, created_at DESC);
