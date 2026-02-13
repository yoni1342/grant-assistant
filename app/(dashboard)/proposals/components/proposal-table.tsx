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
import { format } from "date-fns"
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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Loader2 } from "lucide-react"

export interface Proposal {
  id: string
  title: string
  status: 'draft' | 'generating' | 'review' | 'final'
  quality_score: number | null
  created_at: string
  updated_at: string
  grant: {
    id: string
    title: string
    funder_name: string | null
  } | null
}

interface ProposalTableProps {
  initialData: Proposal[]
}

const columns: ColumnDef<Proposal>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => {
      const proposal = row.original
      return (
        <Link
          href={`/proposals/${proposal.id}`}
          className="font-medium hover:underline"
        >
          {proposal.title}
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
          {grant?.title || "—"}
        </span>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string

      if (status === "generating") {
        return (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generating
          </Badge>
        )
      }

      const variantMap: Record<string, "default" | "secondary" | "outline"> = {
        draft: "secondary",
        review: "outline",
        final: "default",
      }

      return (
        <Badge variant={variantMap[status] || "secondary"}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      )
    },
  },
  {
    accessorKey: "quality_score",
    header: "Quality Score",
    cell: ({ row }) => {
      const score = row.getValue("quality_score") as number | null

      if (score === null) {
        return <span className="text-muted-foreground">—</span>
      }

      const colorClass =
        score >= 80
          ? "text-green-600"
          : score >= 60
            ? "text-yellow-600"
            : "text-red-600"

      return <span className={colorClass}>{score}/100</span>
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string
      return format(new Date(date), "MMM d, yyyy")
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const proposal = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/proposals/${proposal.id}`}>View</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                // TODO: Implement delete with confirmation dialog
                console.log("Delete proposal:", proposal.id)
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export function ProposalTable({ initialData }: ProposalTableProps) {
  const [data, setData] = useState<Proposal[]>(initialData)
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
        placeholder="Search proposals..."
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
                      No proposals yet. Generate your first proposal from a grant in the Pipeline.
                    </div>
                  ) : isFiltered ? (
                    <div className="text-muted-foreground">
                      No proposals match your search.
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No proposals found.</div>
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
