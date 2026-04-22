-- Backfill the new FK columns for every existing row in `grants`.
-- After this migration every grant has exactly one of central_grant_id
-- or manual_grant_id set; the CHECK constraint in the next migration
-- enforces that going forward.

-- Step 1: link grants whose (source, source_id) matches a central_grants row.
UPDATE public.grants g
SET central_grant_id = c.id
FROM public.central_grants c
WHERE g.central_grant_id IS NULL
  AND g.source IS NOT NULL
  AND g.source_id IS NOT NULL
  AND g.source = c.source
  AND g.source_id = c.source_id;

-- Step 2: fallback — link by (source, source_url) when no source_id present.
UPDATE public.grants g
SET central_grant_id = c.id
FROM public.central_grants c
WHERE g.central_grant_id IS NULL
  AND g.source IS NOT NULL
  AND g.source_id IS NULL
  AND g.source_url IS NOT NULL
  AND g.source = c.source
  AND g.source_url = c.source_url;

-- Step 3: the remaining unmatched rows are per-org scanner-originated
-- grants that never made it to the central catalog. Move each to
-- manual_grants and link via manual_grant_id, preserving ownership and
-- history.
DO $$
DECLARE
  r RECORD;
  new_id uuid;
BEGIN
  FOR r IN
    SELECT id, org_id, title, funder_name, organization, amount, deadline,
           description, eligibility, categories, metadata, source_url,
           created_at, updated_at
    FROM public.grants
    WHERE central_grant_id IS NULL AND manual_grant_id IS NULL
  LOOP
    INSERT INTO public.manual_grants (
      org_id, title, funder_name, organization, amount, deadline,
      description, eligibility, categories, metadata, source_url,
      created_at, updated_at
    ) VALUES (
      r.org_id,
      COALESCE(NULLIF(trim(r.title), ''), '(untitled grant)'),
      r.funder_name, r.organization, r.amount, r.deadline,
      r.description, r.eligibility, r.categories, r.metadata, r.source_url,
      r.created_at, r.updated_at
    )
    RETURNING id INTO new_id;

    UPDATE public.grants SET manual_grant_id = new_id WHERE id = r.id;
  END LOOP;
END $$;

-- Step 4: copy eligibility → screening_result for grants that have been
-- screened. Unscreened grants have raw scraped criteria in `eligibility`,
-- which already lives in central_grants/manual_grants — no need to copy.
UPDATE public.grants
SET screening_result = eligibility
WHERE screening_score IS NOT NULL
  AND eligibility IS NOT NULL
  AND screening_result IS NULL;
