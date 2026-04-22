-- Require exactly one of (central_grant_id, manual_grant_id) per grant.
-- A pipeline row always points to exactly one source: catalog or manual.
ALTER TABLE public.grants
  ADD CONSTRAINT grants_exactly_one_source_ref
  CHECK (
    (central_grant_id IS NOT NULL AND manual_grant_id IS NULL)
    OR (central_grant_id IS NULL AND manual_grant_id IS NOT NULL)
  );

-- Loosen the legacy NOT NULL + non-empty check on `grants.title` so new
-- inserts can omit it (title now lives on central_grants/manual_grants).
-- The old title column is kept for the transition period while n8n is
-- still writing to it; it will be dropped in Phase 3.
ALTER TABLE public.grants ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.grants DROP CONSTRAINT IF EXISTS grants_title_check;
ALTER TABLE public.grants
  ADD CONSTRAINT grants_title_check
  CHECK (title IS NULL OR trim(title) <> '');

-- A view that resolves each grant's catalog/manual fields via the FKs,
-- so application code can read the full shape (title, funder_name,
-- amount, deadline, etc.) without knowing which source table to join.
--
-- During the transition, the COALESCE also falls back to the grants
-- row's own legacy columns so reads still work while n8n continues
-- writing to them. Those fallbacks will be removed in Phase 3.
CREATE OR REPLACE VIEW public.grants_full
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
  COALESCE(c.title,         m.title,         g.title)         AS title,
  COALESCE(c.funder_name,   m.funder_name,   g.funder_name)   AS funder_name,
  COALESCE(c.organization,  m.organization,  g.organization)  AS organization,
  COALESCE(c.amount,        m.amount,        g.amount)        AS amount,
  COALESCE(c.deadline,      m.deadline,      g.deadline)      AS deadline,
  COALESCE(c.description,   m.description,   g.description)   AS description,
  COALESCE(c.eligibility,   m.eligibility,   g.eligibility)   AS eligibility,
  COALESCE(c.categories,    m.categories,    g.categories)    AS categories,
  COALESCE(c.source_url,    m.source_url,    g.source_url)    AS source_url,
  COALESCE(c.source, g.source) AS source,
  COALESCE(c.source_id, g.source_id) AS source_id
FROM public.grants g
LEFT JOIN public.central_grants c ON c.id = g.central_grant_id
LEFT JOIN public.manual_grants  m ON m.id = g.manual_grant_id;

GRANT SELECT ON public.grants_full TO authenticated;
