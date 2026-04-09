/**
 * Maps internal/technical errors to user-friendly messages.
 * Never expose raw database, n8n, or internal error details to end users.
 */

const FRIENDLY_MESSAGES: Record<string, string> = {
  // n8n / workflow errors
  'grant-discovery': 'Unable to search for grants right now. Please try again in a moment.',
  'grant-screening': 'Unable to process this grant right now. Please try again.',
  'proposal-generation': 'Unable to generate the proposal right now. Please try again.',
  'generate-checklist': 'Unable to generate the checklist right now. Please try again.',
  'prepare-submission': 'Unable to prepare the submission right now. Please try again.',
  'screen-grant': 'Unable to screen this grant right now. Please try again.',
  'record-award': 'Unable to record the award right now. Please try again.',
  'process-document': 'Unable to process the document right now. Please try again.',
  'customize-narrative': 'Unable to customize the narrative right now. Please try again.',
  'review-proposal': 'Unable to review the proposal right now. Please try again.',
  'analyze-funder': 'Unable to analyze the funder right now. Please try again.',
  'fetch-grants': 'Unable to fetch grants right now. Please try again.',
}

/** Generic fallback for unknown workflow errors */
const WORKFLOW_FALLBACK = 'Something went wrong while processing your request. Please try again.'

/** Generic fallback for database/server errors */
const SERVER_FALLBACK = 'Something went wrong. Please try again or contact support if the issue persists.'

/**
 * Returns a user-friendly error message for a workflow/service error.
 * Logs the raw error server-side for debugging.
 */
export function friendlyWorkflowError(service: string, rawError?: unknown): string {
  if (rawError) {
    console.error(`[${service}] Raw error:`, rawError)
  }
  return FRIENDLY_MESSAGES[service] || WORKFLOW_FALLBACK
}

/**
 * Sanitizes a server/database error for display to the user.
 * Passes through messages that are already user-friendly (no technical jargon).
 * Replaces anything that looks like an internal error with a generic message.
 */
export function sanitizeError(error: unknown, fallback?: string): string {
  const msg = error instanceof Error ? error.message : typeof error === 'string' ? error : ''

  // Already user-friendly messages — pass through
  if (isFriendlyMessage(msg)) {
    return msg
  }

  // Log the raw error for debugging
  console.error('[sanitizeError] Raw:', msg)

  return fallback || SERVER_FALLBACK
}

/**
 * Checks if a message looks user-friendly (no technical jargon).
 */
function isFriendlyMessage(msg: string): boolean {
  if (!msg) return false

  // Patterns that indicate raw/technical errors
  const technicalPatterns = [
    /postgres/i,
    /supabase/i,
    /PGRST\d/,           // PostgREST error codes
    /violates\s/i,        // constraint violations
    /duplicate key/i,
    /relation\s+"?\w/i,   // relation "table_name"
    /column\s+"?\w/i,     // column "col_name"
    /syntax error/i,
    /ECONNREFUSED/,
    /ETIMEDOUT/,
    /ENOTFOUND/,
    /FetchError/i,
    /TypeError/i,
    /ReferenceError/i,
    /socket hang up/i,
    /SSL/i,
    /certificate/i,
    /CORS/i,
    /500\s+Internal/i,
    /502\s+Bad/i,
    /503\s+Service/i,
    /504\s+Gateway/i,
    /webhook/i,
    /n8n/i,
    /workflow/i,
    /node\s+\w+\s+error/i,
    /execution\s+(id|error|failed)/i,
    /JSON\.parse/i,
    /Unexpected token/i,
    /undefined is not/i,
    /null is not/i,
    /Cannot read prop/i,
    /stack trace/i,
    /at\s+\w+\s+\(/,     // stack frame: "at Function ("
    /\.js:\d+/,           // file.js:123
    /\.ts:\d+/,           // file.ts:123
  ]

  return !technicalPatterns.some((pattern) => pattern.test(msg))
}
