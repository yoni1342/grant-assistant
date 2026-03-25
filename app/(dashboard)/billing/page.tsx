import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BillingTab } from "../settings/components/billing-tab"

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organization:organizations(*)")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")

  const org = profile.organization as Record<string, unknown> | null

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-2 mb-8">
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">Billing</h1>
        <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
          Manage your subscription and payment
        </p>
      </div>

      <BillingTab
        orgId={(org?.id as string) || ""}
        email={profile.email || user.email || ""}
        currentPlan={(org?.plan as string) || "free"}
        subscriptionStatus={(org?.subscription_status as string) || null}
        trialEndsAt={(org?.trial_ends_at as string) || null}
        stripeCustomerId={(org?.stripe_customer_id as string) || null}
      />
    </div>
  )
}
