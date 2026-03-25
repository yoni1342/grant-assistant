import { NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { orgId, plan, email, mode } = await req.json()

    if (!orgId || !plan || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (plan !== 'professional' && plan !== 'agency') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const stripe = getStripeClient()
    const { PLANS } = await import('@/lib/stripe/config')

    // Check if org already has a Stripe customer
    const adminClient = createAdminClient()
    const { data: org } = await adminClient
      .from('organizations')
      .select('stripe_customer_id, subscription_status')
      .eq('id', orgId)
      .single()

    let customerId = org?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { org_id: orgId },
      })
      customerId = customer.id

      await adminClient
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', orgId)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    // Use subscription mode when resubscribing (past_due/canceled), setup mode for initial registration
    const needsSubscription = mode === 'subscribe' || org?.subscription_status === 'past_due' || org?.subscription_status === 'canceled'

    const planConfig = PLANS[plan as keyof typeof PLANS]

    let session
    if (needsSubscription && planConfig.stripePriceId) {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
        metadata: { org_id: orgId, plan },
        success_url: `${appUrl}/billing?payment=success`,
        cancel_url: `${appUrl}/billing`,
      })
    } else {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'setup',
        payment_method_types: ['card'],
        metadata: { org_id: orgId, plan },
        success_url: `${appUrl}/pending-approval?payment=success`,
        cancel_url: `${appUrl}/pending-approval`,
      })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe/checkout-session] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
