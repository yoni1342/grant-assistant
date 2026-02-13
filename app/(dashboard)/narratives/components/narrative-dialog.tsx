'use client'

import { Tables } from '@/lib/supabase/database.types'

type Narrative = Tables<'narratives'>

interface NarrativeDialogProps {
  mode: 'create' | 'edit'
  narrative?: Narrative
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Placeholder - will be implemented in Task 2
export function NarrativeDialog(props: NarrativeDialogProps) {
  return null
}
