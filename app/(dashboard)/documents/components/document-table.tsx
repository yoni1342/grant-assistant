"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { createClient } from "@/lib/supabase/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { columns, Document } from "./columns"
import { DOCUMENT_CATEGORIES } from "../constants"

interface DocumentTableProps {
  initialData: Document[]
}

export function DocumentTable({ initialData }: DocumentTableProps) {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>(initialData)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const table = useReactTable({
    data: documents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      columnFilters,
      globalFilter,
    },
    globalFilterFn: (row, columnId, filterValue) => {
      // Global filter only applies to name column
      const name = row.getValue("name") as string
      return name.toLowerCase().includes(filterValue.toLowerCase())
    },
  })

  function handleCategoryFilterChange(value: string) {
    if (value === "all") {
      setColumnFilters((prev) => prev.filter((f) => f.id !== "category"))
    } else {
      setColumnFilters((prev) => [
        ...prev.filter((f) => f.id !== "category"),
        { id: "category", value },
      ])
    }
  }

  const isEmpty = initialData.length === 0
  const isFiltered = table.getRowModel().rows.length === 0 && !isEmpty

  // Realtime subscription for live updates
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('document-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'documents' },
        (payload) => {
          setDocuments(prev => [payload.new as Document, ...prev])
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'documents' },
        (payload) => {
          setDocuments(prev => prev.map(doc =>
            doc.id === payload.new.id ? (payload.new as Document) : doc
          ))
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'documents' },
        (payload) => {
          setDocuments(prev => prev.filter(doc => doc.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search documents..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Select onValueChange={handleCategoryFilterChange} defaultValue="all">
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="uncategorized">Uncategorized</SelectItem>
            {DOCUMENT_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/documents/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {isEmpty ? (
                    <div className="text-muted-foreground">
                      No documents found. Upload your first document to get started.
                    </div>
                  ) : isFiltered ? (
                    <div className="text-muted-foreground">
                      No documents match your search.
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No documents found.</div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
