'use client'

import { useState, useEffect, useCallback, useRef, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Download, Loader2, Pencil, Save, RotateCcw, X } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { format } from "date-fns"
import { NarrativeDocumentViewer, NarrativeDocumentViewerHandle } from "../../components/narrative-document-viewer"
import { updateNarrative } from "../../actions"

type Narrative = {
  id: string
  org_id: string
  title: string
  content: string
  category: string | null
  tags: string[] | null
  embedding: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  mission: 'Mission',
  impact: 'Impact',
  methods: 'Methods',
  evaluation: 'Evaluation',
  sustainability: 'Sustainability',
  capacity: 'Capacity',
  budget_narrative: 'Budget Narrative',
  other: 'Other',
}

interface NarrativeDetailClientProps {
  narrative: Narrative
}

function wordCount(html: string): number {
  if (!html) return 0
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return text ? text.split(' ').length : 0
}

export function NarrativeDetailClient({ narrative: initialNarrative }: NarrativeDetailClientProps) {
  const [narrative, setNarrative] = useState(initialNarrative)
  const viewerRef = useRef<NarrativeDocumentViewerHandle>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Sidebar editable fields
  const [editCategory, setEditCategory] = useState(narrative.category || 'none')
  const [editTags, setEditTags] = useState(narrative.tags?.join(', ') || '')
  const [tagInput, setTagInput] = useState('')
  const [isSavingMeta, startMetaTransition] = useTransition()

  // Sync sidebar state when narrative updates (e.g. from realtime)
  useEffect(() => {
    setEditCategory(narrative.category || 'none')
    setEditTags(narrative.tags?.join(', ') || '')
  }, [narrative.category, narrative.tags])

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

  // Save category change
  const handleCategoryChange = (value: string) => {
    setEditCategory(value)
    const newCategory = value === 'none' ? '' : value
    startMetaTransition(async () => {
      const formData = new FormData()
      formData.set('title', narrative.title)
      formData.set('content', narrative.content)
      formData.set('category', newCategory)
      formData.set('tags', narrative.tags?.join(', ') || '')
      const result = await updateNarrative(narrative.id, formData)
      if (result.error) {
        toast.error('Failed to update category')
        setEditCategory(narrative.category || 'none')
      } else {
        toast.success('Category updated')
      }
    })
  }

  // Add a tag
  const handleAddTag = () => {
    const newTag = tagInput.trim()
    if (!newTag) return
    const currentTags = narrative.tags || []
    if (currentTags.includes(newTag)) {
      setTagInput('')
      return
    }
    const updatedTags = [...currentTags, newTag]
    setTagInput('')
    // Optimistic update
    setNarrative(prev => ({ ...prev, tags: updatedTags }))
    startMetaTransition(async () => {
      const formData = new FormData()
      formData.set('title', narrative.title)
      formData.set('content', narrative.content)
      formData.set('category', narrative.category || '')
      formData.set('tags', updatedTags.join(', '))
      const result = await updateNarrative(narrative.id, formData)
      if (result.error) {
        toast.error('Failed to add tag')
        // Revert
        setNarrative(prev => ({ ...prev, tags: currentTags }))
      } else {
        toast.success('Tag added')
      }
    })
  }

  // Remove a tag
  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = narrative.tags || []
    const updatedTags = currentTags.filter(t => t !== tagToRemove)
    // Optimistic update
    setNarrative(prev => ({ ...prev, tags: updatedTags }))
    startMetaTransition(async () => {
      const formData = new FormData()
      formData.set('title', narrative.title)
      formData.set('content', narrative.content)
      formData.set('category', narrative.category || '')
      formData.set('tags', updatedTags.join(', '))
      const result = await updateNarrative(narrative.id, formData)
      if (result.error) {
        toast.error('Failed to remove tag')
        // Revert
        setNarrative(prev => ({ ...prev, tags: currentTags }))
      } else {
        toast.success('Tag removed')
      }
    })
  }

  // Realtime subscription for narrative updates
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`narrative:${narrative.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: `id=eq.${narrative.id}`,
        },
        (payload) => {
          const doc = payload.new as Record<string, unknown>
          const meta = doc.metadata as Record<string, unknown> | null
          setNarrative({
            id: doc.id as string,
            org_id: doc.org_id as string,
            title: (doc.title as string) || (doc.name as string) || 'Untitled',
            content: (doc.extracted_text as string) || '',
            category: (doc.ai_category as string) || null,
            tags: (meta?.tags as string[]) || null,
            embedding: doc.embedding as string | null,
            metadata: meta,
            created_at: doc.created_at as string | null,
            updated_at: doc.updated_at as string | null,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [narrative.id])

  const words = wordCount(narrative.content)

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/narratives">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Narratives
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">{narrative.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-muted-foreground">
            {narrative.category ? CATEGORY_LABELS[narrative.category] || narrative.category : 'Uncategorized'}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            {/* Edit / Save / Reset */}
            {isEditing ? (
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
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleStartEdit}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}

            {/* Export PDF */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={isExporting}
              onClick={handleExportPdf}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area with metadata sidebar */}
      <div className="flex gap-6">
        {/* Document viewer */}
        <div className="flex-1 min-w-0">
          <NarrativeDocumentViewer
            ref={viewerRef}
            title={narrative.title}
            content={narrative.content}
            category={narrative.category}
            narrativeId={narrative.id}
            tags={narrative.tags}
          />
        </div>

        {/* Metadata sidebar */}
        <div className="w-[300px] shrink-0">
          <div className="sticky top-8 max-h-[82vh] overflow-y-auto rounded-lg border bg-background p-4 space-y-5">
            <h3 className="font-semibold text-sm">Details</h3>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={editCategory} onValueChange={handleCategoryChange} disabled={isSavingMeta}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tags</Label>
              <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                {narrative.tags && narrative.tags.length > 0 ? (
                  narrative.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        disabled={isSavingMeta}
                        className="ml-0.5 hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No tags</span>
                )}
              </div>
              <div className="flex gap-1.5">
                <Input
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                  className="h-8 text-sm"
                  disabled={isSavingMeta}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 shrink-0"
                  onClick={handleAddTag}
                  disabled={isSavingMeta || !tagInput.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Info</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Words</span>
                  <span className="font-medium">{words.toLocaleString()}</span>
                </div>

                {narrative.created_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">{format(new Date(narrative.created_at), 'MMM d, yyyy')}</span>
                  </div>
                )}

                {narrative.updated_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Updated</span>
                    <span className="font-medium">{format(new Date(narrative.updated_at), 'MMM d, yyyy')}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="text-xs">
                    {narrative.embedding ? 'Indexed' : 'Not indexed'}
                  </Badge>
                </div>
              </div>
            </div>

            {isSavingMeta && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
