export const PLANS = {
  free: {
    name: 'Starter',
    description: 'Get started with grant discovery',
    price: 0,
    stripePriceId: null,
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
    price: 49,
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID!,
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
    price: 149,
    stripePriceId: process.env.STRIPE_AGENCY_PRICE_ID!,
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
