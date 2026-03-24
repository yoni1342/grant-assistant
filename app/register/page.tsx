import { createClient } from "@/lib/supabase/server";
import { RegisterWizard } from "./register-wizard";

export default async function RegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <RegisterWizard isAuthenticated={!!user} userEmail={user?.email} userName={user?.user_metadata?.full_name || user?.user_metadata?.name} />;
}
