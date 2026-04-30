import { SendEmailCommand } from '@aws-sdk/client-ses'
import { render } from '@react-email/render'
import { getSESClient } from './client'
import type {
  SendEmailParams,
  WelcomeEmailParams,
  OrganizationApprovedEmailParams,
  OrganizationRejectedEmailParams,
  TrialEndingEmailParams,
  CompleteProfileEmailParams,
  GrantEligibleEmailParams,
  GrantDigestEmailParams,
  ProposalReadyEmailParams,
  InviteMemberEmailParams,
} from './types'
import WelcomeEmail from './templates/welcome'
import OrganizationApprovedEmail from './templates/organization-approved'
import OrganizationRejectedEmail from './templates/organization-rejected'
import TrialEndingEmail from './templates/trial-ending'
import CompleteProfileEmail from './templates/complete-profile'
import GrantEligibleEmail from './templates/grant-eligible'
import GrantDigestEmail from './templates/grant-digest'
import ProposalReadyEmail from './templates/proposal-ready'
import InviteMemberEmail from './templates/invite-member'

const FROM_EMAIL = process.env.AWS_SES_FROM_EMAIL || 'noreply@fundory.ai'
const FROM_NAME = process.env.AWS_SES_FROM_NAME || 'Fundory'
const REPLY_TO_EMAIL = process.env.AWS_SES_REPLY_TO_EMAIL || 'support@fundory.ai'

/**
 * Send email via AWS SES
 */
