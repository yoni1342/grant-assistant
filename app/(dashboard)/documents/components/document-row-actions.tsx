"use client"

import { useState } from "react"
import { MoreHorizontal, Download, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { deleteDocument, getDownloadUrl } from "../actions"
import { Document } from "./columns"

interface DocumentRowActionsProps {
  document: Document
}

export function DocumentRowActions({ document }: DocumentRowActionsProps) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleDownload() {
    setIsLoading(true)
    try {
      const { url, error } = await getDownloadUrl(document.file_path)
      if (error) {
        alert("Failed to generate download URL: " + error)
        return
      }
      if (url) {
        window.open(url, "_blank")
      }
    } catch (err) {
      alert("Failed to download document")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete "${document.name}"? This action cannot be undone.`)) {
      return
    }

    setIsLoading(true)
    try {
      const result = await deleteDocument(document.id)
      if (result.error) {
        alert("Failed to delete document: " + result.error)
      }
    } catch (err) {
      alert("Failed to delete document")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          disabled={isLoading}
        >
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownload} disabled={isLoading}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDelete}
          disabled={isLoading}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
