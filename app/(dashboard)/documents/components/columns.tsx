"use client"

import { ColumnDef } from "@tanstack/react-table"
import { formatDistanceToNow } from "date-fns"
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  File as FileIcon,
} from "lucide-react"
import { Database } from "@/lib/supabase/database.types"
import { DocumentRowActions } from "./document-row-actions"

export type Document = Database["public"]["Tables"]["documents"]["Row"]

// Helper: Format file size to human-readable string
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "0 KB"
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

// Helper: Get file type label from MIME type
export function getFileTypeLabel(mimeType: string | null): string {
  if (!mimeType) return "Unknown"
  if (mimeType === "application/pdf") return "PDF"
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "Word"
  if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "Excel"
  if (mimeType === "image/png") return "PNG"
  if (mimeType === "image/jpeg") return "JPEG"
  return "Document"
}

// Helper: Get file type icon
function getFileTypeIcon(mimeType: string | null) {
  if (!mimeType) return <FileIcon className="h-4 w-4 text-muted-foreground" />
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return <FileIcon className="h-4 w-4 text-blue-500" />
  if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return <FileSpreadsheet className="h-4 w-4 text-green-500" />
  if (mimeType.startsWith("image/")) return <FileImage className="h-4 w-4 text-purple-500" />
  return <FileIcon className="h-4 w-4 text-muted-foreground" />
}

export const columns: ColumnDef<Document>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      const fileType = row.original.file_type
      const aiCategory = row.original.ai_category
      return (
        <div className="flex items-center gap-2">
          {getFileTypeIcon(fileType)}
          <div className="min-w-0">
            <span className="font-medium block truncate">{name}</span>
            {aiCategory && (
              <span className="text-xs text-muted-foreground truncate block">{aiCategory}</span>
            )}
          </div>
        </div>
      )
    },
    filterFn: "includesString",
  },
  {
    accessorKey: "file_type",
    header: "Type",
    cell: ({ row }) => {
      const fileType = row.getValue("file_type") as string | null
      return <div>{getFileTypeLabel(fileType)}</div>
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    filterFn: (row, _columnId, filterValue) => {
      if (filterValue === "uncategorized") {
        return !row.original.category && !row.original.ai_category
      }
      const category = row.original.category || ""
      const aiCategory = row.original.ai_category || ""
      return category === filterValue || aiCategory === filterValue
    },
    cell: ({ row }) => {
      const aiCategory = row.original.ai_category
      const category = row.original.category
      const createdAt = row.original.created_at

      // Show "Categorizing..." if recently uploaded and no AI category yet
      const isRecent = createdAt
        ? new Date().getTime() - new Date(createdAt).getTime() < 5 * 60 * 1000
        : false

      if (!aiCategory && !category && isRecent) {
        return <span className="text-muted-foreground text-sm italic">Categorizing...</span>
      }

      return <div className="capitalize">{aiCategory || category || "Uncategorized"}</div>
    },
  },
  {
    accessorKey: "file_size",
    header: "Size",
    cell: ({ row }) => {
      const size = row.getValue("file_size") as number | null
      return <div className="text-muted-foreground">{formatFileSize(size)}</div>
    },
  },
  {
    accessorKey: "created_at",
    header: "Uploaded",
    cell: ({ row }) => {
      const createdAt = row.getValue("created_at") as string | null
      if (!createdAt) return <div className="text-muted-foreground">Unknown</div>
      return (
        <div className="text-muted-foreground">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <DocumentRowActions document={row.original} />
      </div>
    ),
  },
]
