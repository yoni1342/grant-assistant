// Billing cycles available on every paid plan. Each cycle is a separate
// Price object in Stripe (one Product per plan, three Prices per Product).
//
// Pricing rule (set by the team):
//   • Monthly  → full sticker price
//   • 3 months → 10% off the monthly rate, billed every 3 months
//   • Annual   → 30% off the monthly rate, billed yearly
//
// Required env vars (test mode + live mode each):
//
//   STRIPE_PROFESSIONAL_PRICE_ID            (monthly)
//   STRIPE_PROFESSIONAL_QUARTERLY_PRICE_ID
//   STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID
//   STRIPE_AGENCY_PRICE_ID                  (monthly)
//   STRIPE_AGENCY_QUARTERLY_PRICE_ID
//   STRIPE_AGENCY_ANNUAL_PRICE_ID

export const BILLING_CYCLES = {
  monthly: {
    label: 'Monthly',
    short: '1 mo',
    months: 1,
    discountPct: 0,
  },
  quarterly: {
    label: 'Every 3 months',
    short: '3 mo',
    months: 3,
    discountPct: 10,
  },
  annual: {
    label: 'Annual',
    short: '1 yr',
    months: 12,
    discountPct: 30,
  },
} as const

export type BillingCycleId = keyof typeof BILLING_CYCLES

const PROFESSIONAL_BASE = 49
const AGENCY_BASE = 149

export const PLANS = {
  free: {
    name: 'Starter',
    description: 'Get started with grant discovery',
    price: 0,
    basePriceMonthly: 0,
    stripePriceId: null as string | null,
    prices: null as Record<BillingCycleId, string | undefined> | null,
    dailyGrantLimit: 1,
    features: [
      '1 grant/day',
      'AI writing & drafts',
      'Core discovery',
      'Pipeline tracking',
    ],
  },
  professional: {
    name: 'Professional',
    description: 'Everything you need to win grants',
    price: PROFESSIONAL_BASE,
    basePriceMonthly: PROFESSIONAL_BASE,
    // Legacy alias — equals the monthly price ID, kept so existing callers
    // (admin approve flow, etc.) keep working without changes.
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    prices: {
      monthly: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
      quarterly: process.env.STRIPE_PROFESSIONAL_QUARTERLY_PRICE_ID,
      annual: process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID,
    } as Record<BillingCycleId, string | undefined>,
    dailyGrantLimit: null, // unlimited
    features: [
      'Unlimited grants',
      'AI writing & drafts',
      'RFP parsing',
      'Content library',
      'Pipeline tracking',
    ],
  },
  agency: {
    name: 'Agency',
    description: 'Manage multiple organizations under one plan',
    price: AGENCY_BASE,
    basePriceMonthly: AGENCY_BASE,
    stripePriceId: process.env.STRIPE_AGENCY_PRICE_ID,
    prices: {
      monthly: process.env.STRIPE_AGENCY_PRICE_ID,
      quarterly: process.env.STRIPE_AGENCY_QUARTERLY_PRICE_ID,
      annual: process.env.STRIPE_AGENCY_ANNUAL_PRICE_ID,
    } as Record<BillingCycleId, string | undefined>,
    dailyGrantLimit: null, // unlimited
    features: [
      'Unlimited grants per org',
      'Multi-org management',
      'Org switching',
      'Cross-org analytics',
      'Single billing for all orgs',
    ],
  },
} as const

export type PlanId = keyof typeof PLANS

export const TRIAL_DAYS = 7

/**
 * Compute the displayed-and-charged price for a (plan, billing cycle) pair.
 *
 *   • perMonth — what to show as the "$X/mo" headline price
 *   • total    — what Stripe will actually charge per billing period
 *   • months   — billing period length
 *   • discountPct — promo percentage off the monthly rate
 */
export function getCyclePrice(planId: PlanId, cycle: BillingCycleId) {
  const plan = PLANS[planId]
  const base = plan.basePriceMonthly
  const c = BILLING_CYCLES[cycle]
  const total = +(base * c.months * (1 - c.discountPct / 100)).toFixed(2)
  const perMonth = c.months > 0 ? +(total / c.months).toFixed(2) : 0
  return {
    perMonth,
    total,
    months: c.months,
    discountPct: c.discountPct,
    label: c.label,
    short: c.short,
  }
}

/** Return the Stripe Price ID for the (plan, cycle) — null for Free. */
export function getStripePriceId(
  planId: PlanId,
  cycle: BillingCycleId,
): string | null {
  const plan = PLANS[planId]
  if (!plan.prices) return null
  return plan.prices[cycle] ?? null
}

// Free tier is manual-only: users add grants one at a time via Discovery,
// capped at `dailyGrantLimit`. Automatic fetching (pipeline auto-trigger,
// daily fan-out cron, approval-time seed) is reserved for paid plans.
// Testers bypass this regardless of plan.
export function canAutoFetchGrants(org: {
  plan?: string | null
  is_tester?: boolean | null
} | null | undefined): boolean {
  if (!org) return false
  if (org.is_tester) return true
  return !!org.plan && org.plan !== 'free'
}
