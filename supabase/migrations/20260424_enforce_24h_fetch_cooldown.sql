-- Enforce a hard 24-hour cooldown between fetches for the same org. With
-- 11 eligible orgs and a batch_size of 1/hour, the rotation otherwise
-- completes in 11 hours and picks each org roughly twice per 24h. The
-- picker now only considers orgs whose last_grant_fetch_at is NULL or at
-- least 24 hours old; the view's ETA is lifted to respect the same floor
-- so the admin page shows "in ~14h" for an org that's only 10h old rather
-- than "in ~1h" (the cron-position estimate).

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
   WHERE status = 'approved'
     AND (plan <> 'free' OR is_tester = true);

  RETURN QUERY
  WITH picked AS (
    SELECT o.id
      FROM organizations o
     WHERE o.status = 'approved'
       AND (o.plan <> 'free' OR o.is_tester = true)
       AND (o.last_grant_fetch_at IS NULL
            OR o.last_grant_fetch_at < NOW() - INTERVAL '24 hours')
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

CREATE OR REPLACE VIEW public.org_fetch_schedule
WITH (security_invoker = on) AS
WITH counts AS (
  SELECT COUNT(*)::numeric AS total
    FROM organizations
   WHERE status = 'approved'
     AND (plan <> 'free' OR is_tester = true)
),
ranked AS (
  SELECT
    o.id, o.name, o.status, o.last_grant_fetch_at,
    ROW_NUMBER() OVER (
      ORDER BY o.last_grant_fetch_at ASC NULLS FIRST, o.id ASC
    ) AS queue_position
  FROM organizations o
  WHERE o.status = 'approved'
    AND (o.plan <> 'free' OR o.is_tester = true)
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
  -- ETA respects BOTH: when the cron reaches this queue position, AND the
  -- 24h cooldown floor (last_grant_fetch_at + 24h). Whichever is later.
  CASE
    WHEN s.last_grant_fetch_at IS NULL THEN
      CEIL(s.queue_position / s.batch_size)::int
    ELSE
      GREATEST(
        CEIL(s.queue_position / s.batch_size)::int,
        CEIL(EXTRACT(EPOCH FROM (s.last_grant_fetch_at + INTERVAL '24 hours' - NOW())) / 3600.0)::int
      )
  END                                                     AS hours_until_next_fetch,
  CASE
    WHEN s.last_grant_fetch_at IS NULL THEN
      date_trunc('hour', NOW())
        + make_interval(hours => CEIL(s.queue_position / s.batch_size)::int)
    ELSE
      GREATEST(
        date_trunc('hour', NOW())
          + make_interval(hours => CEIL(s.queue_position / s.batch_size)::int),
        s.last_grant_fetch_at + INTERVAL '24 hours'
      )
  END                                                     AS estimated_next_fetch_at,
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
