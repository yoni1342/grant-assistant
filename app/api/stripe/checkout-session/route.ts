import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getStripeClient } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { orgId, agencyId, plan, email, mode } = await req.json()
    console.log('[stripe/checkout-session] Request received:', { orgId, agencyId, plan, email, mode })

    if ((!orgId && !agencyId) || !plan || !email) {
      console.error('[stripe/checkout-session] Missing required fields:', { orgId: !!orgId, agencyId: !!agencyId, plan: !!plan, email: !!email })
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

    const adminClient = createAdminClient()

    // Resolve the entity (org or agency) for billing
    let entityId = orgId
    let entityType: 'org' | 'agency' = 'org'
    let existingCustomerId: string | null = null
    let existingSubscriptionStatus: string | null = null

    if (agencyId && plan === 'agency') {
      entityType = 'agency'
      entityId = agencyId
      const { data: agency, error: agencyError } = await adminClient
        .from('agencies')
        .select('stripe_customer_id, subscription_status')
        .eq('id', agencyId)
        .single()
      if (agencyError) {
        console.error('[stripe/checkout-session] Failed to fetch agency:', agencyError.message)
        return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
      }
      existingCustomerId = agency?.stripe_customer_id ?? null
      existingSubscriptionStatus = agency?.subscription_status ?? null
    } else {
      const { data: org, error: orgError } = await adminClient
        .from('organizations')
        .select('stripe_customer_id, subscription_status')
        .eq('id', orgId)
        .single()
      if (orgError) {
        console.error('[stripe/checkout-session] Failed to fetch org:', orgError.message)
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
      existingCustomerId = org?.stripe_customer_id ?? null
      existingSubscriptionStatus = org?.subscription_status ?? null
    }

    console.log('[stripe/checkout-session] Entity data:', { entityType, entityId, stripe_customer_id: existingCustomerId || 'none', subscription_status: existingSubscriptionStatus || 'none' })

    let customerId = existingCustomerId

    // Validate existing customer ID still exists in Stripe (may be stale from test mode)
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId)
      } catch {
        console.warn('[stripe/checkout-session] Stored customer ID is invalid (likely from test mode), creating new one:', customerId)
        customerId = null
      }
    }

    if (!customerId) {
      console.log('[stripe/checkout-session] Creating new Stripe customer for:', email)
      const metadata: Record<string, string> = entityType === 'agency' ? { agency_id: entityId } : { org_id: entityId }
      const customer = await stripe.customers.create({ email, metadata })
      customerId = customer.id
      console.log('[stripe/checkout-session] Created Stripe customer:', customerId)

      if (entityType === 'agency') {
        await adminClient.from('agencies').update({ stripe_customer_id: customerId }).eq('id', entityId)
        await adminClient.from('organizations').update({ stripe_customer_id: customerId }).eq('agency_id', entityId)
      } else {
        await adminClient.from('organizations').update({ stripe_customer_id: customerId }).eq('id', entityId)
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    console.log('[stripe/checkout-session] App URL:', appUrl)

    // Use subscription mode when resubscribing (past_due/canceled), setup mode for initial registration
    const needsSubscription = mode === 'subscribe' || existingSubscriptionStatus === 'past_due' || existingSubscriptionStatus === 'canceled'
    console.log('[stripe/checkout-session] Session mode:', needsSubscription ? 'subscription' : 'setup', { mode, subscription_status: existingSubscriptionStatus })

    const sessionMetadata: Record<string, string> = entityType === 'agency'
      ? { agency_id: entityId, org_id: orgId || '', plan }
      : { org_id: entityId, plan }

    let session
    if (needsSubscription && planConfig.stripePriceId) {
      console.log('[stripe/checkout-session] Creating subscription checkout:', { customerId, priceId: planConfig.stripePriceId })
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
        metadata: sessionMetadata,
        success_url: entityType === 'agency' ? `${appUrl}/agency/billing?payment=success` : `${appUrl}/billing?payment=success`,
        cancel_url: entityType === 'agency' ? `${appUrl}/agency/billing` : `${appUrl}/billing`,
      })
    } else {
      console.log('[stripe/checkout-session] Creating setup checkout:', { customerId })
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'setup',
        payment_method_types: ['card'],
        metadata: sessionMetadata,
        success_url: `${appUrl}/pending-approval?payment=success`,
        cancel_url: `${appUrl}/pending-approval`,
      })
    }

    console.log('[stripe/checkout-session] Session created:', { sessionId: session.id, url: session.url ? 'OK' : 'MISSING' })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[stripe/checkout-session] Error:', errMsg, error)
    Sentry.captureException(error, { extra: { context: 'stripe-checkout-session' } })
    await Sentry.flush(2000)
    return NextResponse.json(
      { error: "Unable to process your billing request. Please try again." },
      { status: 500 }
    )
  }
}
