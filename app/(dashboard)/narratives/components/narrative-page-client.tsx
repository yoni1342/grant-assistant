'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { NarrativeList } from './narrative-list'
import { NarrativeDialog } from './narrative-dialog'
import { AICustomizeButton } from './ai-customize-button'

type Narrative = {
  id: string
  org_id: string
  title: string
  content: string
  category: string | null
  tags: string[] | null
  embedding: string | null
  metadata: Record<string, unknown>
  created_at: string | null
  updated_at: string | null
}

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
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">Narratives</h1>
          <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
            Reusable content blocks for grant proposals
          </p>
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          New Narrative
        </Button>
      </div>

      {/* List with search/filter */}
      <NarrativeList
        initialData={narratives}
        onEditClick={handleEditClick}
        onAICustomizeClick={handleAICustomizeClick}
      />

      {/* Dialogs */}
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
    </div>
  )
}
