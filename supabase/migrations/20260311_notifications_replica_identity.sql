-- Set replica identity to FULL so Supabase Realtime can evaluate RLS policies
-- on INSERT/UPDATE/DELETE events for the notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
