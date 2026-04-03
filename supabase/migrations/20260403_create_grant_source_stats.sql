-- Track raw grant fetch counts per source before AI filtering
-- This captures the number of grants returned from each source BEFORE screening,
-- so we can measure the full funnel: raw fetched → stored → eligible → pending → proposals

CREATE TABLE IF NOT EXISTS public.grant_source_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source text NOT NULL,
  raw_count integer NOT NULL DEFAULT 0,
  fetch_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, source, fetch_date)
);

-- RLS
ALTER TABLE public.grant_source_stats ENABLE ROW LEVEL SECURITY;

-- Platform admins can read all rows
CREATE POLICY "Platform admins can read all grant source stats"
  ON public.grant_source_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_platform_admin = true
    )
  );

-- Service role (n8n webhook) handles inserts via admin client

-- Indexes
CREATE INDEX idx_grant_source_stats_org_date ON public.grant_source_stats(org_id, fetch_date);
CREATE INDEX idx_grant_source_stats_source ON public.grant_source_stats(source);
CREATE INDEX idx_grant_source_stats_date ON public.grant_source_stats(fetch_date);
