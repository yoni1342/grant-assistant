import { NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/stripe/client'
import { createClient, getUserOrgId, createAdminClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    console.log('[stripe/customer-portal] Request received')
    const supabase = await createClient()
    const { orgId, error: authError } = await getUserOrgId(supabase)
    if (!orgId) {
      console.error('[stripe/customer-portal] Auth failed:', authError)
      return NextResponse.json({ error: authError || 'Not authenticated' }, { status: 401 })
    }

    console.log('[stripe/customer-portal] Fetching org:', orgId)
    const adminClient = createAdminClient()
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', orgId)
      .single()

    if (orgError) {
      console.error('[stripe/customer-portal] Org fetch error:', orgError.message)
    }

    if (!org?.stripe_customer_id) {
      console.error('[stripe/customer-portal] No stripe_customer_id for org:', orgId)
      return NextResponse.json({ error: 'No billing account found' }, { status: 400 })
    }

    console.log('[stripe/customer-portal] Creating portal session for customer:', org.stripe_customer_id)
    const stripe = getStripeClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${appUrl}/billing`,
    })

    console.log('[stripe/customer-portal] Portal session created:', { sessionId: session.id, url: session.url ? 'OK' : 'MISSING' })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[stripe/customer-portal] Error:', errMsg, error)
    return NextResponse.json(
      { error: `Failed to create portal session: ${errMsg}` },
      { status: 500 }
    )
  }
}
