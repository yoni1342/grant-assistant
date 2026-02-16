"use client"

import { useState, useTransition } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { updateChecklistItem } from '@/app/(dashboard)/submissions/actions'
import { cn } from '@/lib/utils'

interface ChecklistItemProps {
  id: string // checklist row id
  itemIndex: number
  label: string
  initialChecked: boolean
}

export function ChecklistItem({ id, itemIndex, label, initialChecked }: ChecklistItemProps) {
  const [checked, setChecked] = useState(initialChecked)
  const [isPending, startTransition] = useTransition()

  const handleChange = (newChecked: boolean) => {
    // Optimistic update - set state immediately
    setChecked(newChecked)

    // Call server action in transition (non-blocking)
    startTransition(async () => {
      const result = await updateChecklistItem(id, itemIndex, newChecked)

      // Rollback on error
      if (result.error) {
        console.error('Error updating checklist item:', result.error)
        setChecked(!newChecked) // Rollback to previous state
      }
    })
  }

  return (
    <div className="flex items-start gap-3 group">
      <Checkbox
        id={`item-${itemIndex}`}
        checked={checked}
        onCheckedChange={handleChange}
        disabled={isPending}
        className="mt-0.5"
      />
      <label
        htmlFor={`item-${itemIndex}`}
        className={cn(
          "text-sm cursor-pointer flex-1 transition-all",
          checked && "line-through text-muted-foreground",
          isPending && "opacity-50"
        )}
      >
        {label}
      </label>
    </div>
  )
}
