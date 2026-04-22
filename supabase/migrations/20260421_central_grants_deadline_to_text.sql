-- Match the shape of grants.deadline (text) so the two tables hold
-- deadline values the same way. Existing date values are preserved as
-- ISO (YYYY-MM-DD) text. Future ingestion can store raw deadline strings.

DROP INDEX IF EXISTS public.central_grants_deadline_idx;

ALTER TABLE public.central_grants
  ALTER COLUMN deadline TYPE text USING
    CASE WHEN deadline IS NULL THEN NULL ELSE to_char(deadline, 'YYYY-MM-DD') END;

CREATE INDEX central_grants_deadline_idx ON public.central_grants (deadline);
