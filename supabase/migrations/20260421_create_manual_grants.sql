-- Per-org store for manually entered grants. Same shape as central_grants
-- minus scraper-specific fields (source, source_id, first_seen_at,
-- last_seen_at). Only the creating org can see/edit.

CREATE TABLE IF NOT EXISTS public.manual_grants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (trim(title) <> ''),
  funder_name text,
  organization text,
  amount text,
  deadline text,
  description text,
  eligibility jsonb,
  categories jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS manual_grants_org_idx ON public.manual_grants (org_id);

CREATE OR REPLACE FUNCTION public.touch_manual_grants_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS manual_grants_touch_updated_at ON public.manual_grants;
CREATE TRIGGER manual_grants_touch_updated_at
  BEFORE UPDATE ON public.manual_grants
  FOR EACH ROW EXECUTE FUNCTION public.touch_manual_grants_updated_at();

ALTER TABLE public.manual_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select" ON public.manual_grants
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "org_insert" ON public.manual_grants
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "org_update" ON public.manual_grants
  FOR UPDATE USING (org_id = public.get_user_org_id());

CREATE POLICY "org_delete" ON public.manual_grants
  FOR DELETE USING (org_id = public.get_user_org_id());

CREATE POLICY "Platform admins can view all manual grants"
  ON public.manual_grants FOR SELECT
  USING (public.is_platform_admin());
