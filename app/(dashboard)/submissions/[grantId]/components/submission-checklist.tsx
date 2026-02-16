"use client"

import { Progress } from '@/components/ui/progress'
import { ChecklistItem } from './checklist-item'

interface ChecklistItem {
  label: string
  completed: boolean
  completed_at?: string
}

interface SubmissionChecklistProps {
  checklist: {
    id: string
    items: unknown
    completion_percentage: number | null
  }
}

export function SubmissionChecklist({ checklist }: SubmissionChecklistProps) {
  const items = checklist.items as ChecklistItem[]

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">No checklist items available</p>
      </div>
    )
  }

  const totalItems = items.length
  const completedItems = items.filter(item => item.completed).length
  const completionPercentage = checklist.completion_percentage || 0

  return (
    <div className="space-y-4">
      {/* Completion progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {completedItems} of {totalItems} items complete ({completionPercentage}%)
          </span>
        </div>
        <Progress value={completionPercentage} />
      </div>

      {/* Checklist items */}
      <div className="space-y-3 mt-4">
        {items.map((item, index) => (
          <ChecklistItem
            key={index}
            id={checklist.id}
            itemIndex={index}
            label={item.label}
            initialChecked={item.completed}
          />
        ))}
      </div>
    </div>
  )
}
