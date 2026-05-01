'use client'

import { useRef, useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, FileIcon, X } from 'lucide-react'
import { NarrativeEditor } from './narrative-editor'
import { createNarrative, updateNarrative, uploadNarrativeFile } from '../actions'

const UPLOAD_ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'text/plain',
]
const UPLOAD_MAX_SIZE = 25 * 1024 * 1024

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

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

interface NarrativeDialogProps {
  mode: 'create' | 'edit'
  narrative?: Narrative
  open: boolean
  onOpenChange: (open: boolean) => void
}

function NarrativeForm({ mode, narrative, onOpenChange }: Omit<NarrativeDialogProps, 'open'>) {
  const [title, setTitle] = useState(mode === 'edit' && narrative ? narrative.title : '')
  const [category, setCategory] = useState<string>(mode === 'edit' && narrative ? (narrative.category || 'none') : 'none')
  const [tags, setTags] = useState(mode === 'edit' && narrative ? (narrative.tags?.join(', ') || '') : '')
  const [content, setContent] = useState(mode === 'edit' && narrative ? narrative.content : '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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
      formData.set('category', category === 'none' ? '' : category)
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
        onOpenChange(false)
      }
    })
  }

  return (
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
            <SelectItem value="none">None</SelectItem>
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
  )
}

function NarrativeUploadForm({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>('none')
  const [tags, setTags] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const f = e.target.files?.[0]
    if (!f) return
    if (!UPLOAD_ALLOWED_TYPES.includes(f.type)) {
      setError(`"${f.name}" is not a supported file type.`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    if (f.size > UPLOAD_MAX_SIZE) {
      setError(`"${f.name}" is over the 25MB limit.`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.\w{2,5}$/, ''))
  }

  function clearFile() {
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!file) {
      setError('Please choose a file to upload.')
      return
    }
    startTransition(async () => {
      const fd = new FormData()
      fd.set('file', file)
      if (title.trim()) fd.set('title', title.trim())
      if (category !== 'none') fd.set('category', category)
      if (tags.trim()) fd.set('tags', tags)
      const result = await uploadNarrativeFile(fd)
      if (result?.error) {
        setError(result.error)
      } else {
        onOpenChange(false)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 min-w-0">
      <div className="space-y-2 min-w-0">
        <Label htmlFor="narrative-file">File</Label>
        <Input
          ref={inputRef}
          id="narrative-file"
          type="file"
          accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.txt"
          onChange={pickFile}
          disabled={isPending}
          className="w-full overflow-hidden"
        />
        {file && (
          <div className="flex items-center gap-2 text-sm bg-muted rounded-md px-3 py-1.5 min-w-0">
            <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate flex-1 min-w-0" title={file.name}>{file.name}</span>
            <span className="text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
            <button
              type="button"
              onClick={clearFile}
              disabled={isPending}
              className="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Accepted: PDF, DOCX, XLSX, PPTX, PNG, JPG, TXT (max 25MB). Text will be extracted automatically.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="upload-title">Title (optional)</Label>
        <Input
          id="upload-title"
          placeholder="Defaults to the file name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="upload-category">Category (optional)</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="upload-category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
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

      <div className="space-y-2">
        <Label htmlFor="upload-tags">Tags (optional)</Label>
        <Input
          id="upload-tags"
          placeholder="e.g., education, youth, STEM (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !file}>
          <Upload className="h-4 w-4 mr-1.5" />
          {isPending ? 'Uploading…' : 'Upload'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function NarrativeDialog({ mode, narrative, open, onOpenChange }: NarrativeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Narrative' : 'Edit Narrative'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new reusable narrative block. Write it directly or upload a file and we’ll extract the text.'
              : 'Edit this narrative block. Changes will be saved to your library.'}
          </DialogDescription>
        </DialogHeader>

        {open && mode === 'create' ? (
          <Tabs defaultValue="write" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="upload">Upload file</TabsTrigger>
            </TabsList>
            <TabsContent value="write" className="mt-4">
              <NarrativeForm
                key="create-new"
                mode="create"
                onOpenChange={onOpenChange}
              />
            </TabsContent>
            <TabsContent value="upload" className="mt-4">
              <NarrativeUploadForm onOpenChange={onOpenChange} />
            </TabsContent>
          </Tabs>
        ) : open ? (
          <NarrativeForm
            key={`${mode}-${narrative?.id ?? 'new'}`}
            mode={mode}
            narrative={narrative}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
