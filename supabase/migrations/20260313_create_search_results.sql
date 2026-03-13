-- Progressive search results table for real-time grant discovery
CREATE TABLE IF NOT EXISTS public.search_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  search_id text NOT NULL,
  org_id uuid NOT NULL,
  source_group text,
  grant_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_results_search_id ON public.search_results(search_id);
CREATE INDEX idx_search_results_created_at ON public.search_results(created_at DESC);

ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org search results"
  ON public.search_results FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Service role can insert search results"
  ON public.search_results FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can delete old search results"
  ON public.search_results FOR DELETE
  USING (true);

-- Enable realtime
ALTER TABLE public.search_results REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.search_results;
