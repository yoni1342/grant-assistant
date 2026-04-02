"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, RotateCcw, Trash2, Loader2, Eye } from "lucide-react";

type ArchivedGrant = {
  id: string;
  title: string;
  funder_name: string | null;
  stage: string;
  amount: number | null;
  deadline: string | null;
  created_at: string;
};

export function ArchiveClient({ initialGrants }: { initialGrants: ArchivedGrant[] }) {
  const router = useRouter();
  const [grants, setGrants] = useState(initialGrants);
  const [deleteTarget, setDeleteTarget] = useState<ArchivedGrant | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleRestore(grant: ArchivedGrant) {
    setRestoring(grant.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("grants")
      .update({ stage: "discovery" })
      .eq("id", grant.id);
    if (!error) {
      setGrants((prev) => prev.filter((g) => g.id !== grant.id));
    }
    setRestoring(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("grants").delete().eq("id", deleteTarget.id);
    setGrants((prev) => prev.filter((g) => g.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
  }

  return (
    <div className="p-6 space-y-6 w-full min-w-0">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            Archive
          </h1>
          <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
            {grants.length} archived grant{grants.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {grants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No archived grants</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Title</TableHead>
                <TableHead className="w-[20%]">Funder</TableHead>
                <TableHead className="w-[15%]">Amount</TableHead>
                <TableHead className="w-[15%]">Added</TableHead>
                <TableHead className="w-[15%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grants.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="truncate font-medium">
                    {g.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate">
                    {g.funder_name || "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {g.amount != null
                      ? typeof g.amount === "number"
                        ? `$${g.amount.toLocaleString()}`
                        : String(g.amount)
                      : "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(g.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/dashboard/archive/${g.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                          <span className="ml-1 hidden sm:inline">View</span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(g)}
                        disabled={restoring === g.id}
                      >
                        {restoring === g.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        <span className="ml-1 hidden sm:inline">Restore</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => setDeleteTarget(g)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Permanent Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Permanently Delete Grant</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The grant and all associated data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-lg border p-3 space-y-1">
              <p className="text-sm font-medium">{deleteTarget.title}</p>
              {deleteTarget.funder_name && (
                <p className="text-xs text-muted-foreground">{deleteTarget.funder_name}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              {deleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
