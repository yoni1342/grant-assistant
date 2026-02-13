'use client'

import { useState } from 'react'
import { Tables } from '@/lib/supabase/database.types'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { NarrativeList } from './narrative-list'
import { NarrativeDialog } from './narrative-dialog'
import { AICustomizeButton } from './ai-customize-button'

type Narrative = Tables<'narratives'>

type Grant = {
  id: string
  title: string
}

interface NarrativePageClientProps {
  narratives: Narrative[]
  grants: Grant[]
}

export function NarrativePageClient({ narratives, grants }: NarrativePageClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [selectedNarrative, setSelectedNarrative] = useState<Narrative | undefined>()

  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiNarrative, setAiNarrative] = useState<Narrative | undefined>()

  const handleCreateClick = () => {
    setDialogMode('create')
    setSelectedNarrative(undefined)
    setDialogOpen(true)
  }

  const handleEditClick = (narrative: Narrative) => {
    setDialogMode('edit')
    setSelectedNarrative(narrative)
    setDialogOpen(true)
  }

  const handleAICustomizeClick = (narrative: Narrative) => {
    setAiNarrative(narrative)
    setAiDialogOpen(true)
  }

  return (
    <>
      <Button onClick={handleCreateClick}>
        <Plus className="h-4 w-4 mr-2" />
        New Narrative
      </Button>

      <NarrativeList
        initialData={narratives}
        grants={grants}
        onEditClick={handleEditClick}
        onAICustomizeClick={handleAICustomizeClick}
      />

      <NarrativeDialog
        mode={dialogMode}
        narrative={selectedNarrative}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      {aiNarrative && (
        <AICustomizeButton
          narrativeId={aiNarrative.id}
          grants={grants}
          open={aiDialogOpen}
          onOpenChange={setAiDialogOpen}
        />
      )}
    </>
  )
}
