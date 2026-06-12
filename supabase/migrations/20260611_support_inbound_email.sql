-- Inbound-email support threads + per-admin notifications.
--
-- Background: every Fundory email sets Reply-To: support@fundory.ai, but the
-- domain had no inbound mail, so customer replies bounced. We now receive mail
-- via SES -> S3 -> /api/inbound-email, which threads it onto a support_request.
-- support_messages holds the back-and-forth (the request row itself remains the
-- opening message); admin_notifications fans a new-message alert out to every
-- platform admin.

-- ---------------------------------------------------------------------------
-- support_messages: the conversation thread for a support_request
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_messages (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id       uuid        NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
  direction        text        NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_email       text,
  from_name        text,
  to_email         text,
  body_text        text,
  body_html        text,
  s3_key           text,        -- raw email object key in the inbound S3 bucket (inbound only)
  email_message_id text,        -- RFC Message-ID header, used to de-dupe inbound deliveries
  sent_by          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,  -- admin who sent (outbound)
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_request_id ON public.support_messages (request_id, created_at);
-- De-dupe: SES/SNS can deliver the same message more than once.
CREATE UNIQUE INDEX IF NOT EXISTS uq_support_messages_email_message_id
  ON public.support_messages (email_message_id)
  WHERE email_message_id IS NOT NULL;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Org members may read the thread for their own org's requests. Writes happen
-- only through the service role (server), which bypasses RLS.
CREATE POLICY "members_read_own_org_support_messages" ON public.support_messages
  FOR SELECT USING (
    request_id IN (
      SELECT id FROM public.support_requests
      WHERE org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Track latest activity on the request for sorting / "awaiting reply".
ALTER TABLE public.support_requests
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz NOT NULL DEFAULT now();

-- When a request is opened by an inbound email (no matching ticket), record the
-- email's Message-ID so re-delivery from SNS (at-least-once) is idempotent.
ALTER TABLE public.support_requests
  ADD COLUMN IF NOT EXISTS inbound_message_id text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_support_requests_inbound_message_id
  ON public.support_requests (inbound_message_id)
  WHERE inbound_message_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- admin_notifications: per-platform-admin in-app notification feed
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text        NOT NULL DEFAULT 'support',
  title       text        NOT NULL,
  body        text,
  link        text,
  request_id  uuid        REFERENCES public.support_requests(id) ON DELETE CASCADE,
  is_read     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin_unread
  ON public.admin_notifications (admin_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at
  ON public.admin_notifications (created_at DESC);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- A platform admin can read/update only their own notifications. Inserts are
-- done server-side via the service role.
CREATE POLICY "admins_read_own_notifications" ON public.admin_notifications
  FOR SELECT USING (
    admin_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_platform_admin = true)
  );

CREATE POLICY "admins_update_own_notifications" ON public.admin_notifications
  FOR UPDATE USING (
    admin_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_platform_admin = true)
  );
