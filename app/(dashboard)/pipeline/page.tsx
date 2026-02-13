import { createClient } from "@/lib/supabase/server";
import { PipelineClient } from "./pipeline-client";

export default async function PipelinePage() {
  const supabase = await createClient();
  const { data: grants } = await supabase
    .from("grants")
    .select("*")
    .order("created_at", { ascending: false });

  return <PipelineClient initialGrants={grants || []} />;
}
