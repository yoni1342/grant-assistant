/**
 * Base email parameters
 */
export interface BaseEmailParams {
  toEmail: string
  fullName: string
}

/**
 * Welcome email parameters
 */
export interface WelcomeEmailParams extends BaseEmailParams {
  organizationName: string
}

/**
 * Organization approved email parameters
 */
export interface OrganizationApprovedEmailParams extends BaseEmailParams {
  organizationName: string
  approvedAt: string
}

/**
 * Organization rejected email parameters
 */
export interface OrganizationRejectedEmailParams extends BaseEmailParams {
  organizationName: string
  rejectionReason?: string
  rejectedAt: string
}

/**
 * Trial ending email parameters
 */
export interface TrialEndingEmailParams extends BaseEmailParams {
  organizationName: string
  planName: string
  trialEndsAt: string
}

/**
 * Generic send email parameters
 */
export interface SendEmailParams {
  to: string
  subject: string
  htmlBody: string
  textBody: string
}
