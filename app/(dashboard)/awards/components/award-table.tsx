"use client"

import { useState } from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { format, parseISO } from "date-fns"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils/analytics"

export interface Award {
  id: string
  amount: number
  award_date: string | null
  start_date: string
  end_date: string
  requirements: string | null
  grant: {
    id: string
    title: string
    funder_name: string | null
  } | null
}

interface AwardTableProps {
  initialData: Award[]
}

const columns: ColumnDef<Award>[] = [
  {
    accessorKey: "grant",
    header: "Grant Title",
    cell: ({ row }) => {
      const award = row.original
      const grant = award.grant
      return (
        <Link
          href={`/awards/${award.id}`}
          className="font-medium hover:underline"
        >
          {grant?.title || "N/A"}
        </Link>
      )
    },
  },
  {
    accessorKey: "funder",
    header: "Funder",
    cell: ({ row }) => {
      const grant = row.original.grant
      return (
        <span className="text-muted-foreground">
          {grant?.funder_name || "N/A"}
        </span>
      )
    },
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const amount = row.getValue("amount") as number
      return (
        <span className="font-medium">
          {formatCurrency(amount)}
        </span>
      )
    },
  },
  {
    accessorKey: "period",
    header: "Award Period",
    cell: ({ row }) => {
      const award = row.original
      try {
        const start = format(parseISO(award.start_date), 'MMM yyyy')
        const end = format(parseISO(award.end_date), 'MMM yyyy')
        return (
          <span className="text-sm text-muted-foreground">
            {start} - {end}
          </span>
        )
      } catch {
        return <span className="text-muted-foreground">N/A</span>
      }
    },
  },
  {
    accessorKey: "award_date",
    header: "Award Date",
    cell: ({ row }) => {
      const date = row.getValue("award_date") as string | null

      if (!date) {
        return <span className="text-muted-foreground">N/A</span>
      }

      try {
        return (
          <span className="text-sm text-muted-foreground">
            {format(parseISO(date), 'MMM d, yyyy')}
          </span>
        )
      } catch {
        return <span className="text-muted-foreground">N/A</span>
      }
    },
  },
]

export function AwardTable({ initialData }: AwardTableProps) {
  const [data, setData] = useState<Award[]>(initialData)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const table = useReactTable({
    data,
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
  })

  const isEmpty = initialData.length === 0
  const isFiltered = table.getRowModel().rows.length === 0 && !isEmpty

  return (
    <div className="space-y-4">
      {/* Search */}
      <Input
        placeholder="Search awards..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="max-w-sm"
      />

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
                  className="cursor-pointer"
                  onClick={() => window.location.href = `/awards/${row.original.id}`}
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
                      No awards recorded yet. Record your first award.
                    </div>
                  ) : isFiltered ? (
                    <div className="text-muted-foreground">
                      No awards match your search.
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No awards found.</div>
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
