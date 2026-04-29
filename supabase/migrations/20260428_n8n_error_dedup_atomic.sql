-- Atomic dedup for the n8n Error Notification Handler.
--
-- The handler used to do a SELECT-then-INSERT against n8n_workflow_errors to
-- decide "have we already alerted on this fingerprint in the last 10 min?"
-- That races: when 100+ Process-Chunk webhooks fail in the same second
-- (e.g. shared OpenAI 429), every error trigger reads priorCount=0 before
-- any has inserted, so all of them post to Slack.
--
-- Replace it with a per-fingerprint lock row. n8n_error_dedup_acquire() does
-- an INSERT ... ON CONFLICT DO UPDATE ... WHERE expires_at < NOW() RETURNING.
-- The conditional UPDATE means: row-level lock is held until expiry, only one
-- caller's RETURNING gets a row, the rest get NULL. Atomic, single round-trip.

CREATE TABLE IF NOT EXISTS public.n8n_error_dedup_locks (
  fingerprint TEXT PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS n8n_error_dedup_locks_expires_at_idx
  ON public.n8n_error_dedup_locks (expires_at);

CREATE OR REPLACE FUNCTION public.n8n_error_dedup_acquire(
  p_fingerprint     TEXT,
  p_window_minutes  INT DEFAULT 10
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acquired BOOLEAN;
BEGIN
  INSERT INTO public.n8n_error_dedup_locks(fingerprint, expires_at, acquired_at)
  VALUES (
    p_fingerprint,
    NOW() + make_interval(mins => p_window_minutes),
    NOW()
  )
  ON CONFLICT (fingerprint) DO UPDATE
    SET expires_at  = EXCLUDED.expires_at,
        acquired_at = EXCLUDED.acquired_at
    WHERE public.n8n_error_dedup_locks.expires_at < NOW()
  RETURNING TRUE INTO acquired;

  RETURN COALESCE(acquired, FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.n8n_error_dedup_acquire(TEXT, INT)
  TO service_role, authenticated, anon;
