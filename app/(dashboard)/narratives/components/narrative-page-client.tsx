'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Download, Loader2, Pencil, Save, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { NarrativeList } from './narrative-list'
import { NarrativeDialog } from './narrative-dialog'
import { NarrativeDocumentViewer, NarrativeDocumentViewerHandle } from './narrative-document-viewer'

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
  const [viewingNarrative, setViewingNarrative] = useState<Narrative | undefined>(
    narratives.length > 0 ? narratives[0] : undefined
  )
  const [isExporting, setIsExporting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const viewerRef = useRef<NarrativeDocumentViewerHandle>(null)

  const handleExportPdf = useCallback(async () => {
    if (!viewerRef.current) return
    setIsExporting(true)
    try {
      await viewerRef.current.exportPdf()
      toast.success('PDF exported successfully')
    } catch {
      toast.error('Failed to export PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }, [])

  const handleCreateClick = () => {
    setDialogMode('create')
    setSelectedNarrative(undefined)
    setDialogOpen(true)
  }

  const handleStartEdit = () => {
    viewerRef.current?.startEdit()
    setIsEditing(true)
  }

  const handleResetEdit = () => {
    viewerRef.current?.resetEdit()
    setIsEditing(false)
  }

  const handleSaveEdit = async () => {
    setIsSaving(true)
    try {
      await viewerRef.current?.saveEdit()
    } finally {
      setIsSaving(false)
      setIsEditing(false)
    }
  }

  const handleEditClick = (narrative: Narrative) => {
    // Select the narrative and start inline editing (same as proposal page)
    setViewingNarrative(narrative)
    // Small delay to let the viewer mount/update before starting edit
    setTimeout(() => {
      viewerRef.current?.startEdit()
      setIsEditing(true)
    }, 100)
  }

  const handleSelectNarrative = (narrative: Narrative) => {
    // If currently editing, reset before switching
    if (isEditing) {
      viewerRef.current?.resetEdit()
      setIsEditing(false)
    }
    setViewingNarrative(narrative)
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">Narratives</h1>
          <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
            Reusable content blocks for grant proposals
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Edit / Save / Reset */}
          {viewingNarrative && (
            isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={isSaving}
                  onClick={handleResetEdit}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={isSaving}
                  onClick={handleSaveEdit}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleStartEdit}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={isExporting} className="gap-2">
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Export PDF
                </Button>
              </>
            )
          )}
          <Button size="sm" onClick={handleCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            New Narrative
          </Button>
        </div>
      </div>

      {/* Split layout: list + document viewer */}
      <div className="flex gap-4" style={{ height: '82vh' }}>
        {/* Left panel: narrative list */}
        <div className="w-[320px] min-w-[320px] overflow-y-auto pr-1">
          <NarrativeList
            initialData={narratives}
            onEditClick={handleEditClick}
            onSelectNarrative={handleSelectNarrative}
            selectedNarrativeId={viewingNarrative?.id}
          />
        </div>

        {/* Right panel: document viewer */}
        <div className="flex-1 min-w-0">
          {viewingNarrative ? (
            <NarrativeDocumentViewer
              ref={viewerRef}
              title={viewingNarrative.title}
              content={viewingNarrative.content}
              category={viewingNarrative.category}
              narrativeId={viewingNarrative.id}
              tags={viewingNarrative.tags}
            />
          ) : (
            <div className="flex items-center justify-center h-full rounded-lg border border-dashed border-border bg-muted/20">
              <p className="text-muted-foreground text-sm">
                Select a narrative to view its content
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dialog */}
      <NarrativeDialog
        mode={dialogMode}
        narrative={selectedNarrative}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
