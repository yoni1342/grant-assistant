-- Proposal generation is now async: the API returns immediately with the
-- workflow_executions row id, and the client subscribes to that row to
-- learn when n8n finishes. Realtime needs the table in the publication.
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_executions;
