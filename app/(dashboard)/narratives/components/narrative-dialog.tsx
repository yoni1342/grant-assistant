'use client'

import { useState, useEffect, useTransition } from 'react'
import { Tables } from '@/lib/supabase/database.types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NarrativeEditor } from './narrative-editor'
import { createNarrative, updateNarrative } from '../actions'

type Narrative = Tables<'narratives'>

interface NarrativeDialogProps {
  mode: 'create' | 'edit'
  narrative?: Narrative
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NarrativeDialog({ mode, narrative, open, onOpenChange }: NarrativeDialogProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>('')
  const [tags, setTags] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Initialize form when dialog opens or narrative changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && narrative) {
        setTitle(narrative.title)
        setCategory(narrative.category || '')
        setTags(narrative.tags?.join(', ') || '')
        setContent(narrative.content)
      } else {
        // Reset form for create mode
        setTitle('')
        setCategory('')
        setTags('')
        setContent('')
      }
      setError(null)
    }
  }, [open, mode, narrative])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !content.trim()) {
      setError('Title and content are required')
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.set('title', title.trim())
      formData.set('content', content)
      formData.set('category', category || '')
      formData.set('tags', tags)

      let result
      if (mode === 'create') {
        result = await createNarrative(formData)
      } else if (narrative) {
        result = await updateNarrative(narrative.id, formData)
      }

      if (result?.error) {
        setError(result.error)
      } else {
        // Success - close dialog
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Narrative' : 'Edit Narrative'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new reusable narrative block for your grant proposals.'
              : 'Edit this narrative block. Changes will be saved to your library.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Organization Mission Statement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category (optional)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                <SelectItem value="mission">Mission</SelectItem>
                <SelectItem value="impact">Impact</SelectItem>
                <SelectItem value="methods">Methods</SelectItem>
                <SelectItem value="evaluation">Evaluation</SelectItem>
                <SelectItem value="sustainability">Sustainability</SelectItem>
                <SelectItem value="capacity">Capacity</SelectItem>
                <SelectItem value="budget_narrative">Budget Narrative</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (optional)</Label>
            <Input
              id="tags"
              placeholder="e.g., education, youth, STEM (comma-separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label>Content</Label>
            <NarrativeEditor
              content={content}
              onUpdate={setContent}
              placeholder="Start writing your narrative..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : mode === 'create' ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
