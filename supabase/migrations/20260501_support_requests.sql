-- Support requests intake. Backs the in-app "Help & support" form.
-- One row per submission; team replies happen by email (support@fundory.ai
-- inbox), this table is the audit trail and powers a future helpdesk view.

CREATE TABLE IF NOT EXISTS public.support_requests (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid        REFERENCES organizations(id) ON DELETE SET NULL,
  user_id         uuid        REFERENCES auth.users(id)    ON DELETE SET NULL,
  submitter_name  text        NOT NULL,
  submitter_email text        NOT NULL,
  org_plan        text,
  category        text        NOT NULL DEFAULT 'general',
  subject         text        NOT NULL,
  message         text        NOT NULL,
  status          text        NOT NULL DEFAULT 'open',
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_support_requests_org_id      ON public.support_requests (org_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_user_id     ON public.support_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at  ON public.support_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_requests_status      ON public.support_requests (status);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Members of an org can see their own org's requests.
CREATE POLICY "members_read_own_org_support_requests" ON public.support_requests
  FOR SELECT USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- Authenticated users insert their own (server actions should still pass user_id).
CREATE POLICY "users_insert_own_support_requests" ON public.support_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Service role bypasses RLS as usual; admin reads happen via service-role client.
