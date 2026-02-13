"use client"

import { useState } from "react"
import {
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
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
import { columns, Document, getFileTypeLabel } from "./columns"

interface DocumentTableProps {
  initialData: Document[]
}

export function DocumentTable({ initialData }: DocumentTableProps) {
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

  function handleTypeFilterChange(value: string) {
    if (value === "all") {
      setColumnFilters((prev) => prev.filter((f) => f.id !== "file_type"))
    } else {
      setColumnFilters((prev) => [
        ...prev.filter((f) => f.id !== "file_type"),
        { id: "file_type", value },
      ])
    }
  }

  const isEmpty = initialData.length === 0
  const isFiltered = table.getRowModel().rows.length === 0 && !isEmpty

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
        <Select onValueChange={handleTypeFilterChange} defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="application/pdf">PDF</SelectItem>
            <SelectItem value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">Word</SelectItem>
            <SelectItem value="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">Excel</SelectItem>
            <SelectItem value="image/png">PNG</SelectItem>
            <SelectItem value="image/jpeg">JPEG</SelectItem>
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
                <TableRow key={row.id}>
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
