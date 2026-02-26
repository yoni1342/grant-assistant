"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileImage,
  File as FileIcon,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Document, formatFileSize, getFileTypeLabel } from "../components/columns"
import { deleteDocument, getDownloadUrl, updateDocumentCategory } from "../actions"
import { DOCUMENT_CATEGORIES } from "../constants"

interface DocumentDetailProps {
  document: Document
  signedUrl: string | null
  linkedGrant: { id: string; title: string } | null
}

function getFileTypeIcon(mimeType: string | null) {
  if (!mimeType) return <FileIcon className="h-5 w-5 text-muted-foreground" />
  if (mimeType === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return <FileIcon className="h-5 w-5 text-blue-500" />
  if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return <FileSpreadsheet className="h-5 w-5 text-green-500" />
  if (mimeType?.startsWith("image/")) return <FileImage className="h-5 w-5 text-purple-500" />
  return <FileIcon className="h-5 w-5 text-muted-foreground" />
}

function DocumentViewer({ document, signedUrl }: { document: Document; signedUrl: string | null }) {
  if (!signedUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <FileIcon className="h-16 w-16" />
        <p>Unable to preview this document</p>
      </div>
    )
  }

  const fileType = document.file_type

  // PDF — use browser's built-in viewer
  if (fileType === "application/pdf") {
    return (
      <iframe
        src={signedUrl}
        className="w-full h-full rounded-lg border"
        title={document.name || undefined}
      />
    )
  }

  // Images
  if (fileType?.startsWith("image/")) {
    return (
      <div className="flex items-center justify-center h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signedUrl}
          alt={document.name || ""}
          className="max-w-full max-h-full object-contain rounded-lg border"
        />
      </div>
    )
  }

  // Other file types — download prompt
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
      {getFileTypeIcon(fileType)}
      <div className="text-center">
        <p className="font-medium text-foreground">{document.name}</p>
        <p className="text-sm mt-1">Preview not available for {getFileTypeLabel(fileType)} files</p>
      </div>
      <Button asChild variant="outline">
        <a href={signedUrl} target="_blank" rel="noopener noreferrer">
          <Download className="mr-2 h-4 w-4" />
          Download to view
        </a>
      </Button>
    </div>
  )
}

export function DocumentDetail({ document, signedUrl, linkedGrant }: DocumentDetailProps) {
  const router = useRouter()
  const [category, setCategory] = useState(document.category || "")
  const [isSaving, startSaving] = useTransition()
  const [isDeleting, setIsDeleting] = useState(false)

  const hasUnsavedCategory = category !== (document.category || "")

  async function handleSaveCategory() {
    if (!category) return
    startSaving(async () => {
      const result = await updateDocumentCategory(document.id, category)
      if (result.error) {
        alert("Failed to update category: " + result.error)
      }
    })
  }

  async function handleDownload() {
    if (!document.file_path) return
    const { url, error } = await getDownloadUrl(document.file_path)
    if (error) {
      alert("Failed to generate download URL: " + error)
      return
    }
    if (url) {
      window.open(url, "_blank")
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const result = await deleteDocument(document.id)
      if (result.error) {
        alert("Failed to delete document: " + result.error)
        setIsDeleting(false)
      } else {
        router.push("/documents")
      }
    } catch {
      alert("Failed to delete document")
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/documents")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          {getFileTypeIcon(document.file_type)}
          <h1 className="text-xl font-semibold truncate">{document.name}</h1>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Left: Document Viewer (2/3) */}
        <div className="lg:col-span-2 min-h-[500px]">
          <DocumentViewer document={document} signedUrl={signedUrl} />
        </div>

        {/* Right: Metadata Sidebar (1/3) */}
        <div className="space-y-6">
          <div className="rounded-lg border p-4 space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Details</h2>

            {/* File type */}
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <Badge variant="secondary" className="mt-1">
                {getFileTypeLabel(document.file_type)}
              </Badge>
            </div>

            {/* Category (editable) */}
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <div className="flex gap-2 mt-1">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasUnsavedCategory && (
                  <Button
                    size="sm"
                    onClick={handleSaveCategory}
                    disabled={isSaving}
                  >
                    {isSaving ? "..." : "Save"}
                  </Button>
                )}
              </div>
            </div>

            {/* AI Category (read-only) */}
            {document.ai_category && (
              <div>
                <p className="text-sm text-muted-foreground">AI Category</p>
                <p className="text-sm mt-1">{document.ai_category}</p>
              </div>
            )}

            {/* File size */}
            <div>
              <p className="text-sm text-muted-foreground">Size</p>
              <p className="text-sm mt-1">{formatFileSize(document.file_size)}</p>
            </div>

            {/* Upload date */}
            <div>
              <p className="text-sm text-muted-foreground">Uploaded</p>
              <p className="text-sm mt-1">
                {document.created_at
                  ? new Date(document.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Unknown"}
              </p>
            </div>

            {/* Linked grant */}
            {linkedGrant && (
              <div>
                <p className="text-sm text-muted-foreground">Linked Grant</p>
                <Link
                  href={`/pipeline/${linkedGrant.id}`}
                  className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  {linkedGrant.title}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete Document"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete document?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &ldquo;{document.name}&rdquo;. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  )
}