export async function sendEmail({ to, subject, htmlBody, textBody }: SendEmailParams): Promise<void> {
  console.log('[sendEmail] Preparing to send:', { to, subject, from: `${FROM_NAME} <${FROM_EMAIL}>`, replyTo: REPLY_TO_EMAIL })

  const sesClient = getSESClient()

  const command = new SendEmailCommand({
    Source: `${FROM_NAME} <${FROM_EMAIL}>`,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
        Text: {
          Data: textBody,
          Charset: 'UTF-8',
        },
      },
    },
    ReplyToAddresses: [REPLY_TO_EMAIL],
  })

  try {
    const response = await sesClient.send(command)
    console.log('[sendEmail] Email sent successfully:', {
      messageId: response.MessageId,
      to,
      subject,
    })
  } catch (error) {
    console.error('[sendEmail] Failed to send email:', error)
    throw error
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<void> {
  console.log('[sendWelcomeEmail] Sending welcome email to:', { toEmail: params.toEmail, fullName: params.fullName, org: params.organizationName })
  const subject = 'Welcome to Fundory - Your Grant Assistant Awaits!'

  const htmlBody = await render(WelcomeEmail(params), { pretty: true })
  const textBody = await render(WelcomeEmail(params), { plainText: true })
  console.log('[sendWelcomeEmail] Template rendered, html length:', htmlBody.length, 'text length:', textBody.length)

  await sendEmail({
    to: params.toEmail,
    subject,
    htmlBody,
    textBody,
  })
}

/**
 * Send organization approved email
 */
export async function sendOrganizationApprovedEmail(
  params: OrganizationApprovedEmailParams
): Promise<void> {
  console.log('[sendOrganizationApprovedEmail] Sending approval email to:', { toEmail: params.toEmail, fullName: params.fullName, org: params.organizationName })
  const subject = '🎉 Your Organization Has Been Approved!'

  const htmlBody = await render(OrganizationApprovedEmail(params), { pretty: true })
  const textBody = await render(OrganizationApprovedEmail(params), { plainText: true })
  console.log('[sendOrganizationApprovedEmail] Template rendered, html length:', htmlBody.length, 'text length:', textBody.length)

  await sendEmail({
    to: params.toEmail,
    subject,
    htmlBody,
    textBody,
  })
}

/**
 * Send organization rejected email
 */
export async function sendOrganizationRejectedEmail(
  params: OrganizationRejectedEmailParams
): Promise<void> {
  console.log('[sendOrganizationRejectedEmail] Sending rejection email to:', { toEmail: params.toEmail, fullName: params.fullName, org: params.organizationName, reason: params.rejectionReason })
  const subject = 'Update on Your Fundory Application'

  const htmlBody = await render(OrganizationRejectedEmail(params), { pretty: true })
  const textBody = await render(OrganizationRejectedEmail(params), { plainText: true })
  console.log('[sendOrganizationRejectedEmail] Template rendered, html length:', htmlBody.length, 'text length:', textBody.length)

  await sendEmail({
    to: params.toEmail,
    subject,
    htmlBody,
    textBody,
  })
}

/**
 * Send trial ending email
 */
export async function sendTrialEndedEmail(
  params: TrialEndingEmailParams
): Promise<void> {
  console.log('[sendTrialEndedEmail] Sending trial ending email to:', { toEmail: params.toEmail, fullName: params.fullName, org: params.organizationName })
  const subject = 'Your Fundory Trial is Ending Soon'

  const htmlBody = await render(TrialEndingEmail(params), { pretty: true })
  const textBody = await render(TrialEndingEmail(params), { plainText: true })
  console.log('[sendTrialEndedEmail] Template rendered, html length:', htmlBody.length, 'text length:', textBody.length)

  await sendEmail({
    to: params.toEmail,
    subject,
    htmlBody,
    textBody,
  })
}

/**
 * Send profile completion reminder email
 */
export async function sendCompleteProfileEmail(
  params: CompleteProfileEmailParams
): Promise<void> {
  console.log('[sendCompleteProfileEmail] Sending reminder to:', { toEmail: params.toEmail, fullName: params.fullName, org: params.organizationName, day: params.daysSinceRegistration })

  const isFinal = params.daysSinceRegistration >= 12
  const subject = isFinal
    ? 'Final Reminder: Complete Your Fundory Profile'
    : 'Complete Your Fundory Profile for Better Grant Matches'

  const htmlBody = await render(CompleteProfileEmail(params), { pretty: true })
  const textBody = await render(CompleteProfileEmail(params), { plainText: true })

  await sendEmail({
    to: params.toEmail,
    subject,
    htmlBody,
    textBody,
  })
}

/**
 * Send grant eligible / pending approval email
 */
export async function sendGrantEligibleEmail(
  params: GrantEligibleEmailParams
): Promise<void> {
  console.log('[sendGrantEligibleEmail] Sending to:', { toEmail: params.toEmail, grant: params.grantTitle, org: params.organizationName })

  const subject = `Eligible Grant: ${params.grantTitle}`

  const htmlBody = await render(GrantEligibleEmail(params), { pretty: true })
  const textBody = await render(GrantEligibleEmail(params), { plainText: true })

  await sendEmail({
    to: params.toEmail,
    subject,
    htmlBody,
    textBody,
  })
}

/**
 * Send the grant eligibility digest — a single email that lists N newly-eligible grants
 * for an org. Used by the 30-minute cron to batch screening results.
 */
export async function sendGrantDigestEmail(
  params: GrantDigestEmailParams
): Promise<void> {
  const count = params.grants.length
  console.log('[sendGrantDigestEmail] Sending to:', {
    toEmail: params.toEmail,
    org: params.organizationName,
    count,
  })

  const subject =
    count === 1
      ? `Eligible Grant: ${params.grants[0].title}`
      : `${count} eligible grants ready for review`

  const htmlBody = await render(GrantDigestEmail(params), { pretty: true })
  const textBody = await render(GrantDigestEmail(params), { plainText: true })

  await sendEmail({
    to: params.toEmail,
    subject,
    htmlBody,
    textBody,
  })
}

/**
 * Send proposal ready email
 */
export async function sendProposalReadyEmail(
  params: ProposalReadyEmailParams
): Promise<void> {
  console.log('[sendProposalReadyEmail] Sending to:', { toEmail: params.toEmail, grant: params.grantTitle, org: params.organizationName })

  const subject = `Proposal Draft Ready: ${params.grantTitle}`

  const htmlBody = await render(ProposalReadyEmail(params), { pretty: true })
  const textBody = await render(ProposalReadyEmail(params), { plainText: true })

  await sendEmail({
    to: params.toEmail,
    subject,
    htmlBody,
    textBody,
  })
}

/**
 * Send team-member invitation email — branded replacement for the default
 * Supabase Auth invite email.
 */
export async function sendInviteMemberEmail(
  params: InviteMemberEmailParams
): Promise<void> {
  console.log('[sendInviteMemberEmail] Sending to:', {
    toEmail: params.toEmail,
    org: params.organizationName,
    inviter: params.inviterName,
    role: params.role,
  })

  const subject = `${params.inviterName} invited you to ${params.organizationName} on Fundory`

  const htmlBody = await render(InviteMemberEmail(params), { pretty: true })
  const textBody = await render(InviteMemberEmail(params), { plainText: true })

  await sendEmail({
    to: params.toEmail,
    subject,
    htmlBody,
    textBody,
  })
}
