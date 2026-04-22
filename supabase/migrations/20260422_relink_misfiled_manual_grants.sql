-- Fixup: many grants rows were backfilled into `manual_grants` during
-- 20260421_grants_backfill_source_refs.sql because the (source, source_id)
-- match to `central_grants` failed — typically due to scraper-label mismatches
-- (legacy grants.source = "Manual Entry by ..." while central_grants.source
-- was "Grants.gov" or "Grantivia").
--
-- For any manual_grants row whose `source_url` matches a catalog row, re-link
-- the pipeline row's FK back to central_grant_id and delete the orphan
-- manual_grants row.
--
-- Two conflict classes are resolved inline:
--   (A) Same org has two misfiled pipeline rows that would both resolve to
--       the same central_grants row — keep the older row, delete the newer.
--   (B) Org already has a pre-existing catalog-linked row AND a misfiled
--       manual row for the same grant — keep the existing catalog, delete
--       the misfiled manual row entirely.

BEGIN;

-- Resolve each misfiled grant to its best central_grants match. Prefer
-- source='Grants.gov' over 'Grantivia' (canonical), else earliest first_seen_at.
CREATE TEMP TABLE relink_candidates AS
SELECT DISTINCT ON (g.id)
  g.id AS grant_id,
  g.org_id,
  g.manual_grant_id,
  g.created_at,
  c.id AS target_central_id
FROM grants g
JOIN manual_grants m ON m.id = g.manual_grant_id
JOIN central_grants c
  ON c.source_url IS NOT NULL
  AND m.source_url IS NOT NULL
  AND c.source_url = m.source_url
ORDER BY g.id,
         CASE WHEN c.source = 'Grants.gov' THEN 0 ELSE 1 END,
         c.first_seen_at;

-- (B) Drop candidates whose (org_id, target_central_id) already exists in
-- grants with a catalog FK — the pre-existing catalog row wins.
CREATE TEMP TABLE relink_conflicts_preexisting AS
SELECT rc.grant_id, rc.manual_grant_id
FROM relink_candidates rc
WHERE EXISTS (
  SELECT 1 FROM grants g2
  WHERE g2.org_id = rc.org_id
    AND g2.central_grant_id = rc.target_central_id
);

-- (A) Within the remaining candidates, dedupe by (org_id, target_central_id):
-- keep the earliest-created pipeline row.
CREATE TEMP TABLE relink_winners AS
SELECT DISTINCT ON (rc.org_id, rc.target_central_id)
  rc.grant_id, rc.org_id, rc.manual_grant_id, rc.target_central_id
FROM relink_candidates rc
WHERE NOT EXISTS (
  SELECT 1 FROM relink_conflicts_preexisting p WHERE p.grant_id = rc.grant_id
)
ORDER BY rc.org_id, rc.target_central_id, rc.created_at;

CREATE TEMP TABLE relink_conflicts_intra AS
SELECT rc.grant_id, rc.manual_grant_id
FROM relink_candidates rc
WHERE NOT EXISTS (
  SELECT 1 FROM relink_conflicts_preexisting p WHERE p.grant_id = rc.grant_id
)
AND NOT EXISTS (
  SELECT 1 FROM relink_winners w WHERE w.grant_id = rc.grant_id
);

-- Delete the duplicate pipeline rows (both conflict classes) and their
-- orphan manual_grants. Must delete grants first because grants.manual_grant_id
-- references manual_grants with ON DELETE CASCADE — deleting the parent
-- would take the pipeline row with it, but we want to be explicit.
DELETE FROM grants WHERE id IN (
  SELECT grant_id FROM relink_conflicts_preexisting
  UNION ALL SELECT grant_id FROM relink_conflicts_intra
);

DELETE FROM manual_grants WHERE id IN (
  SELECT manual_grant_id FROM relink_conflicts_preexisting
  UNION ALL SELECT manual_grant_id FROM relink_conflicts_intra
);

-- Flip the winners. Both columns updated in one statement so the
-- grants_exactly_one_source_ref CHECK stays satisfied at statement end.
UPDATE grants g
SET central_grant_id = w.target_central_id,
    manual_grant_id = NULL
FROM relink_winners w
WHERE g.id = w.grant_id;

-- Delete the now-orphan manual_grants rows.
DELETE FROM manual_grants
WHERE id IN (SELECT manual_grant_id FROM relink_winners);

DROP TABLE relink_candidates;
DROP TABLE relink_winners;
DROP TABLE relink_conflicts_preexisting;
DROP TABLE relink_conflicts_intra;

COMMIT;
