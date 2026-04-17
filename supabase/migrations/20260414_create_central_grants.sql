-- Central grant catalog: a single, deduped store of all grants scraped
-- from external sources. Replaces the old per-org scraping flow where
-- each organization independently re-fetched grants from every source.
--
-- Daily workflow upserts new grants here. Org pipelines (`grants` table)
-- are seeded by copying matching rows from this table, and the Discovery
-- page searches this table directly instead of triggering a workflow.

CREATE TABLE IF NOT EXISTS public.central_grants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  funder_name text,
  organization text,
  amount text,
  deadline date,
  description text,
  eligibility jsonb,
  categories jsonb,
  metadata jsonb,
  source text NOT NULL,
  source_id text,
  source_url text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT central_grants_dedupe_key_present
    CHECK (source_id IS NOT NULL OR source_url IS NOT NULL)
);

-- Dedupe: prefer (source, source_id); fall back to (source, source_url).
CREATE UNIQUE INDEX IF NOT EXISTS central_grants_source_source_id_key
  ON public.central_grants (source, source_id)
  WHERE source_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS central_grants_source_source_url_key
  ON public.central_grants (source, source_url)
  WHERE source_id IS NULL AND source_url IS NOT NULL;

-- Search / filter indexes for the Discovery page.
CREATE INDEX IF NOT EXISTS central_grants_deadline_idx
  ON public.central_grants (deadline);
CREATE INDEX IF NOT EXISTS central_grants_source_idx
  ON public.central_grants (source);
CREATE INDEX IF NOT EXISTS central_grants_last_seen_idx
  ON public.central_grants (last_seen_at DESC);

-- Full-text search across title, funder, description.
CREATE INDEX IF NOT EXISTS central_grants_search_idx
  ON public.central_grants
  USING gin (to_tsvector('english',
    coalesce(title, '') || ' ' ||
    coalesce(funder_name, '') || ' ' ||
    coalesce(description, '')
  ));

-- Trigger to keep updated_at fresh.
CREATE OR REPLACE FUNCTION public.touch_central_grants_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS central_grants_touch_updated_at ON public.central_grants;
CREATE TRIGGER central_grants_touch_updated_at
  BEFORE UPDATE ON public.central_grants
  FOR EACH ROW EXECUTE FUNCTION public.touch_central_grants_updated_at();

-- RLS: any authenticated user can read the catalog (org-agnostic).
-- Writes go through the service role from the n8n webhook.
ALTER TABLE public.central_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read central grants"
  ON public.central_grants FOR SELECT
  TO authenticated
  USING (true);

-- Backfill from existing per-org grants so the catalog starts complete.
-- DISTINCT ON collapses duplicate copies (the same grant living under
-- multiple orgs) down to a single canonical row — keeping the most
-- recently updated copy. Rows without any dedupe key (no source_id and
-- no source_url) are skipped because the catalog can't store them
-- safely. The per-org `grants` table is NOT modified — this is a copy.
INSERT INTO public.central_grants (
  title, funder_name, organization, amount, deadline, description,
  eligibility, categories, metadata, source, source_id, source_url,
  first_seen_at, last_seen_at
)
SELECT DISTINCT ON (coalesce(source, ''), coalesce(source_id, source_url))
  title,
  funder_name,
  organization,
  amount,
  CASE
    WHEN deadline ~ '^\d{4}-\d{2}-\d{2}' THEN deadline::date
    ELSE NULL
  END AS deadline,
  description,
  eligibility,
  categories,
  metadata,
  source,
  source_id,
  source_url,
  coalesce(created_at, now()) AS first_seen_at,
  coalesce(updated_at, created_at, now()) AS last_seen_at
FROM public.grants
WHERE source IS NOT NULL
  AND (source_id IS NOT NULL OR source_url IS NOT NULL)
ORDER BY
  coalesce(source, ''),
  coalesce(source_id, source_url),
  coalesce(updated_at, created_at, now()) DESC
ON CONFLICT DO NOTHING;
