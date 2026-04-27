-- org_fetch_history_daily: count BOTH manual_grants AND catalog pickups
-- (rows in `grants` with central_grant_id) per org per day. The previous
-- view only counted manual_grants, which made the admin Fetch Queue's
-- Execution History tab miss virtually every fetch — the org-fetch
-- workflow writes pickups into `grants`, not `manual_grants`. Same bug
-- pattern as the now-fixed grants_added_in_run in org_fetch_schedule.

CREATE OR REPLACE VIEW public.org_fetch_history_daily
WITH (security_invoker = on) AS
WITH grant_days AS (
  -- manual_grants — direct AI search results
  SELECT
    mg.org_id,
    (mg.created_at AT TIME ZONE 'UTC')::date AS day,
    COUNT(*)::int AS grants_added
  FROM manual_grants mg
  WHERE mg.org_id IS NOT NULL
  GROUP BY mg.org_id, (mg.created_at AT TIME ZONE 'UTC')::date

  UNION ALL

  -- catalog pickups — rows in `grants` sourced from central_grants
  SELECT
    g.org_id,
    (g.created_at AT TIME ZONE 'UTC')::date AS day,
    COUNT(*)::int AS grants_added
  FROM grants g
  WHERE g.org_id IS NOT NULL
    AND g.central_grant_id IS NOT NULL
  GROUP BY g.org_id, (g.created_at AT TIME ZONE 'UTC')::date
),
grants_summed AS (
  SELECT org_id, day, SUM(grants_added)::int AS grants_added
  FROM grant_days
  GROUP BY org_id, day
),
error_days AS (
  SELECT
    e.org_id,
    (e.created_at AT TIME ZONE 'UTC')::date AS day,
    COUNT(*)::int AS error_count,
    (array_agg(COALESCE(e.error_type, 'unknown') ORDER BY e.created_at DESC))[1] AS last_error_type,
    (array_agg(e.error_message ORDER BY e.created_at DESC))[1] AS last_error_message,
    MAX(e.created_at) AS last_error_at
  FROM n8n_workflow_errors e
  WHERE e.org_id IS NOT NULL
  GROUP BY e.org_id, (e.created_at AT TIME ZONE 'UTC')::date
)
SELECT
  COALESCE(g.org_id, ed.org_id)           AS org_id,
  o.name                                  AS org_name,
  COALESCE(g.day, ed.day)                 AS day,
  COALESCE(g.grants_added, 0)             AS grants_added,
  COALESCE(ed.error_count, 0)             AS error_count,
  ed.last_error_type,
  ed.last_error_message,
  ed.last_error_at,
  CASE
    WHEN ed.error_count IS NOT NULL AND ed.error_count > 0 THEN 'failed'
    WHEN COALESCE(g.grants_added, 0) > 0                   THEN 'success'
    ELSE 'quiet'
  END AS outcome
FROM grants_summed g
FULL OUTER JOIN error_days ed
  ON ed.org_id = g.org_id AND ed.day = g.day
LEFT JOIN organizations o
  ON o.id = COALESCE(g.org_id, ed.org_id);

GRANT SELECT ON public.org_fetch_history_daily TO authenticated, service_role;
