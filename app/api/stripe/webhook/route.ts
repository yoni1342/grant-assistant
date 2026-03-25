import { NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/server'
import { sendTrialEndedEmail } from '@/lib/email/service'
import type Stripe from 'stripe'

export async function POST(req: Request) {
  const stripe = getStripeClient()
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.metadata?.org_id
        const plan = session.metadata?.plan

        if (orgId && session.mode === 'setup') {
          // Setup mode: card collected, no subscription yet (trial starts on admin approval)
          const setupIntentId = session.setup_intent as string
          if (setupIntentId) {
            const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
            const paymentMethodId = setupIntent.payment_method as string

            if (paymentMethodId) {
              // Set as default payment method on the customer
              await stripe.customers.update(session.customer as string, {
                invoice_settings: { default_payment_method: paymentMethodId },
              })
            }
          }

          console.log('[stripe/webhook] Setup checkout completed:', { orgId, plan })
          await adminClient
            .from('organizations')
            .update({
              plan,
              stripe_customer_id: session.customer as string,
              subscription_status: 'pending_approval',
            })
            .eq('id', orgId)
        } else if (orgId && plan && session.subscription) {
          // Subscription mode (e.g. resubscribing from billing page)
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          console.log('[stripe/webhook] Subscription checkout completed:', { orgId, plan, status: subscription.status })
          await adminClient
            .from('organizations')
            .update({
              plan,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              subscription_status: subscription.status,
              trial_ends_at: subscription.trial_end
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
            })
            .eq('id', orgId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.org_id

        if (orgId) {
          console.log('[stripe/webhook] Subscription updated:', { orgId, status: subscription.status })

          const updateData: Record<string, unknown> = {
            subscription_status: subscription.status,
            stripe_subscription_id: subscription.id,
          }

          if (subscription.trial_end) {
            updateData.trial_ends_at = new Date(subscription.trial_end * 1000).toISOString()
          }

          // Update plan based on price
          const priceId = subscription.items.data[0]?.price?.id
          if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID) {
            updateData.plan = 'professional'
          } else if (priceId === process.env.STRIPE_AGENCY_PRICE_ID) {
            updateData.plan = 'agency'
          }

          await adminClient
            .from('organizations')
            .update(updateData)
            .eq('id', orgId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.org_id

        if (orgId) {
          console.log('[stripe/webhook] Subscription canceled:', { orgId })
          await adminClient
            .from('organizations')
            .update({
              plan: 'free',
              subscription_status: 'canceled',
              stripe_subscription_id: null,
            })
            .eq('id', orgId)
        }
        break
      }

      case 'customer.subscription.trial_will_end': {
        // Fires 3 days before trial ends
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.org_id

        if (orgId) {
          console.log('[stripe/webhook] Trial ending soon:', { orgId })

          // Get org owner details for email
          const { data: owner } = await adminClient
            .from('profiles')
            .select('full_name, email')
            .eq('org_id', orgId)
            .eq('role', 'owner')
            .single()

          const { data: org } = await adminClient
            .from('organizations')
            .select('name, plan')
            .eq('id', orgId)
            .single()

          if (owner && org && subscription.trial_end) {
            try {
              await sendTrialEndedEmail({
                toEmail: owner.email,
                fullName: owner.full_name,
                organizationName: org.name,
                planName: org.plan,
                trialEndsAt: new Date(subscription.trial_end * 1000).toISOString(),
              })
            } catch (emailErr) {
              console.error('[stripe/webhook] Failed to send trial ending email:', emailErr)
            }
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        console.log('[stripe/webhook] Payment failed for customer:', customerId)

        await adminClient
          .from('organizations')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId)
        break
      }

      default:
        console.log('[stripe/webhook] Unhandled event:', event.type)
    }
  } catch (error) {
    console.error('[stripe/webhook] Error processing event:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
