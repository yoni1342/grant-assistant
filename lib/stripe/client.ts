import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      console.error('[stripe/client] STRIPE_SECRET_KEY is not set!')
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    console.log('[stripe/client] Initializing Stripe client (key starts with:', secretKey.substring(0, 7) + '...)')
    stripeClient = new Stripe(secretKey, {
      typescript: true,
    })
  }
  return stripeClient
}
