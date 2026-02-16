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
import { formatDistanceToNow } from "date-fns"
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
import { Badge } from "@/components/ui/badge"

export interface Budget {
  id: string
  name: string
  total_amount: number | null
  narrative: string | null
  updated_at: string | null
  grant: {
    id: string
    title: string
  } | null
}

interface BudgetTableProps {
  initialData: Budget[]
}

const columns: ColumnDef<Budget>[] = [
  {
    accessorKey: "name",
    header: "Budget Name",
    cell: ({ row }) => {
      const budget = row.original
      return (
        <Link
          href={`/budgets/${budget.id}`}
          className="font-medium hover:underline"
        >
          {budget.name}
        </Link>
      )
    },
  },
  {
    accessorKey: "grant",
    header: "Grant",
    cell: ({ row }) => {
      const grant = row.original.grant
      return (
        <span className="text-muted-foreground">
          {grant?.title || "Template"}
        </span>
      )
    },
  },
  {
    accessorKey: "total_amount",
    header: "Total Amount",
    cell: ({ row }) => {
      const amount = row.getValue("total_amount") as number | null

      if (amount === null) {
        return <span className="text-muted-foreground">—</span>
      }

      return (
        <span className="font-medium">
          ${amount.toLocaleString()}
        </span>
      )
    },
  },
  {
    accessorKey: "narrative",
    header: "Narrative Status",
    cell: ({ row }) => {
      const narrative = row.getValue("narrative") as string | null

      if (narrative) {
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200">
            Generated
          </Badge>
        )
      }

      return (
        <Badge variant="secondary">
          Pending
        </Badge>
      )
    },
  },
  {
    accessorKey: "updated_at",
    header: "Updated",
    cell: ({ row }) => {
      const date = row.getValue("updated_at") as string | null

      if (!date) {
        return <span className="text-muted-foreground">—</span>
      }

      return (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(date), { addSuffix: true })}
        </span>
      )
    },
  },
]

export function BudgetTable({ initialData }: BudgetTableProps) {
  const [data, setData] = useState<Budget[]>(initialData)
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
        placeholder="Search budgets..."
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
                  onClick={() => window.location.href = `/budgets/${row.original.id}`}
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
                      No budgets yet. Create your first budget.
                    </div>
                  ) : isFiltered ? (
                    <div className="text-muted-foreground">
                      No budgets match your search.
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No budgets found.</div>
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
