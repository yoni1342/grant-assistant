-- Supports the hourly per-org grant-fetch rotation (replaces the single daily
-- fire that triggered every approved org at 01:00 UTC). The n8n "Hourly Org
-- Grant Fetch Scheduler" workflow calls next_org_fetch_batch() once per hour.

-- 1. Per-org timestamp of the last scheduled trigger.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS last_grant_fetch_at timestamptz;

-- 2. Atomic picker: returns ceil(total_approved/24) oldest approved orgs
--    and stamps their last_grant_fetch_at = now() in the same transaction.
--    "FOR UPDATE SKIP LOCKED" makes concurrent calls safe.
CREATE OR REPLACE FUNCTION public.next_org_fetch_batch()
RETURNS TABLE(id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  batch_size int;
BEGIN
  SELECT GREATEST(CEIL(COUNT(*)::numeric / 24), 1)::int
    INTO batch_size
    FROM organizations
   WHERE status = 'approved';

  RETURN QUERY
  WITH picked AS (
    SELECT o.id
      FROM organizations o
     WHERE o.status = 'approved'
     ORDER BY o.last_grant_fetch_at ASC NULLS FIRST, o.id ASC
     LIMIT batch_size
     FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE organizations o
       SET last_grant_fetch_at = NOW()
      FROM picked
     WHERE o.id = picked.id
    RETURNING o.id, o.name
  )
  SELECT u.id, u.name FROM updated u;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_org_fetch_batch() TO service_role;

-- 3. Queue view: each approved org's position, ETA, and last-run summary.
--    Drives both the Org Settings chip and the admin Fetch Queue page.
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
    COUNT(mg.id) AS grants_added_in_run
  FROM sized s
  LEFT JOIN manual_grants mg
    ON mg.org_id = s.id
   AND s.last_grant_fetch_at IS NOT NULL
   AND mg.created_at >= s.last_grant_fetch_at
  GROUP BY s.id
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
    WHEN s.last_grant_fetch_at IS NULL                             THEN 'never'
    WHEN le.last_error_at IS NOT NULL                              THEN 'failed'
    WHEN s.last_grant_fetch_at > NOW() - INTERVAL '30 minutes'
         AND COALESCE(g.grants_added_in_run, 0) = 0                THEN 'running'
    ELSE 'success'
  END AS run_state
FROM sized s
LEFT JOIN grants_in_run g ON g.org_id = s.id
LEFT JOIN last_err     le ON le.org_id = s.id;

GRANT SELECT ON public.org_fetch_schedule TO authenticated, service_role;

-- 4. Per-org, per-day history rollup. Backs the Execution History card on
--    /admin/fetch-queue. Derived from manual_grants + n8n_workflow_errors,
--    so it works retroactively without a dedicated run-log table.
CREATE OR REPLACE VIEW public.org_fetch_history_daily
WITH (security_invoker = on) AS
WITH grant_days AS (
  SELECT
    mg.org_id,
    (mg.created_at AT TIME ZONE 'UTC')::date AS day,
    COUNT(*)::int AS grants_added
  FROM manual_grants mg
  WHERE mg.org_id IS NOT NULL
  GROUP BY mg.org_id, (mg.created_at AT TIME ZONE 'UTC')::date
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
FROM grant_days g
FULL OUTER JOIN error_days ed
  ON ed.org_id = g.org_id AND ed.day = g.day
LEFT JOIN organizations o
  ON o.id = COALESCE(g.org_id, ed.org_id);

GRANT SELECT ON public.org_fetch_history_daily TO authenticated, service_role;
