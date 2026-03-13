-- Track grant fetch progress for new organizations
CREATE TABLE IF NOT EXISTS public.grant_fetch_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'searching',
  stage_message text NOT NULL DEFAULT 'Starting grant search...',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

-- RLS
ALTER TABLE public.grant_fetch_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org fetch status"
  ON public.grant_fetch_status FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.grant_fetch_status;
ALTER TABLE public.grant_fetch_status REPLICA IDENTITY FULL;

-- Index
CREATE INDEX idx_grant_fetch_status_org_id ON public.grant_fetch_status(org_id);
