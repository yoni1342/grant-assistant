-- Replace the partial unique index on (org_id, central_grant_id) with a
-- full (non-partial) one so PostgREST's ?on_conflict=org_id,central_grant_id
-- can match it. Postgres treats each NULL as distinct for unique indexes,
-- so manual_grants rows (central_grant_id IS NULL) retain the same
-- allow-dupes behavior they had under the partial index — no behavioral
-- change for reads, just makes the index targetable by PostgREST's
-- on_conflict URL param.
--
-- Context: n8n's Process Chunk workflow inserts into `grants` with
-- ?on_conflict=org_id,central_grant_id + Prefer: resolution=ignore-duplicates
-- so repeated fetches idempotently no-op on already-picked grants. The
-- partial form (WHERE central_grant_id IS NOT NULL) is not accepted by
-- Postgres's ON CONFLICT target clause without a matching WHERE predicate.

DROP INDEX IF EXISTS public.grants_org_central_unique;

CREATE UNIQUE INDEX grants_org_central_unique
  ON public.grants (org_id, central_grant_id);
