"use client"

import { useState, useTransition, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, X, FileIcon } from "lucide-react"
import { uploadDocument } from "../actions"
import { DOCUMENT_CATEGORIES, CATEGORY_LABELS } from "../constants"

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
]

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<string>("")
  const [files, setFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `"${file.name}" has an invalid file type. Only PDF, DOCX, XLSX, PPTX, PNG, and JPG files are allowed.`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `"${file.name}" is too large. Maximum size is 25MB.`
    }
    return null
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    setError(null)

    // Validate all new files
    for (const file of selectedFiles) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    // Add new files, avoiding duplicates by name+size
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`))
      const newFiles = selectedFiles.filter((f) => !existing.has(`${f.name}-${f.size}`))
      return [...prev, ...newFiles]
    })

    // Reset input so the same file can be re-selected if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setError(null)
  }

  function resetForm() {
    setFiles([])
    setError(null)
    setCategory("")
    setUploadProgress(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (files.length === 0) {
      setError("Please select at least one file")
      return
    }

    startTransition(async () => {
      const errors: string[] = []
      let successCount = 0

      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length })

        const formData = new FormData()
        formData.set("file", files[i])
        if (category) {
          formData.set("category", category)
        }

        const result = await uploadDocument(formData)
        if (result.error) {
          errors.push(`${files[i].name}: ${result.error}`)
        } else {
          successCount++
        }
      }

      setUploadProgress(null)

      if (errors.length > 0) {
        setError(errors.join("\n"))
        // Remove successfully uploaded files from the list
        if (successCount > 0) {
          setFiles((prev) => prev.slice(successCount))
        }
      } else {
        setOpen(false)
        resetForm()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        <Button data-tour="documents-upload-btn">
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload documents to your organization&apos;s vault. Accepted formats: PDF, DOCX, XLSX, PPTX, PNG, JPG (max 25MB each).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Files</Label>
            <Input
              ref={fileInputRef}
              id="file"
              name="file"
              type="file"
              accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg"
              multiple
              onChange={handleFileChange}
              disabled={isPending}
            />
          </div>
          {files.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}`}
                  className="flex items-center gap-2 text-sm bg-muted rounded-md px-3 py-1.5"
                >
                  <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    disabled={isPending}
                    className="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                {files.length} file{files.length !== 1 ? "s" : ""} selected
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category (or let AI decide)" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat] || cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3 whitespace-pre-line">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || files.length === 0}>
              {isPending && uploadProgress
                ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...`
                : files.length > 1
                  ? `Upload ${files.length} Files`
                  : "Upload"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
