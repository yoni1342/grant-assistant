"use client"

import { useState, useTransition } from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, Loader2, Trash2 } from "lucide-react"
import { deleteProposals } from "../actions"

export interface Proposal {
  id: string
  title: string
  status: 'draft' | 'generating' | 'review' | 'final'
  quality_score: number | null
  quality_review: { overall_score?: number } | null
  created_at: string
  updated_at: string
  grant: {
    id: string
    title: string
    funder_name: string | null
    eligibility: {
      score?: string
      indicator?: string
      confidence?: number
    } | null
  } | null
}

interface ProposalTableProps {
  initialData: Proposal[]
}

export function ProposalTable({ initialData }: ProposalTableProps) {
  const [data] = useState<Proposal[]>(initialData)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; title: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const columns: ColumnDef<Proposal>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
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
      id: "confidence_score",
      header: "Confidence Score",
      cell: ({ row }) => {
        const confidence = row.original.grant?.eligibility?.confidence ?? null

        if (confidence === null) {
          return <span className="text-muted-foreground">—</span>
        }

        const colorClass =
          confidence >= 80
            ? "text-green-600"
            : confidence >= 60
              ? "text-yellow-600"
              : "text-red-600"

        return <span className={colorClass}>{confidence}%</span>
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
                  setDeleteTarget({
                    ids: [proposal.id],
                    title: `"${proposal.title}"`,
                  })
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

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    state: {
      columnFilters,
      globalFilter,
      rowSelection,
    },
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedCount = selectedRows.length

  function handleBulkDelete() {
    const ids = selectedRows.map((row) => row.original.id)
    setDeleteTarget({
      ids,
      title: `${selectedCount} proposal${selectedCount > 1 ? "s" : ""}`,
    })
  }

  function confirmDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteProposals(deleteTarget.ids)
      if (result.error) {
        console.error("Delete failed:", result.error)
      }
      setDeleteTarget(null)
      setRowSelection({})
    })
  }

  const isEmpty = initialData.length === 0
  const isFiltered = table.getRowModel().rows.length === 0 && !isEmpty

  return (
    <div className="space-y-4">
      {/* Search + Bulk Actions */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search proposals..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
          aria-label="Search proposals"
        />
        {selectedCount > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete {selectedCount} selected
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
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
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.ids.length === 1 ? "proposal" : "proposals"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteTarget?.title}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
