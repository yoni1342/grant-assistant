-- Block reference databases (USAspending.gov, ProPublica /nonprofits) from
-- being inserted into central_grants. These URLs are historical award records
-- or 990 tax filings, not open grant opportunities.
--
-- The n8n "Centralized Scheduled Grant fetch" workflow has an in-code filter,
-- but it writes directly to the Supabase REST API and bypasses our /api/
-- ingest route. On 2026-04-30 04:00 UTC the workflow ran with a stale (pre-
-- filter) snapshot and inserted 2,468 USAspending rows — see today's cleanup.
--
-- This CHECK constraint enforces the rule at the database level so no future
-- code path (workflow, API, manual SQL) can re-introduce the bad data.

ALTER TABLE public.central_grants
  ADD CONSTRAINT central_grants_no_reference_dbs
  CHECK (
    source_url IS NULL
    OR (
      source_url !~* 'usaspending\.gov'
      AND source_url !~* 'projects\.propublica\.org/nonprofits'
    )
  );
