import { differenceInHours, differenceInDays, isPast } from 'date-fns'

export type UrgencyLevel = 'overdue' | 'critical' | 'urgent' | 'soon' | 'normal'

/**
 * Calculate urgency level based on deadline proximity
 * @param deadline - Target deadline date
 * @returns UrgencyLevel - overdue, critical (<24h), urgent (<48h), soon (<7d), or normal
 */
export function calculateUrgency(deadline: Date): UrgencyLevel {
  if (isPast(deadline)) {
    return 'overdue'
  }

  const hoursRemaining = differenceInHours(deadline, new Date())

  if (hoursRemaining < 24) {
    return 'critical'
  }

  if (hoursRemaining < 48) {
    return 'urgent'
  }

  const daysRemaining = differenceInDays(deadline, new Date())

  if (daysRemaining < 7) {
    return 'soon'
  }

  return 'normal'
}

/**
 * Get shadcn Badge variant for urgency level
 * @param level - UrgencyLevel
 * @returns Badge variant: 'destructive' for overdue/critical, 'secondary' for urgent, 'outline' for soon/normal
 */
export function getUrgencyBadgeVariant(
  level: UrgencyLevel
): 'destructive' | 'secondary' | 'outline' {
  switch (level) {
    case 'overdue':
    case 'critical':
      return 'destructive'
    case 'urgent':
      return 'secondary' // Component will add custom yellow classes
    case 'soon':
    case 'normal':
      return 'outline'
  }
}

/**
 * Get human-readable label for urgency level
 * @param level - UrgencyLevel
 * @returns Human-readable urgency label
 */
export function getUrgencyLabel(level: UrgencyLevel): string {
  switch (level) {
    case 'overdue':
      return 'Overdue'
    case 'critical':
      return 'Critical (<24h)'
    case 'urgent':
      return 'Urgent (<48h)'
    case 'soon':
      return 'Soon (<7d)'
    case 'normal':
      return 'On Track'
  }
}
