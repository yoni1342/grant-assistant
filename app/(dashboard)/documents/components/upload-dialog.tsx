"use client"

import { useState, useTransition, useRef } from "react"
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
import { Upload } from "lucide-react"
import { uploadDocument } from "../actions"

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
]

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export function UploadDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Only PDF, DOCX, XLSX, PNG, and JPG files are allowed."
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File too large. Maximum size is 25MB."
    }
    return null
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const file = formData.get("file") as File

    if (!file || !file.name) {
      setError("Please select a file")
      return
    }

    // Client-side validation
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    startTransition(async () => {
      const result = await uploadDocument(formData)
      if (result.error) {
        setError(result.error)
      } else {
        // Success - close dialog and reset
        setOpen(false)
        setError(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document to your organization's vault. Accepted formats: PDF, DOCX, XLSX, PNG, JPG (max 25MB).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              ref={fileInputRef}
              id="file"
              name="file"
              type="file"
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
              disabled={isPending}
              required
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
