-- Repair the cascade chain so deleting from central_grants cleanly removes
-- per-org pipeline rows, proposals, sections, and email logs.
--
-- Backstory: 2026-04-30 we discovered 2,149 orphaned rows in `grants` (plus
-- 11 orphan proposals, 120 sections, 418 email logs, 1,534 notifications)
-- after deleting bad rows from central_grants. Root cause: the migration
-- 20260421_grants_add_source_refs_and_screening_result.sql declared the
-- central_grant_id FK with `ADD COLUMN IF NOT EXISTS … REFERENCES …`. When
-- the column already existed, IF NOT EXISTS skipped the whole clause —
-- including the FK — leaving an unenforced reference.
--
-- This migration:
--   1. Drops any existing (or missing) FKs by their conventional names.
--   2. Recreates each one with ON DELETE CASCADE so the chain works end-
--      to-end: central_grants → grants → proposals → proposal_sections,
--      and grants → grant_email_log.
--
-- Notifications already has a working CASCADE FK from 20260306_create_
-- notifications.sql, so nothing to do there.
--
-- The grants CHECK constraint requires exactly one of central_grant_id /
-- manual_grant_id, so SET NULL is not an option (it would violate the
-- CHECK). CASCADE is the only safe semantic.

-- 1. central_grants → grants
ALTER TABLE public.grants
  DROP CONSTRAINT IF EXISTS grants_central_grant_id_fkey;
ALTER TABLE public.grants
  ADD CONSTRAINT grants_central_grant_id_fkey
  FOREIGN KEY (central_grant_id) REFERENCES public.central_grants(id)
  ON DELETE CASCADE;

-- 2. grants → proposals
ALTER TABLE public.proposals
  DROP CONSTRAINT IF EXISTS proposals_grant_id_fkey;
ALTER TABLE public.proposals
  ADD CONSTRAINT proposals_grant_id_fkey
  FOREIGN KEY (grant_id) REFERENCES public.grants(id)
  ON DELETE CASCADE;

-- 3. proposals → proposal_sections
ALTER TABLE public.proposal_sections
  DROP CONSTRAINT IF EXISTS proposal_sections_proposal_id_fkey;
ALTER TABLE public.proposal_sections
  ADD CONSTRAINT proposal_sections_proposal_id_fkey
  FOREIGN KEY (proposal_id) REFERENCES public.proposals(id)
  ON DELETE CASCADE;

-- 4. grants → grant_email_log
ALTER TABLE public.grant_email_log
  DROP CONSTRAINT IF EXISTS grant_email_log_grant_id_fkey;
ALTER TABLE public.grant_email_log
  ADD CONSTRAINT grant_email_log_grant_id_fkey
  FOREIGN KEY (grant_id) REFERENCES public.grants(id)
  ON DELETE CASCADE;
