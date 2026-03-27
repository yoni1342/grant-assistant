import { createClient, createAdminClient, getUserOrgId } from "@/lib/supabase/server"
import { PLANS } from "@/lib/stripe/config"
import type { PlanId } from "@/lib/stripe/config"

export async function GET() {
  const supabase = await createClient()
  const { orgId, error: authError } = await getUserOrgId(supabase)
  if (!orgId) {
    return Response.json(
      { error: authError || "Not authenticated" },
      { status: 401 },
    )
  }

  const adminSupabase = createAdminClient()

  // Get org plan
  const { data: org } = await adminSupabase
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single()

  const plan = (org?.plan as PlanId) || "free"
  const limit = PLANS[plan]?.dailyGrantLimit ?? null

  // Count grants added today
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const { count } = await adminSupabase
    .from("grants")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .gte("created_at", startOfDay)

  return Response.json({
    used: count ?? 0,
    limit,
    plan,
  })
}
