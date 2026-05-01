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
 * Eligibility dimension breakdown (matches the in-app screening report).
 * Each dimension is scored 0–20.
 */
export interface GrantEligibilityDimensions {
  mission_alignment?: number | null
  target_population?: number | null
  service_fit?: number | null
  geographic_alignment?: number | null
  organizational_capacity?: number | null
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
  /** Raw deadline (ISO date or already-formatted). The template formats it for display. */
  deadline: string | null
  description?: string | null
  screeningScore: number | null
  screeningNotes?: string | null
  dimensionScores?: GrantEligibilityDimensions | null
  concerns?: string[] | null
  recommendations?: string[] | null
  categories?: string[] | null
  sourceUrl?: string | null
  missingNarratives: boolean
  missingBudget: boolean
}

/**
 * One grant row inside the grant-digest email.
 */
export interface GrantDigestItem {
  grantId: string
  title: string
  funderName: string | null
  amount: string | null
  deadline: string | null
  description?: string | null
  screeningScore: number | null
}

/**
 * Grant digest email parameters — one email covering N eligible grants for an org.
 */
export interface GrantDigestEmailParams extends BaseEmailParams {
  organizationName: string
  grants: GrantDigestItem[]
}

/**
 * Proposal ready email parameters
 */
export interface ProposalReadyEmailParams extends BaseEmailParams {
  organizationName: string
  proposalId: string
  grantTitle: string
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
 * Invite team member email parameters
 */
export interface InviteMemberEmailParams extends BaseEmailParams {
  inviterName: string
  organizationName: string
  inviteUrl: string
  role: string
}

/**
 * Support-request acknowledgment email (sent to the user who submitted).
 */
export interface SupportRequestReceivedEmailParams extends BaseEmailParams {
  ticketRef: string
  subject: string
  message: string
}

/**
 * Support-request internal notification email (sent to the support@ inbox so
 * the team has a real thread they can reply from).
 */
export interface SupportRequestInternalEmailParams {
  ticketRef: string
  category: string
  subject: string
  message: string
  submitterName: string
  submitterEmail: string
  organizationName?: string | null
  organizationPlan?: string | null
  adminUrl?: string | null
}

/**
 * Generic send email parameters
 */
export interface SendEmailParams {
  to: string
  subject: string
  htmlBody: string
  textBody: string
  replyTo?: string
}
