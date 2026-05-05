import { createClient, getUserAgencyId } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLANS, BILLING_CYCLES, getCyclePrice } from "@/lib/stripe/config";
import { CreditCard, Check } from "lucide-react";

export default async function AgencyBillingPage() {
  const supabase = await createClient();
  const { agencyId } = await getUserAgencyId(supabase);
  if (!agencyId) redirect("/login");

  const { data: agency } = await supabase
    .from("agencies")
    .select("name, stripe_customer_id, stripe_subscription_id, subscription_status, trial_ends_at")
    .eq("id", agencyId)
    .single();

  // Check if the agency owner's org is a tester
  const { data: testerOrg } = await supabase
    .from("organizations")
    .select("is_tester")
    .eq("agency_id", agencyId)
    .eq("is_tester", true)
    .limit(1)
    .maybeSingle();

  const isTester = !!testerOrg?.is_tester;

  // Count orgs under agency
  const { count: orgCount } = await supabase
    .from("organizations")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .neq("plan", "agency");

  const plan = PLANS.agency;
  const isTrialing = agency?.subscription_status === "trialing";
  const trialEndsAt = agency?.trial_ends_at ? new Date(agency.trial_ends_at) : null;
  const now = new Date();
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

  if (isTester) {
    return (
      <div className="p-6 space-y-6 max-w-3xl">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            Billing
          </h1>
          <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
            Manage your agency subscription
          </p>
        </div>

        <div className="rounded-lg border-2 border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-400 p-4 flex items-center gap-4">
          <Check className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-bold text-base">Pilot Tester Account</p>
            <p className="text-sm mt-0.5 opacity-80">
              Your agency has full access to all features as a pilot tester. No payment is required.
            </p>
          </div>
        </div>

        <Card data-tour="agency-billing-plan">
          <CardHeader>
            <CardTitle className="text-lg">Current Plan</CardTitle>
            <CardDescription>Your agency&apos;s subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{plan.name}</p>
                <Badge variant="outline" className="border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-500/10 mt-1">
                  Pilot Tester
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">$0</p>
                <p className="text-sm text-muted-foreground">pilot access</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">
          Billing
        </h1>
        <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
          Manage your agency subscription
        </p>
      </div>

      {/* Current Plan */}
      <Card data-tour="agency-billing-plan">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{plan.name} Plan</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </div>
            <Badge variant={agency?.subscription_status === "active" || isTrialing ? "default" : "destructive"}>
              {agency?.subscription_status || "active"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">${plan.price}</span>
            <span className="text-muted-foreground">/month</span>
          </div>

          {/* Billing cycle options — the actual cycle in Stripe is managed via the portal */}
          <div className="rounded-md border border-muted bg-muted/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Billing cycle options
            </p>
            <ul className="space-y-1 text-sm">
              {(Object.keys(BILLING_CYCLES) as Array<keyof typeof BILLING_CYCLES>).map((id) => {
                const c = BILLING_CYCLES[id]
                const cp = getCyclePrice("agency", id)
                return (
                  <li key={id} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      {c.label}
                      {c.discountPct > 0 && (
                        <span className="ml-2 text-[11px] font-semibold text-green-700 dark:text-green-400">
                          save {c.discountPct}%
                        </span>
                      )}
                    </span>
                    <span className="font-medium">
                      ${cp.perMonth}/mo
                      {c.months > 1 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (${cp.total.toFixed(0)} every {c.months} mo)
                        </span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Switch cycles any time from the Stripe billing portal.
            </p>
          </div>

          {isTrialing && trialEndsAt && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium">Trial Period</p>
              <p className="text-muted-foreground">
                {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining — ends{" "}
                {trialEndsAt.toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-sm text-muted-foreground">Organizations</p>
              <p className="text-lg font-bold">{orgCount || 0}</p>
              <p className="text-xs text-muted-foreground">Unlimited included</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Grants per Org</p>
              <p className="text-lg font-bold">Unlimited</p>
              <p className="text-xs text-muted-foreground">No daily limit</p>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-sm font-medium mb-2">Plan Features</p>
            <ul className="space-y-1.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-foreground shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {agency?.stripe_customer_id && (
            <div className="pt-4 border-t border-border">
              <form action="/api/stripe/portal" method="POST">
                <Button variant="outline" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  Manage Billing
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
