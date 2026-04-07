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
 * Grant eligible / pending approval email parameters
 */
export interface GrantEligibleEmailParams extends BaseEmailParams {
  organizationName: string
  grantId: string
  grantTitle: string
  funderName: string | null
  amount: string | null
  deadline: string | null
  screeningScore: number | null
  missingNarratives: boolean
  missingBudget: boolean
}

/**
 * Complete profile reminder email parameters
 */
export interface CompleteProfileEmailParams extends BaseEmailParams {
  organizationName: string
  missingNarratives: boolean
  missingBudget: boolean
  daysSinceRegistration: number
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
