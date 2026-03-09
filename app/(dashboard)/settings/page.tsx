import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SettingsClient } from "./components/settings-client"
import type { Tables } from "@/lib/supabase/database.types"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetch profile with joined organization
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organization:organizations(*)")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")

  // Fetch team members for same org
  let members: typeof profile[] = []
  if (profile.org_id) {
    const { data } = await supabase
      .from("profiles")
      .select("*, organization:organizations(*)")
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: true })
    members = data || []
  }

  // Fetch recent workflow executions
  let workflows: Tables<"workflow_executions">[] = []
  if (profile.org_id) {
    const { data } = await supabase
      .from("workflow_executions")
      .select("*")
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false })
      .limit(50)
    workflows = data || []
  }

  return (
    <SettingsClient
      data={{
        user,
        profile: profile as any,
        members: members as any,
        workflows,
      }}
    />
  )
}
