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

  console.log('[stripe/webhook] Received webhook, verifying signature...')
  console.log('[stripe/webhook] STRIPE_WEBHOOK_SECRET set:', !!process.env.STRIPE_WEBHOOK_SECRET)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[stripe/webhook] Signature verification failed:', errMsg)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('[stripe/webhook] Event verified:', { type: event.type, id: event.id })

  const adminClient = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.metadata?.org_id
        const plan = session.metadata?.plan
        console.log('[stripe/webhook] checkout.session.completed:', { orgId, plan, mode: session.mode, customer: session.customer, subscription: session.subscription })

        if (orgId && session.mode === 'setup') {
          // Setup mode: card collected, no subscription yet (trial starts on admin approval)
          const setupIntentId = session.setup_intent as string
          console.log('[stripe/webhook] Setup mode — setupIntentId:', setupIntentId)
          if (setupIntentId) {
            const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
            const paymentMethodId = setupIntent.payment_method as string
            console.log('[stripe/webhook] Payment method from setup intent:', paymentMethodId)

            if (paymentMethodId) {
              // Set as default payment method on the customer
              await stripe.customers.update(session.customer as string, {
                invoice_settings: { default_payment_method: paymentMethodId },
              })
              console.log('[stripe/webhook] Default payment method set on customer:', session.customer)
            }
          }

          const { error: updateErr } = await adminClient
            .from('organizations')
            .update({
              plan,
              stripe_customer_id: session.customer as string,
              subscription_status: 'pending_approval',
            })
            .eq('id', orgId)
          console.log('[stripe/webhook] Org updated (setup):', { orgId, plan, updateError: updateErr?.message || 'none' })

        } else if (orgId && plan && session.subscription) {
          // Subscription mode (e.g. resubscribing from billing page)
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          console.log('[stripe/webhook] Subscription checkout completed:', { orgId, plan, status: subscription.status, subscriptionId: subscription.id })

          const { error: updateErr } = await adminClient
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
          console.log('[stripe/webhook] Org updated (subscription):', { orgId, updateError: updateErr?.message || 'none' })

        } else {
          console.warn('[stripe/webhook] checkout.session.completed — no action taken:', { orgId, plan, mode: session.mode, hasSubscription: !!session.subscription })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.org_id
        const priceId = subscription.items.data[0]?.price?.id

        console.log('[stripe/webhook] customer.subscription.updated:', { orgId, status: subscription.status, subscriptionId: subscription.id, priceId, trialEnd: subscription.trial_end })

        if (orgId) {
          const updateData: Record<string, unknown> = {
            subscription_status: subscription.status,
            stripe_subscription_id: subscription.id,
          }

          if (subscription.trial_end) {
            updateData.trial_ends_at = new Date(subscription.trial_end * 1000).toISOString()
          }

          // Update plan based on price
          if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID) {
            updateData.plan = 'professional'
          } else if (priceId === process.env.STRIPE_AGENCY_PRICE_ID) {
            updateData.plan = 'agency'
          }

          console.log('[stripe/webhook] Updating org:', { orgId, updateData })
          const { error: updateErr } = await adminClient
            .from('organizations')
            .update(updateData)
            .eq('id', orgId)
          console.log('[stripe/webhook] Org updated:', { orgId, updateError: updateErr?.message || 'none' })
        } else {
          console.warn('[stripe/webhook] subscription.updated — no org_id in metadata:', { subscriptionId: subscription.id })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.org_id

        console.log('[stripe/webhook] customer.subscription.deleted:', { orgId, subscriptionId: subscription.id })

        if (orgId) {
          const { error: updateErr } = await adminClient
            .from('organizations')
            .update({
              plan: 'free',
              subscription_status: 'canceled',
              stripe_subscription_id: null,
            })
            .eq('id', orgId)
          console.log('[stripe/webhook] Org updated (deleted):', { orgId, updateError: updateErr?.message || 'none' })
        } else {
          console.warn('[stripe/webhook] subscription.deleted — no org_id in metadata:', { subscriptionId: subscription.id })
        }
        break
      }

      case 'customer.subscription.trial_will_end': {
        // Fires 3 days before trial ends
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.org_id

        console.log('[stripe/webhook] customer.subscription.trial_will_end:', { orgId, subscriptionId: subscription.id, trialEnd: subscription.trial_end })

        if (orgId) {
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

          console.log('[stripe/webhook] Trial ending — owner:', { email: owner?.email || 'not found', org: org?.name || 'not found' })

          if (owner && org && subscription.trial_end) {
            try {
              await sendTrialEndedEmail({
                toEmail: owner.email,
                fullName: owner.full_name,
                organizationName: org.name,
                planName: org.plan,
                trialEndsAt: new Date(subscription.trial_end * 1000).toISOString(),
              })
              console.log('[stripe/webhook] Trial ending email sent to:', owner.email)
            } catch (emailErr) {
              const emailErrMsg = emailErr instanceof Error ? emailErr.message : String(emailErr)
              console.error('[stripe/webhook] Failed to send trial ending email:', emailErrMsg)
            }
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        console.log('[stripe/webhook] invoice.payment_failed:', { customerId, invoiceId: invoice.id, amountDue: invoice.amount_due })

        const { error: updateErr } = await adminClient
          .from('organizations')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId)
        console.log('[stripe/webhook] Org marked past_due:', { customerId, updateError: updateErr?.message || 'none' })
        break
      }

      default:
        console.log('[stripe/webhook] Unhandled event type:', event.type, { id: event.id })
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[stripe/webhook] Error processing event:', { type: event.type, id: event.id, error: errMsg }, error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
