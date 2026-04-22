-- Phase 3 of the grants/central_grants/manual_grants refactor: remove the
-- legacy columns from `grants` that now live on central_grants (for
-- catalog-sourced rows) or manual_grants (for per-org manual rows).
--
-- Preconditions verified before running:
--   * Every `grants` row has exactly one of central_grant_id / manual_grant_id
--     set (enforced by the grants_exactly_one_source_ref CHECK constraint
--     added in 20260421_grants_check_and_full_view.sql).
--   * Every app read path uses the `grants_full` view for denormalized fields.
--   * Every app/n8n write path only writes pipeline-local fields on grants
--     (stage, screening_score, screening_notes, screening_result, concerns,
--     recommendations, metadata).
--
-- Columns being dropped (11):
--   title, funder_name, description, amount, deadline, source, source_id,
--   source_url, categories, eligibility, organization

-- Step 1: Recreate `grants_full` without the g.* fallbacks. The view must
-- be replaced first — if we drop the columns while the view still references
-- them, the DROP fails.
DROP VIEW IF EXISTS public.grants_full;

CREATE VIEW public.grants_full
WITH (security_invoker = true) AS
SELECT
  g.id,
  g.org_id,
  g.central_grant_id,
  g.manual_grant_id,
  g.stage,
  g.screening_score,
  g.screening_notes,
  g.screening_result,
  g.concerns,
  g.recommendations,
  g.metadata,
  g.created_at,
  g.updated_at,
  CASE WHEN g.central_grant_id IS NOT NULL THEN 'catalog' ELSE 'manual' END AS source_type,
  COALESCE(c.title,        m.title)        AS title,
  COALESCE(c.funder_name,  m.funder_name)  AS funder_name,
  COALESCE(c.organization, m.organization) AS organization,
  COALESCE(c.amount,       m.amount)       AS amount,
  COALESCE(c.deadline,     m.deadline)     AS deadline,
  COALESCE(c.description,  m.description)  AS description,
  COALESCE(c.eligibility,  m.eligibility)  AS eligibility,
  COALESCE(c.categories,   m.categories)   AS categories,
  COALESCE(c.source_url,   m.source_url)   AS source_url,
  c.source    AS source,
  c.source_id AS source_id
FROM public.grants g
LEFT JOIN public.central_grants c ON c.id = g.central_grant_id
LEFT JOIN public.manual_grants  m ON m.id = g.manual_grant_id;

GRANT SELECT ON public.grants_full TO authenticated;

-- Step 2: Drop the legacy constraint on `title` (no longer a grants column).
ALTER TABLE public.grants DROP CONSTRAINT IF EXISTS grants_title_check;

-- Step 3: Drop the columns. DROP COLUMN cascades to indexes that
-- reference only the dropped column — so idx_grants_deadline and the
-- composite UNIQUE (org_id, source_id) index go away automatically.
ALTER TABLE public.grants
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS funder_name,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS amount,
  DROP COLUMN IF EXISTS deadline,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS source_id,
  DROP COLUMN IF EXISTS source_url,
  DROP COLUMN IF EXISTS categories,
  DROP COLUMN IF EXISTS eligibility,
  DROP COLUMN IF EXISTS organization;

-- Step 4: Re-add the uniqueness guarantees that the old composite index
-- used to provide — but now keyed on the FK columns.
--   * An org should have at most one pipeline row per catalog grant.
--   * A manual_grants row should be referenced by at most one grants row
--     (they're a 1:1 pair created together).
CREATE UNIQUE INDEX IF NOT EXISTS grants_org_central_unique
  ON public.grants (org_id, central_grant_id)
  WHERE central_grant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS grants_manual_unique
  ON public.grants (manual_grant_id)
  WHERE manual_grant_id IS NOT NULL;
