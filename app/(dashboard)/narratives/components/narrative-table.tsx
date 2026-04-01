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
import { deleteNarratives } from "../actions"

export interface Narrative {
  id: string
  org_id: string
  title: string
  content: string
  category: string | null
  tags: string[] | null
  created_at: string | null
  updated_at: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  mission: 'Mission',
  impact: 'Impact',
  methods: 'Methods',
  evaluation: 'Evaluation',
  sustainability: 'Sustainability',
  capacity: 'Capacity',
  budget_narrative: 'Budget Narrative',
  other: 'Other',
}

interface NarrativeTableProps {
  initialData: Narrative[]
}

export function NarrativeTable({ initialData }: NarrativeTableProps) {
  const [data] = useState<Narrative[]>(initialData)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; title: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const columns: ColumnDef<Narrative>[] = [
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
        const narrative = row.original
        return (
          <Link
            href={`/narratives/${narrative.id}`}
            className="font-medium hover:underline"
          >
            {narrative.title}
          </Link>
        )
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.getValue("category") as string | null
        if (!category) return <span className="text-muted-foreground">—</span>
        return (
          <Badge variant="secondary">
            {CATEGORY_LABELS[category] || category}
          </Badge>
        )
      },
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.original.tags
        if (!tags || tags.length === 0) return <span className="text-muted-foreground">—</span>
        return (
          <div className="flex gap-1 flex-wrap">
            {tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{tags.length - 3}</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ row }) => {
        const date = row.original.updated_at || row.original.created_at
        if (!date) return <span className="text-muted-foreground">—</span>
        return format(new Date(date), "MMM d, yyyy")
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const narrative = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/narratives/${narrative.id}`}>View</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setDeleteTarget({
                    ids: [narrative.id],
                    title: `"${narrative.title}"`,
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
      title: `${selectedCount} narrative${selectedCount > 1 ? "s" : ""}`,
    })
  }

  function confirmDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteNarratives(deleteTarget.ids)
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
          placeholder="Search narratives..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
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
                      No narratives yet. Create your first narrative to get started.
                    </div>
                  ) : isFiltered ? (
                    <div className="text-muted-foreground">
                      No narratives match your search.
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No narratives found.</div>
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
            <AlertDialogTitle>Delete {deleteTarget?.ids.length === 1 ? "narrative" : "narratives"}?</AlertDialogTitle>
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
