-- org_fetch_schedule rework:
--
-- 1. grants_added_in_run now counts BOTH manual_grants and catalog pickups
--    (grants with central_grant_id). Previously only manual_grants counted,
--    so a run that placed 5 central grants into the org's pipeline displayed
--    "success · 0 grants".
--
-- 2. run_state's "running" detection now uses a liveness heartbeat on the
--    grant_fetch_status table rather than a fragile time-only / pickup-count
--    heuristic. The Process Chunk workflow POSTs a status update on every
--    grant processed, so while it's actively working the updated_at stays
--    fresh. When chunks stop posting (workflow done or crashed), the heart-
--    beat ages out and run_state flips out of 'running' within ~5 min.
--    Accurate for fast (<5 min) and slow (>30 min) workflows alike.

CREATE OR REPLACE VIEW public.org_fetch_schedule
WITH (security_invoker = on) AS
WITH counts AS (
  SELECT COUNT(*)::numeric AS total
    FROM organizations
   WHERE status = 'approved'
),
ranked AS (
  SELECT
    o.id, o.name, o.status, o.last_grant_fetch_at,
    ROW_NUMBER() OVER (
      ORDER BY o.last_grant_fetch_at ASC NULLS FIRST, o.id ASC
    ) AS queue_position
  FROM organizations o
  WHERE o.status = 'approved'
),
sized AS (
  SELECT r.*, GREATEST(CEIL(c.total / 24.0), 1)::numeric AS batch_size
    FROM ranked r CROSS JOIN counts c
),
grants_in_run AS (
  SELECT
    s.id AS org_id,
    (
      SELECT COUNT(*) FROM manual_grants mg
       WHERE mg.org_id = s.id
         AND s.last_grant_fetch_at IS NOT NULL
         AND mg.created_at >= s.last_grant_fetch_at
    )
    +
    (
      SELECT COUNT(*) FROM grants g
       WHERE g.org_id = s.id
         AND g.central_grant_id IS NOT NULL
         AND s.last_grant_fetch_at IS NOT NULL
         AND g.created_at >= s.last_grant_fetch_at
    ) AS grants_added_in_run
  FROM sized s
),
last_err AS (
  SELECT DISTINCT ON (e.org_id)
    e.org_id,
    e.error_message AS last_error_message,
    e.error_type    AS last_error_type,
    e.created_at    AS last_error_at
  FROM n8n_workflow_errors e
  JOIN sized s ON s.id = e.org_id
  WHERE s.last_grant_fetch_at IS NOT NULL
    AND e.created_at >= s.last_grant_fetch_at
  ORDER BY e.org_id, e.created_at DESC
),
heartbeat AS (
  SELECT org_id
    FROM grant_fetch_status
   WHERE updated_at > NOW() - INTERVAL '5 minutes'
)
SELECT
  s.id,
  s.name,
  s.status,
  s.last_grant_fetch_at,
  s.queue_position::int                                   AS queue_position,
  s.batch_size::int                                       AS batch_size,
  CEIL(s.queue_position / s.batch_size)::int              AS hours_until_next_fetch,
  date_trunc('hour', NOW())
    + make_interval(hours => CEIL(s.queue_position / s.batch_size)::int)
                                                          AS estimated_next_fetch_at,
  COALESCE(g.grants_added_in_run, 0)::int                 AS grants_added_in_run,
  le.last_error_message,
  le.last_error_type,
  le.last_error_at,
  CASE
    WHEN s.last_grant_fetch_at IS NULL           THEN 'never'
    WHEN hb.org_id IS NOT NULL                   THEN 'running'
    WHEN le.last_error_at IS NOT NULL            THEN 'failed'
    ELSE 'success'
  END AS run_state
FROM sized s
LEFT JOIN grants_in_run g ON g.org_id = s.id
LEFT JOIN last_err     le ON le.org_id = s.id
LEFT JOIN heartbeat    hb ON hb.org_id = s.id;

GRANT SELECT ON public.org_fetch_schedule TO authenticated, service_role;
