-- Enable realtime for grant_source_stats and grants tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.grant_source_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grants;
