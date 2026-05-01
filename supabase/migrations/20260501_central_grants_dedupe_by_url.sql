-- Switch central_grants dedupe key from (source, source_url) to
-- (source_url, title_norm). The old key let multi-source scrapes of the
-- same grant (Grants.gov + Grantivia + scanner) all create their own row.
-- The new key catches them — but adding `title_norm` to the key also
-- means we don't accidentally collapse unrelated CFNJ-style grants that
-- happen to share a generic landing-page URL.
--
-- Prereq: scripts/dedupe-central-grants-by-url.ts must have been run with
-- --execute first. The unique-index creation will fail otherwise.

-- 1. Clean up `source` for rows where the n8n scanner stored a JSON blob
--    instead of a plain string. Each scrape run got a unique `analyzedAt`,
--    so the same grant looked like a "new source" every day. Collapse
--    them all to "Scanner" — a clean string that dedupes properly. The
--    ingest endpoint applies the same normalization for new rows.
UPDATE public.central_grants
SET source = 'Scanner'
WHERE source LIKE '{%"type":"scanner"%';

-- 2. New normalized-title column. Populated by the ingest endpoint going
--    forward; backfilled here for existing rows.
ALTER TABLE public.central_grants
  ADD COLUMN IF NOT EXISTS title_norm text;

-- Backfill: same normalization the ingest endpoint applies in JS —
-- decode common HTML entities, collapse whitespace, lowercase, trim.
UPDATE public.central_grants
SET title_norm = lower(btrim(regexp_replace(
  replace(replace(replace(replace(replace(replace(title,
    '&amp;', '&'),
    '&nbsp;', ' '),
    '&quot;', '"'),
    '&#39;', ''''),
    '&lt;', '<'),
    '&gt;', '>'),
  '\s+', ' ', 'g')))
WHERE title_norm IS NULL;

-- 3. Drop the old partial unique index on (source, source_url) — it's
--    being replaced by a stronger index that doesn't include `source`.
DROP INDEX IF EXISTS public.central_grants_source_source_url_key;

-- 4. New unique index. Excludes rows with no URL or no title_norm so the
--    (source, source_id) fallback path (rows without a usable URL) still
--    works.
CREATE UNIQUE INDEX IF NOT EXISTS central_grants_url_title_norm_key
  ON public.central_grants (source_url, title_norm)
  WHERE source_url IS NOT NULL AND title_norm IS NOT NULL;
