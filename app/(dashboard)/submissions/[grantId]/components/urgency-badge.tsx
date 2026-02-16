"use client"

import { Badge } from '@/components/ui/badge'
import { calculateUrgency, getUrgencyBadgeVariant, getUrgencyLabel } from '@/lib/utils/urgency'

interface UrgencyBadgeProps {
  deadline: string // ISO date string from database
}

export function UrgencyBadge({ deadline }: UrgencyBadgeProps) {
  const deadlineDate = new Date(deadline)
  const urgency = calculateUrgency(deadlineDate)
  const variant = getUrgencyBadgeVariant(urgency)
  const label = getUrgencyLabel(urgency)

  return (
    <Badge
      variant={variant}
      className={urgency === 'urgent' ? 'bg-yellow-500 text-white hover:bg-yellow-600' : ''}
    >
      {label}
    </Badge>
  )
}
