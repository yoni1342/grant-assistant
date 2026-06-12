-- External API access.
--
-- Lets a third-party platform read ONE organization's data over /api/v1/*.
-- The trust model is "org-scoped API keys":
--   * Only a logged-in owner/admin of an org can mint a key (proof of identity
--     happens inside Fundory, via the authenticated session).
--   * Each key is permanently bound to a single org_id. The external caller
--     never supplies an org id for data access — it is derived from the key —
--     so a key can NEVER reach another organization's data.
--   * The plaintext token is shown once at creation and never stored; only a
--     SHA-256 hash (peppered) lives here. A DB leak does not leak usable keys.
--   * Keys carry scopes (read-only in v1), can expire, and can be revoked.
--
-- api_request_log is the per-call audit trail (also powers rate-limit forensics).

-- ── api_keys ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_keys (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  -- sha256(token + pepper), hex. The plaintext is never stored.
  token_hash    text        NOT NULL,
  -- Non-secret display hint, e.g. "fnd_live_a1b2c3". Lets the UI identify a key
  -- without revealing it.
  token_prefix  text        NOT NULL,
  -- e.g. {organization:read, grants:read, ...} or {*} for full read access.
  scopes        text[]      NOT NULL DEFAULT '{}',
  created_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at  timestamptz,
  expires_at    timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Lookup is by token_hash on every authenticated request — must be unique+indexed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_token_hash ON public.api_keys (token_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_org_id     ON public.api_keys (org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON public.api_keys (created_at DESC);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Members of an org can list their own org's keys. The app only ever selects
-- non-secret columns (never token_hash) for display; all mutations go through
-- service-role server actions after an owner/admin role check.
DROP POLICY IF EXISTS "api_keys_select_own_org" ON public.api_keys;
CREATE POLICY "api_keys_select_own_org" ON public.api_keys
  FOR SELECT USING (org_id = public.get_user_org_id() OR public.is_platform_admin());

-- ── api_request_log ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_request_log (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  api_key_id  uuid        REFERENCES public.api_keys(id) ON DELETE SET NULL,
  org_id      uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  method      text        NOT NULL,
  path        text        NOT NULL,
  status      integer     NOT NULL,
  ip          text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_request_log_key ON public.api_request_log (api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_log_org ON public.api_request_log (org_id, created_at DESC);

ALTER TABLE public.api_request_log ENABLE ROW LEVEL SECURITY;

-- Members can read their own org's API call history. Writes are service-role only.
DROP POLICY IF EXISTS "api_request_log_select_own_org" ON public.api_request_log;
CREATE POLICY "api_request_log_select_own_org" ON public.api_request_log
  FOR SELECT USING (org_id = public.get_user_org_id() OR public.is_platform_admin());
