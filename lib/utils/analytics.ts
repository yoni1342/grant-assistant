import { differenceInDays } from 'date-fns'

export function calculateAvgTimeToSubmission(
  grants: Array<{
    created_at: string
    submissions?: Array<{ submitted_at: string }>
  }>
): number {
  // Filter grants with submissions
  const grantsWithSubmissions = grants.filter(
    (grant) => grant.submissions && grant.submissions.length > 0
  )

  if (grantsWithSubmissions.length === 0) {
    return 0
  }

  // Calculate differenceInDays for each
  const totalDays = grantsWithSubmissions.reduce((sum, grant) => {
    const createdAt = new Date(grant.created_at)
    const submittedAt = new Date(grant.submissions![0].submitted_at)
    const days = differenceInDays(submittedAt, createdAt)
    return sum + days
  }, 0)

  // Return average rounded to integer
  return Math.round(totalDays / grantsWithSubmissions.length)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}
