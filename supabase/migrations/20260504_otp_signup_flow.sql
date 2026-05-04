-- Self-serve registration flow without admin approval.
--
-- Adds:
--   • email_otps        — short-lived 6-digit codes for email verification
--                         during signup. Stores the still-pending password +
--                         full name so the actual auth.users row is only
--                         created after the user proves they own the email.
--   • profiles.signup_step
--                       — tracks where each new owner is in the multi-step
--                         registration wizard, so they can resume after
--                         abandoning.
--   • org_drafts        — partial form state, keyed by user_id, persisted
--                         every step so the wizard can re-hydrate.
--
-- Removes:
--   • Every organization stuck in status='pending'. The new flow auto-
--     activates orgs at registration end (no admin approval), and the press-
--     day batch had ~no functional pending orgs anyway. Cascades through
--     RLS+FK rules; profiles whose org_id pointed at a deleted row get
--     org_id=NULL (admins can re-onboard them via the wizard).
--
-- Suspended/rejected statuses are left intact so admins can still moderate
-- bad actors after activation.

------------------------------------------------------------------------------
-- 1. email_otps
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_otps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash       text NOT NULL,
  attempts        integer NOT NULL DEFAULT 0,
  expires_at      timestamptz NOT NULL,
  consumed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  ip_address      inet,
  user_agent      text
);

-- Only one ACTIVE (unconsumed, unexpired) OTP per email at a time. Re-issuing
-- replaces it via INSERT ON CONFLICT in the action.
CREATE UNIQUE INDEX IF NOT EXISTS email_otps_active_email_idx
  ON public.email_otps (lower(email))
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS email_otps_expires_at_idx
  ON public.email_otps (expires_at);

-- Service role only. Never readable by clients (contains password hashes).
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies → all access via service-role admin client.

------------------------------------------------------------------------------
-- 2. profiles.signup_step
------------------------------------------------------------------------------
--
-- Allowed values:
--   'verify_email'   — Supabase user exists; awaiting OTP confirmation
--                      (transient — only used by orphan-recovery)
--   'plan'           — choosing plan
--   'org_details'    — filling org info (name, EIN, mission, etc.)
--   'profile_mode'   — picking documents / questionnaire / website mode
--   'pay'            — at the registration-fee Stripe checkout
--   'complete'       — done, full app access (default for existing rows)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_step text NOT NULL DEFAULT 'complete';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_signup_step_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_signup_step_check CHECK (
    signup_step IN ('verify_email', 'plan', 'org_details', 'profile_mode', 'pay', 'complete')
  );

------------------------------------------------------------------------------
-- 3. org_drafts
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.org_drafts (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_drafts ENABLE ROW LEVEL SECURITY;

-- Each user can read/write their own draft. Service role bypasses RLS.
DROP POLICY IF EXISTS "org_drafts_owner_select" ON public.org_drafts;
CREATE POLICY "org_drafts_owner_select"
  ON public.org_drafts
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "org_drafts_owner_upsert" ON public.org_drafts;
CREATE POLICY "org_drafts_owner_upsert"
  ON public.org_drafts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "org_drafts_owner_update" ON public.org_drafts;
CREATE POLICY "org_drafts_owner_update"
  ON public.org_drafts
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "org_drafts_owner_delete" ON public.org_drafts;
CREATE POLICY "org_drafts_owner_delete"
  ON public.org_drafts
  FOR DELETE
  USING (user_id = auth.uid());

------------------------------------------------------------------------------
-- 4. Drop existing pending organizations + their profiles' org_id link
------------------------------------------------------------------------------

-- Profile rows whose org is about to vanish: clear the FK so the user can
-- re-register cleanly. We do not delete the auth.users rows — owners may
-- want to re-attempt the new flow with the same email.
UPDATE public.profiles
   SET org_id = NULL,
       role = NULL,
       signup_step = 'plan'
 WHERE org_id IN (SELECT id FROM public.organizations WHERE status = 'pending');

-- Wipe related data first to avoid FK errors. Mirrors deleteOrganization()
-- in app/(admin)/admin/organizations/actions.ts but scoped to status=pending.
DELETE FROM public.proposal_sections
 WHERE proposal_id IN (
   SELECT id FROM public.proposals
   WHERE org_id IN (SELECT id FROM public.organizations WHERE status = 'pending')
 );

DELETE FROM public.reports               WHERE org_id IN (SELECT id FROM public.organizations WHERE status = 'pending');
DELETE FROM public.proposals             WHERE org_id IN (SELECT id FROM public.organizations WHERE status = 'pending');
DELETE FROM public.awards                WHERE org_id IN (SELECT id FROM public.organizations WHERE status = 'pending');
DELETE FROM public.submissions           WHERE org_id IN (SELECT id FROM public.organizations WHERE status = 'pending');
DELETE FROM public.submission_checklists WHERE org_id IN (SELECT id FROM public.organizations WHERE status = 'pending');
DELETE FROM public.workflow_executions   WHERE org_id IN (SELECT id FROM public.organizations WHERE status = 'pending');
DELETE FROM public.activity_log          WHERE org_id IN (SELECT id FROM public.organizations WHERE status = 'pending');
DELETE FROM public.notifications         WHERE org_id IN (SELECT id FROM public.organizations WHERE status = 'pending');
DELETE FROM public.documents             WHERE org_id IN (SELECT id FROM public.organizations WHERE status = 'pending');
DELETE FROM public.funders               WHERE org_id IN (SELECT id FROM public.organizations WHERE status = 'pending');
DELETE FROM public.search_results        WHERE org_id IN (SELECT id FROM public.organizations WHERE status = 'pending');
DELETE FROM public.grant_fetch_status    WHERE org_id IN (SELECT id FROM public.organizations WHERE status = 'pending');
DELETE FROM public.grants                WHERE org_id IN (SELECT id FROM public.organizations WHERE status = 'pending');

-- Finally, the orgs themselves.
DELETE FROM public.organizations WHERE status = 'pending';
