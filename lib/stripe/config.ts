export const PLANS = {
  free: {
    name: 'Starter',
    description: 'Get started with grant discovery',
    price: 0,
    stripePriceId: null,
    features: [
      '5 grants/month',
      'Basic AI writing',
      'Core discovery',
      'Community access',
    ],
  },
  professional: {
    name: 'Professional',
    description: 'Everything you need to win grants',
    price: 49,
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID!,
    features: [
      'Unlimited grants',
      'Advanced AI drafts',
      'RFP parsing',
      'Content library',
      'Pipeline tracking',
    ],
  },
  agency: {
    name: 'Agency',
    description: 'For organizations managing multiple clients',
    price: 149,
    stripePriceId: process.env.STRIPE_AGENCY_PRICE_ID!,
    features: [
      'Multi-org management',
      'White-label ready',
      'Priority support',
      'API access',
      'Analytics dashboard',
    ],
  },
} as const

export type PlanId = keyof typeof PLANS

export const TRIAL_DAYS = 7
