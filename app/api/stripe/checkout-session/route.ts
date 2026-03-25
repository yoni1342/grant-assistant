import { NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { orgId, plan, email, mode } = await req.json()
    console.log('[stripe/checkout-session] Request received:', { orgId, plan, email, mode })

    if (!orgId || !plan || !email) {
      console.error('[stripe/checkout-session] Missing required fields:', { orgId: !!orgId, plan: !!plan, email: !!email })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (plan !== 'professional' && plan !== 'agency') {
      console.error('[stripe/checkout-session] Invalid plan:', plan)
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    console.log('[stripe/checkout-session] Initializing Stripe client...')
    const stripe = getStripeClient()
    const { PLANS } = await import('@/lib/stripe/config')

    const planConfig = PLANS[plan as keyof typeof PLANS]
    console.log('[stripe/checkout-session] Plan config:', { plan, stripePriceId: planConfig.stripePriceId || 'NOT SET', price: planConfig.price })

    if (!planConfig.stripePriceId) {
      console.error('[stripe/checkout-session] stripePriceId is not set for plan:', plan, '— check STRIPE_PROFESSIONAL_PRICE_ID / STRIPE_AGENCY_PRICE_ID env vars')
      return NextResponse.json({ error: `Stripe price ID not configured for plan: ${plan}` }, { status: 500 })
    }

    // Check if org already has a Stripe customer
    const adminClient = createAdminClient()
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('stripe_customer_id, subscription_status')
      .eq('id', orgId)
      .single()

    if (orgError) {
      console.error('[stripe/checkout-session] Failed to fetch org:', orgError.message)
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    console.log('[stripe/checkout-session] Org data:', { stripe_customer_id: org?.stripe_customer_id || 'none', subscription_status: org?.subscription_status || 'none' })

    let customerId = org?.stripe_customer_id

    if (!customerId) {
      console.log('[stripe/checkout-session] Creating new Stripe customer for:', email)
      const customer = await stripe.customers.create({
        email,
        metadata: { org_id: orgId },
      })
      customerId = customer.id
      console.log('[stripe/checkout-session] Created Stripe customer:', customerId)

      await adminClient
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', orgId)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    console.log('[stripe/checkout-session] App URL:', appUrl)

    // Use subscription mode when resubscribing (past_due/canceled), setup mode for initial registration
    const needsSubscription = mode === 'subscribe' || org?.subscription_status === 'past_due' || org?.subscription_status === 'canceled'
    console.log('[stripe/checkout-session] Session mode:', needsSubscription ? 'subscription' : 'setup', { mode, subscription_status: org?.subscription_status })

    let session
    if (needsSubscription && planConfig.stripePriceId) {
      console.log('[stripe/checkout-session] Creating subscription checkout:', { customerId, priceId: planConfig.stripePriceId })
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
        metadata: { org_id: orgId, plan },
        success_url: `${appUrl}/billing?payment=success`,
        cancel_url: `${appUrl}/billing`,
      })
    } else {
      console.log('[stripe/checkout-session] Creating setup checkout:', { customerId })
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'setup',
        payment_method_types: ['card'],
        metadata: { org_id: orgId, plan },
        success_url: `${appUrl}/pending-approval?payment=success`,
        cancel_url: `${appUrl}/pending-approval`,
      })
    }

    console.log('[stripe/checkout-session] Session created:', { sessionId: session.id, url: session.url ? 'OK' : 'MISSING' })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[stripe/checkout-session] Error:', errMsg, error)
    return NextResponse.json(
      { error: `Failed to create checkout session: ${errMsg}` },
      { status: 500 }
    )
  }
}
