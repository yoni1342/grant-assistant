"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Check, Clock, ExternalLink, Loader2 } from "lucide-react"
import { PLANS, TRIAL_DAYS } from "@/lib/stripe/config"
import type { PlanId } from "@/lib/stripe/config"

interface BillingTabProps {
  orgId: string
  email: string
  currentPlan: string
  subscriptionStatus: string | null
  trialEndsAt: string | null
  stripeCustomerId: string | null
  isTester?: boolean
}

export function BillingTab({
  orgId,
  email,
  currentPlan,
  subscriptionStatus,
  trialEndsAt,
  stripeCustomerId,
  isTester = false,
}: BillingTabProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [grantUsage, setGrantUsage] = useState<{ used: number; limit: number | null } | null>(null)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch("/api/grants/usage")
        if (res.ok) setGrantUsage(await res.json())
      } catch { /* silent */ }
    }
    fetchUsage()
  }, [])

  const isTrialing = subscriptionStatus === "trialing"
  const isPastDue = subscriptionStatus === "past_due"
  const isCanceled = subscriptionStatus === "canceled"
  const needsPayment = isPastDue || isCanceled

  function getTrialDaysRemaining(): number | null {
    if (!trialEndsAt) return null
    const now = new Date()
    const end = new Date(trialEndsAt)
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  const trialDaysRemaining = getTrialDaysRemaining()

  async function handleUpgrade(plan: PlanId) {
    setLoading(plan)
    try {
      const res = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, plan, email }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("Checkout error:", err)
    } finally {
      setLoading(null)
    }
  }

  async function handleManageBilling() {
    setLoading("portal")
    try {
      const res = await fetch("/api/stripe/customer-portal", {
        method: "POST",
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("Portal error:", err)
    } finally {
      setLoading(null)
    }
  }

  if (isTester) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border-2 border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-400 p-4 flex items-center gap-4">
          <Check className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-bold text-base">Pilot Tester Account</p>
            <p className="text-sm mt-0.5 opacity-80">
              Your organization has full access to all features as a pilot tester. No payment is required.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Plan</CardTitle>
            <CardDescription>Your organization&apos;s subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {PLANS[currentPlan as PlanId]?.name || "Professional"}
                </p>
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
    )
  }

  return (
    <div className="space-y-6">
      {/* Trial Banner */}
      {isTrialing && trialDaysRemaining !== null && (
        <div className={`rounded-lg border-2 p-4 flex items-center gap-4 ${
          trialDaysRemaining <= 2
            ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
            : "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        }`}>
          {trialDaysRemaining <= 2 ? (
            <AlertTriangle className="h-6 w-6 shrink-0" />
          ) : (
            <Clock className="h-6 w-6 shrink-0" />
          )}
          <div>
            <p className="font-bold text-base">
              {trialDaysRemaining === 0
                ? "Your free trial ends today!"
                : trialDaysRemaining === 1
                  ? "Your free trial ends tomorrow!"
                  : `Your free trial ends in ${trialDaysRemaining} days`}
            </p>
            <p className="text-sm mt-0.5 opacity-80">
              You&apos;re currently enjoying {PLANS[currentPlan as PlanId]?.name || currentPlan} features for free.
              After the trial, you&apos;ll be charged ${PLANS[currentPlan as PlanId]?.price}/mo.
            </p>
          </div>
        </div>
      )}

      {/* Past Due Banner */}
      {isPastDue && (
        <div className="rounded-lg border-2 border-red-500 bg-red-500/10 text-red-700 dark:text-red-400 p-4 flex items-center gap-4">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-bold text-base">
              Your free trial has ended — payment is past due
            </p>
            <p className="text-sm mt-0.5 opacity-80">
              Your {PLANS[currentPlan as PlanId]?.name || currentPlan} plan requires a payment of ${PLANS[currentPlan as PlanId]?.price}/mo to continue.
              Please update your payment method to avoid losing access.
            </p>
          </div>
        </div>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Plan</CardTitle>
          <CardDescription>Your organization&apos;s subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">
                {PLANS[currentPlan as PlanId]?.name || "Starter"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {isTrialing && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                    Free Trial
                  </Badge>
                )}
                {isPastDue && (
                  <Badge variant="destructive">Payment past due</Badge>
                )}
                {subscriptionStatus === "active" && (
                  <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400 bg-green-500/10">Active</Badge>
                )}
                {(!subscriptionStatus || subscriptionStatus === "canceled") && currentPlan === "free" && (
                  <Badge variant="outline">Free</Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              {isTrialing ? (
                <>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">$0</p>
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                    then ${PLANS[currentPlan as PlanId]?.price}/mo after trial
                  </p>
                </>
              ) : (
                <p className="text-3xl font-bold">
                  {PLANS[currentPlan as PlanId]?.price === 0
                    ? "Free"
                    : `$${PLANS[currentPlan as PlanId]?.price}`}
                  {(PLANS[currentPlan as PlanId]?.price || 0) > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {stripeCustomerId && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleManageBilling}
              disabled={loading === "portal"}
            >
              {loading === "portal" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Manage Billing
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Grant Usage (free tier) */}
      {grantUsage && grantUsage.limit !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Grant Usage</CardTitle>
            <CardDescription>Daily pipeline additions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {grantUsage.used} of {grantUsage.limit} grant{grantUsage.limit === 1 ? "" : "s"} used today
                </span>
                <span className="text-sm font-medium">
                  {grantUsage.limit - grantUsage.used} remaining
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    grantUsage.used >= grantUsage.limit
                      ? "bg-red-500"
                      : grantUsage.used >= grantUsage.limit - 1
                        ? "bg-amber-500"
                        : "bg-primary"
                  }`}
                  style={{ width: `${Math.min((grantUsage.used / grantUsage.limit) * 100, 100)}%` }}
                />
              </div>
              {grantUsage.used >= grantUsage.limit && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  You&apos;ve reached your daily limit. Upgrade to Professional for unlimited grants.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Plans</CardTitle>
          <CardDescription>Choose the plan that fits your needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.entries(PLANS) as [PlanId, typeof PLANS[PlanId]][]).filter(([planId]) => planId !== "agency").map(([planId, plan]) => {
              const isCurrent = planId === currentPlan
              return (
                <div
                  key={planId}
                  className={`flex flex-col rounded-lg border p-5 ${
                    isCurrent ? "border-primary bg-primary/5" : "border-muted"
                  }`}
                >
                  <p className="font-semibold text-lg">{plan.name}</p>
                  <p className="text-2xl font-bold mt-1">
                    {plan.price === 0 ? "Free" : `$${plan.price}`}
                    {plan.price > 0 && (
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    )}
                  </p>
                  {plan.price > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {TRIAL_DAYS}-day free trial
                    </p>
                  )}
                  <ul className="mt-3 space-y-1.5 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    {isCurrent && needsPayment ? (
                      <Button
                        className="w-full"
                        variant="destructive"
                        onClick={() => handleUpgrade(planId)}
                        disabled={loading === planId}
                      >
                        {loading === planId ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Subscribe Now
                      </Button>
                    ) : isCurrent && isTrialing ? (
                      <Button variant="outline" className="w-full border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/10" disabled>
                        Active Trial
                      </Button>
                    ) : isCurrent && subscriptionStatus === "active" ? (
                      <Button variant="outline" className="w-full border-green-500 text-green-600 dark:text-green-400 bg-green-500/10 hover:bg-green-500/10" disabled>
                        Subscribed
                      </Button>
                    ) : isCurrent ? (
                      <Button variant="outline" className="w-full border-green-500 text-green-600 dark:text-green-400 bg-green-500/10 hover:bg-green-500/10" disabled>
                        Current Plan
                      </Button>
                    ) : planId === "free" ? (
                      stripeCustomerId ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handleManageBilling}
                          disabled={loading === "portal"}
                        >
                          Downgrade
                        </Button>
                      ) : null
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleUpgrade(planId)}
                        disabled={loading === planId}
                      >
                        {loading === planId ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {isCurrent ? "Current" : "Upgrade"}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
