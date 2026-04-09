'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { NarrativeDialog } from './narrative-dialog'

export function NewNarrativeButton() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Button data-tour="narratives-new-btn" size="sm" onClick={() => setDialogOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        New Narrative
      </Button>
      <NarrativeDialog
        mode="create"
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
