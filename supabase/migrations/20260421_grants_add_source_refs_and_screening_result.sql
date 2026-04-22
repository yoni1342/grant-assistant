-- Add FK columns that point at either the catalog row (central_grants)
-- or a per-org manual row (manual_grants). Exactly one of the two will
-- be non-null per grant — the CHECK constraint is added in a later
-- migration (after backfill).
--
-- screening_result holds the AI screening output (dimension_scores,
-- confidence, data_quality). This replaces the semantic-collision use
-- of the `eligibility` column, which currently flips from "scraped
-- criteria" to "screening result" after screening runs.

ALTER TABLE public.grants
  ADD COLUMN IF NOT EXISTS central_grant_id uuid REFERENCES public.central_grants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manual_grant_id uuid REFERENCES public.manual_grants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS screening_result jsonb;

CREATE INDEX IF NOT EXISTS grants_central_grant_id_idx ON public.grants (central_grant_id);
CREATE INDEX IF NOT EXISTS grants_manual_grant_id_idx ON public.grants (manual_grant_id);
