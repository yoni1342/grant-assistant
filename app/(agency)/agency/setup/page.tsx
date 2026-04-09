import { createClient, getUserAgencyId } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AgencySetupForm } from "./setup-form";

export default async function AgencySetupPage() {
  const supabase = await createClient();
  const { agencyId } = await getUserAgencyId(supabase);
  if (!agencyId) redirect("/login");

  // Check if setup is already complete
  const { data: agency } = await supabase
    .from("agencies")
    .select("setup_complete, name")
    .eq("id", agencyId)
    .single();

  if (agency?.setup_complete) {
    redirect("/agency");
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            Set Up Your Agency
          </h1>
          <p className="text-sm text-muted-foreground">
            Complete your agency profile to get started. You can manage multiple
            organizations under your agency.
          </p>
        </div>
        <AgencySetupForm />
      </div>
    </div>
  );
}
