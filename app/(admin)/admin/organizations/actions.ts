'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendOrganizationApprovedEmail, sendOrganizationRejectedEmail } from '@/lib/email/service'
import { getStripeClient } from '@/lib/stripe/client'
import { PLANS, TRIAL_DAYS, canAutoFetchGrants } from '@/lib/stripe/config'
import type { PlanId } from '@/lib/stripe/config'
import { sanitizeError } from '@/lib/errors'
import { seedOrgGrantsFromCentral } from '@/lib/grants/seed-from-central'

export async function approveOrganization(orgId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Authorization check
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' }

  const approvedAt = new Date().toISOString()

  const { error } = await supabase
    .from('organizations')
    .update({
      status: 'approved',
      approved_at: approvedAt,
      approved_by: user.id,
      rejection_reason: null,
    })
    .eq('id', orgId)

  if (error) return { error: sanitizeError(error, 'Something went wrong. Please try again.') }

  // Start Stripe subscription with trial for paid-plan orgs (skip for testers)
  const { data: orgData } = await supabase
    .from('organizations')
    .select('plan, stripe_customer_id, is_tester')
    .eq('id', orgId)
    .single()

  if (!orgData?.is_tester && orgData?.stripe_customer_id && orgData.plan && orgData.plan !== 'free') {
    const planConfig = PLANS[orgData.plan as PlanId]
    if (planConfig?.stripePriceId) {
      try {
        const stripe = getStripeClient()

        // Validate stored customer ID still exists in Stripe (may be stale from test mode)
        let customerId = orgData.stripe_customer_id
        try {
          await stripe.customers.retrieve(customerId)
        } catch {
          console.warn('[approveOrganization] Stored customer ID invalid (likely test mode), creating new one:', customerId)
          const { data: ownerForEmail } = await supabase
            .from('profiles')
            .select('email')
            .eq('org_id', orgId)
            .eq('role', 'owner')
            .single()
          const customer = await stripe.customers.create({
            email: ownerForEmail?.email,
            metadata: { org_id: orgId },
          })
          customerId = customer.id
          const adminClientForUpdate = createAdminClient()
          await adminClientForUpdate.from('organizations').update({ stripe_customer_id: customerId }).eq('id', orgId)
        }

        // For agency plan: create the agency record and link everything
        if (orgData.plan === 'agency') {
          const adminClient = createAdminClient()

          // Find the org owner
          const { data: ownerProfile } = await adminClient
            .from('profiles')
            .select('id')
            .eq('org_id', orgId)
            .eq('role', 'owner')
            .single()

          if (ownerProfile) {
            // Create agency record with billing info
            const { data: agency } = await adminClient
              .from('agencies')
              .insert({
                name: (await adminClient.from('organizations').select('name').eq('id', orgId).single()).data?.name || 'Agency',
                owner_user_id: ownerProfile.id,
                stripe_customer_id: customerId,
              })
              .select('id')
              .single()

            if (agency) {
              // Link org to agency and set profile agency_id
              await adminClient.from('organizations').update({ agency_id: agency.id }).eq('id', orgId)
              await adminClient.from('profiles').update({ agency_id: agency.id }).eq('id', ownerProfile.id)

              // Create subscription on the agency (not the org)
              const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: planConfig.stripePriceId }],
                trial_period_days: TRIAL_DAYS,
                metadata: { agency_id: agency.id, plan: 'agency' },
              })

              await adminClient
                .from('agencies')
                .update({
                  stripe_subscription_id: subscription.id,
                  subscription_status: 'trialing',
                  trial_ends_at: subscription.trial_end
                    ? new Date(subscription.trial_end * 1000).toISOString()
                    : null,
                })
                .eq('id', agency.id)

              // Also update org subscription fields for consistency
              await adminClient
                .from('organizations')
                .update({
                  stripe_subscription_id: subscription.id,
                  subscription_status: 'trialing',
                  trial_ends_at: subscription.trial_end
                    ? new Date(subscription.trial_end * 1000).toISOString()
                    : null,
                })
                .eq('id', orgId)

              console.log('[approveOrganization] Agency created:', agency.id, 'with subscription:', subscription.id)
            }
          }
        } else {
          // Non-agency paid plan: create subscription on org directly
          const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: planConfig.stripePriceId }],
            trial_period_days: TRIAL_DAYS,
            metadata: { org_id: orgId, plan: orgData.plan },
          })

          const adminClient = createAdminClient()
          await adminClient
            .from('organizations')
            .update({
              stripe_subscription_id: subscription.id,
              subscription_status: 'trialing',
              trial_ends_at: subscription.trial_end
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
            })
            .eq('id', orgId)

          console.log('[approveOrganization] Stripe subscription created with trial:', subscription.id)
        }
      } catch (stripeErr) {
        console.error('[approveOrganization] Failed to create Stripe subscription:', stripeErr)
        // Don't fail approval if Stripe fails — they can set up billing later
      }
    }
  }

  // Seed pipeline + kick off the n8n fetch only for plans that allow
  // automatic grant discovery. Free-tier non-testers must use Discovery
  // manually and are capped at 1 grant/day.
  const canAutoFetch = canAutoFetchGrants(orgData)

  if (canAutoFetch) {
    // Seed the org's pipeline from the central grant catalog. This replaces
    // the old per-org scraper run for the common case where the central
    // catalog already has grants. The n8n fetch is still kicked off below
    // for any sources the daily catalog hasn't covered yet.
    const seedResult = await seedOrgGrantsFromCentral(orgId)
    if (seedResult.error) {
      console.error('[approveOrganization] Failed to seed grants from central:', seedResult.error)
    } else {
      console.log(`[approveOrganization] Seeded ${seedResult.copied} grants from central catalog for org ${orgId}`)
    }

    // Trigger grant fetch workflow for the newly approved org
    if (process.env.N8N_WEBHOOK_URL) {
      const adminClient = createAdminClient()

      await adminClient.from('grant_fetch_status').upsert({
        org_id: orgId,
        status: 'searching',
        stage_message: 'Starting grant search...',
      }, { onConflict: 'org_id' })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}`
      fetch(`${process.env.N8N_WEBHOOK_URL}/fetch-grants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
        },
        body: JSON.stringify({
          org_id: orgId,
          callback_url: `${appUrl}/api/grant-fetch-status`,
          is_new_org: true,
        }),
      }).catch((err) => {
        console.error('n8n fetch-grants webhook failed:', err)
      })
    }
  }

  // Send approval email
  try {
    // Fetch org and owner details for email
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('org_id', orgId)
      .eq('role', 'owner')
      .single()

    if (org && ownerProfile) {
      console.log('[approveOrganization] Sending approval email to:', ownerProfile.email, 'for org:', org.name)
      await sendOrganizationApprovedEmail({
        toEmail: ownerProfile.email,
        fullName: ownerProfile.full_name,
        organizationName: org.name,
        approvedAt,
      })
      console.log('[approveOrganization] Approval email sent successfully')
    } else {
      console.warn('[approveOrganization] Skipping email — missing data:', { org: !!org, ownerProfile: !!ownerProfile })
    }
  } catch (error) {
    console.error('[approveOrganization] Failed to send approval email:', error)
    // Don't fail approval if email fails
  }

  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function rejectOrganization(orgId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Authorization check
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' }

  const rejectedAt = new Date().toISOString()

  const { error } = await supabase
    .from('organizations')
    .update({
      status: 'rejected',
      rejection_reason: reason || null,
    })
    .eq('id', orgId)

  if (error) return { error: sanitizeError(error, 'Something went wrong. Please try again.') }

  // Send rejection email
  try {
    // Fetch org and owner details for email
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('org_id', orgId)
      .eq('role', 'owner')
      .single()

    if (org && ownerProfile) {
      console.log('[rejectOrganization] Sending rejection email to:', ownerProfile.email, 'for org:', org.name)
      await sendOrganizationRejectedEmail({
        toEmail: ownerProfile.email,
        fullName: ownerProfile.full_name,
        organizationName: org.name,
        rejectionReason: reason,
        rejectedAt,
      })
      console.log('[rejectOrganization] Rejection email sent successfully')
    } else {
      console.warn('[rejectOrganization] Skipping email — missing data:', { org: !!org, ownerProfile: !!ownerProfile })
    }
  } catch (error) {
    console.error('[rejectOrganization] Failed to send rejection email:', error)
    // Don't fail rejection if email fails
  }

  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function deleteOrganization(orgId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' }

  const adminClient = createAdminClient()

  // Delete all associated data in dependency order, keeping user accounts.

  // 1. Delete proposal_sections (depends on proposals)
  const { data: proposals } = await adminClient
    .from('proposals')
    .select('id')
    .eq('org_id', orgId)

  if (proposals && proposals.length > 0) {
    const proposalIds = proposals.map((p) => p.id)
    await adminClient
      .from('proposal_sections')
      .delete()
      .in('proposal_id', proposalIds)
  }

  // 2. Delete reports (depends on awards)
  await adminClient.from('reports').delete().eq('org_id', orgId)

  // 3. Delete remaining org-owned tables (no child dependencies)
  await adminClient.from('proposals').delete().eq('org_id', orgId)
  await adminClient.from('awards').delete().eq('org_id', orgId)
  await adminClient.from('submissions').delete().eq('org_id', orgId)
  await adminClient.from('submission_checklists').delete().eq('org_id', orgId)
  await adminClient.from('workflow_executions').delete().eq('org_id', orgId)
  await adminClient.from('activity_log').delete().eq('org_id', orgId)
  await adminClient.from('notifications').delete().eq('org_id', orgId)
  await adminClient.from('documents').delete().eq('org_id', orgId)
  await adminClient.from('funders').delete().eq('org_id', orgId)
  await adminClient.from('search_results').delete().eq('org_id', orgId)
  await adminClient.from('grant_fetch_status').delete().eq('org_id', orgId)
  await adminClient.from('grants').delete().eq('org_id', orgId)

  // 4. Disassociate users from the org (keep their accounts)
  await adminClient
    .from('profiles')
    .update({ org_id: null })
    .eq('org_id', orgId)

  // 5. Delete the organization itself
  const { error } = await adminClient
    .from('organizations')
    .delete()
    .eq('id', orgId)

  if (error) {
    console.error('Delete organization error:', error.message)
    return { error: 'Unable to delete this organization. Please try again later.' }
  }

  revalidatePath('/admin/organizations')
  revalidatePath('/admin/users')
  return { success: true }
}

export async function suspendOrganization(orgId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('organizations')
    .update({ status: 'suspended' })
    .eq('id', orgId)

  if (error) {
    console.error('Suspend organization error:', error.message)
    return { error: 'Unable to suspend this organization. Please try again later.' }
  }

  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function unsuspendOrganization(orgId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('organizations')
    .update({ status: 'approved' })
    .eq('id', orgId)

  if (error) {
    console.error('Unsuspend organization error:', error.message)
    return { error: 'Unable to unsuspend this organization. Please try again later.' }
  }

  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function updateOrgPlan(orgId: string, newPlan: PlanId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' }

  const adminClient = createAdminClient()

  // Get current org data
  const { data: org } = await adminClient
    .from('organizations')
    .select('stripe_customer_id, stripe_subscription_id, plan')
    .eq('id', orgId)
    .single()

  if (!org) return { error: 'Organization not found' }

  // Update plan in database
  const updateData: Record<string, unknown> = { plan: newPlan }

  // If switching to free, cancel Stripe subscription if one exists
  if (newPlan === 'free' && org.stripe_subscription_id) {
    try {
      const stripe = getStripeClient()
      await stripe.subscriptions.cancel(org.stripe_subscription_id)
      updateData.stripe_subscription_id = null
      updateData.subscription_status = 'canceled'
    } catch (err) {
      console.error('[updateOrgPlan] Failed to cancel Stripe subscription:', err)
    }
  }

  // If switching to a paid plan with an existing Stripe customer
  if (newPlan !== 'free' && org.stripe_customer_id) {
    const planConfig = PLANS[newPlan]
    if (planConfig?.stripePriceId) {
      try {
        const stripe = getStripeClient()

        if (org.stripe_subscription_id) {
          // Update existing subscription to new price
          const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id)
          await stripe.subscriptions.update(org.stripe_subscription_id, {
            items: [{
              id: subscription.items.data[0].id,
              price: planConfig.stripePriceId,
            }],
            metadata: { org_id: orgId, plan: newPlan },
          })
        } else {
          // Create new subscription
          const subscription = await stripe.subscriptions.create({
            customer: org.stripe_customer_id,
            items: [{ price: planConfig.stripePriceId }],
            metadata: { org_id: orgId, plan: newPlan },
          })
          updateData.stripe_subscription_id = subscription.id
          updateData.subscription_status = subscription.status
        }
      } catch (err) {
        console.error('[updateOrgPlan] Failed to update Stripe subscription:', err)
      }
    }
  }

  const { error } = await adminClient
    .from('organizations')
    .update(updateData)
    .eq('id', orgId)

  if (error) return { error: sanitizeError(error, 'Something went wrong. Please try again.') }

  revalidatePath('/admin/organizations')
  revalidatePath(`/admin/organizations/${orgId}`)
  return { success: true }
}

export async function cancelSubscription(orgId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' }

  const adminClient = createAdminClient()

  const { data: org } = await adminClient
    .from('organizations')
    .select('stripe_subscription_id')
    .eq('id', orgId)
    .single()

  if (!org?.stripe_subscription_id) return { error: 'No active subscription found' }

  try {
    const stripe = getStripeClient()
    await stripe.subscriptions.cancel(org.stripe_subscription_id)
  } catch (err) {
    console.error('[cancelSubscription] Stripe error:', err)
    return { error: 'Failed to cancel subscription in Stripe' }
  }

  const { error } = await adminClient
    .from('organizations')
    .update({
      subscription_status: 'canceled',
      stripe_subscription_id: null,
    })
    .eq('id', orgId)

  if (error) return { error: sanitizeError(error, 'Something went wrong. Please try again.') }

  revalidatePath('/admin/organizations')
  revalidatePath(`/admin/organizations/${orgId}`)
  return { success: true }
}

export async function extendTrial(orgId: string, additionalDays: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' }

  if (additionalDays < 1 || additionalDays > 365) return { error: 'Days must be between 1 and 365' }

  const adminClient = createAdminClient()

  const { data: org } = await adminClient
    .from('organizations')
    .select('stripe_subscription_id, trial_ends_at, subscription_status')
    .eq('id', orgId)
    .single()

  if (!org) return { error: 'Organization not found' }

  // Calculate new trial end date
  const currentEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : new Date()
  const newEnd = new Date(currentEnd.getTime() + additionalDays * 24 * 60 * 60 * 1000)

  // Update Stripe subscription trial end if exists
  if (org.stripe_subscription_id) {
    try {
      const stripe = getStripeClient()
      await stripe.subscriptions.update(org.stripe_subscription_id, {
        trial_end: Math.floor(newEnd.getTime() / 1000),
      })
    } catch (err) {
      console.error('[extendTrial] Stripe error:', err)
      return { error: 'Failed to extend trial in Stripe' }
    }
  }

  const { error } = await adminClient
    .from('organizations')
    .update({
      trial_ends_at: newEnd.toISOString(),
      subscription_status: 'trialing',
    })
    .eq('id', orgId)

  if (error) return { error: sanitizeError(error, 'Something went wrong. Please try again.') }

  revalidatePath('/admin/organizations')
  revalidatePath(`/admin/organizations/${orgId}`)
  return { success: true }
}

export async function updateSubscriptionStatus(orgId: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' }

  const validStatuses = ['active', 'trialing', 'past_due', 'canceled', 'unpaid']
  if (!validStatuses.includes(status)) return { error: 'Invalid status' }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('organizations')
    .update({ subscription_status: status })
    .eq('id', orgId)

  if (error) return { error: sanitizeError(error, 'Something went wrong. Please try again.') }

  revalidatePath('/admin/organizations')
  revalidatePath(`/admin/organizations/${orgId}`)
  return { success: true }
}

export async function toggleTester(orgId: string, isTester: boolean, plan: 'professional' | 'agency' = 'professional') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!adminProfile?.is_platform_admin) return { error: 'Unauthorized' }

  const adminClient = createAdminClient()

  if (isTester && plan === 'agency') {
    // --- Agency tester: create agency record, link org and profile ---

    // Find the org owner (profile with org_id = this org and role = owner)
    let ownerProfile: { id: string } | null = null

    const { data: ownerData } = await adminClient
      .from('profiles')
      .select('id')
      .eq('org_id', orgId)
      .eq('role', 'owner')
      .single()

    ownerProfile = ownerData

    if (!ownerProfile) {
      // Fallback: find any user linked to this org
      const { data: anyProfile } = await adminClient
        .from('profiles')
        .select('id')
        .eq('org_id', orgId)
        .limit(1)
        .single()

      if (!anyProfile) return { error: 'No user found for this organization.' }
      ownerProfile = anyProfile
    }

    // Create agency record with placeholder name, setup_complete = false
    const { data: agency, error: agencyError } = await adminClient
      .from('agencies')
      .insert({
        name: 'Pending Setup',
        owner_user_id: ownerProfile.id,
        subscription_status: 'active',
        setup_complete: false,
      })
      .select('id')
      .single()

    if (agencyError || !agency) {
      return { error: sanitizeError(agencyError, 'Failed to create agency record.') }
    }

    // Update org: link to agency, set plan and tester flags
    const { error: orgUpdateError } = await adminClient
      .from('organizations')
      .update({
        is_tester: true,
        plan: 'agency',
        subscription_status: 'active',
        agency_id: agency.id,
      })
      .eq('id', orgId)

    if (orgUpdateError) {
      await adminClient.from('agencies').delete().eq('id', agency.id)
      return { error: sanitizeError(orgUpdateError, 'Failed to update organization.') }
    }

    // Update owner profile: link to agency
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ agency_id: agency.id })
      .eq('id', ownerProfile.id)

    if (profileError) {
      // Rollback: unlink org and delete agency
      await adminClient.from('organizations').update({ agency_id: null, is_tester: false, plan: 'free', subscription_status: null }).eq('id', orgId)
      await adminClient.from('agencies').delete().eq('id', agency.id)
      return { error: sanitizeError(profileError, 'Failed to update user profile.') }
    }
  } else if (isTester && plan === 'professional') {
    // --- Professional tester: current behavior ---
    const { error } = await adminClient
      .from('organizations')
      .update({
        is_tester: true,
        plan: 'professional',
        subscription_status: 'active',
      })
      .eq('id', orgId)

    if (error) return { error: sanitizeError(error, 'Something went wrong. Please try again.') }
  } else {
    // --- Remove tester ---

    // Check if this org is linked to an agency (was agency tester)
    const { data: org } = await adminClient
      .from('organizations')
      .select('agency_id, plan')
      .eq('id', orgId)
      .single()

    if (org?.agency_id && org?.plan === 'agency') {
      // Clean up: unlink profile from agency
      await adminClient
        .from('profiles')
        .update({ agency_id: null })
        .eq('agency_id', org.agency_id)

      // Unlink org from agency and reset
      await adminClient
        .from('organizations')
        .update({
          is_tester: false,
          agency_id: null,
          plan: 'free',
          subscription_status: null,
        })
        .eq('id', orgId)

      // Delete the agency record
      await adminClient
        .from('agencies')
        .delete()
        .eq('id', org.agency_id)
    } else {
      // Simple professional tester removal
      const { error } = await adminClient
        .from('organizations')
        .update({ is_tester: false })
        .eq('id', orgId)

      if (error) return { error: sanitizeError(error, 'Something went wrong. Please try again.') }
    }
  }

  revalidatePath('/admin/organizations')
  revalidatePath(`/admin/organizations/${orgId}`)
  return { success: true }
}

export async function getAdminDocumentUrl(filePath: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', url: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized', url: null }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.storage
    .from('documents')
    .createSignedUrl(filePath, 3600)

  if (error) return { error: sanitizeError(error, 'Something went wrong. Please try again.'), url: null }

  return { url: data.signedUrl, error: null }
}

export async function getAdminProposalSections(proposalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: [] }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized', data: [] }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('proposal_sections')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('sort_order', { ascending: true })

  if (error) return { error: sanitizeError(error, 'Failed to load sections'), data: [] }

  return { data: data || [], error: null }
}
