"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MoreHorizontal, Trash2, Building2, Briefcase, Ban, RotateCcw, MonitorPlay, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteAgency, suspendAgency, unsuspendAgency } from "./actions";

interface Agency {
  id: string;
  name: string;
  owner_name: string | null;
  owner_email: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  setup_complete: boolean;
  org_count: number;
  created_at: string;
}

interface AgenciesClientProps {
  agencies: Agency[];
}

export function AgenciesClient({ agencies: initialAgencies }: AgenciesClientProps) {
  const router = useRouter();
  const [agencies, setAgencies] = useState(initialAgencies);
  const [search, setSearch] = useState("");
  const [viewAsLoading, setViewAsLoading] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<Agency | null>(null);
  const [suspendDialog, setSuspendDialog] = useState<{ agency: Agency; action: "suspend" | "unsuspend" } | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = agencies.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.owner_name?.toLowerCase() || "").includes(q) ||
      (a.owner_email?.toLowerCase() || "").includes(q)
    );
  });

  const statusBadge = (agency: Agency) => {
    if (!agency.setup_complete) {
      return (
        <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400">
          Setup Pending
        </Badge>
      );
    }
    switch (agency.subscription_status) {
      case "active":
        return (
          <Badge variant="outline" className="border-green-300 text-green-700 dark:text-green-400">
            Active
          </Badge>
        );
      case "trialing":
        return (
          <Badge variant="outline" className="border-blue-300 text-blue-700 dark:text-blue-400">
            Trialing
          </Badge>
        );
      case "past_due":
        return (
          <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-400">
            Past Due
          </Badge>
        );
      case "canceled":
        return (
          <Badge variant="outline" className="border-gray-300 text-gray-600 dark:text-gray-400">
            Canceled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-green-300 text-green-700 dark:text-green-400">
            {agency.subscription_status || "Active"}
          </Badge>
        );
    }
  };

  async function handleSuspendToggle() {
    if (!suspendDialog) return;
    setLoading(true);
    const result = suspendDialog.action === "suspend"
      ? await suspendAgency(suspendDialog.agency.id)
      : await unsuspendAgency(suspendDialog.agency.id);
    if (!result.error) {
      const newStatus = suspendDialog.action === "suspend" ? "suspended" : "active";
      setAgencies((prev) =>
        prev.map((a) => a.id === suspendDialog.agency.id ? { ...a, subscription_status: newStatus } : a)
      );
      setSuspendDialog(null);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteDialog) return;
    setLoading(true);
    const result = await deleteAgency(deleteDialog.id);
    if (!result.error) {
      setAgencies((prev) => prev.filter((a) => a.id !== deleteDialog.id));
      setDeleteDialog(null);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            Agencies
          </h1>
          <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
            {agencies.length} agenc{agencies.length !== 1 ? "ies" : "y"} registered
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search agencies..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agency</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Orgs</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {search ? "No agencies match your search." : "No agencies yet."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((agency) => (
                <TableRow key={agency.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium">{agency.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{agency.owner_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{agency.owner_email || ""}</p>
                    </div>
                  </TableCell>
                  <TableCell>{statusBadge(agency)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{agency.org_count}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {agency.created_at
                      ? new Date(agency.created_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/agencies/${agency.id}`}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View <ArrowUpRight className="h-3 w-3" />
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={viewAsLoading === agency.id}
                            onClick={async () => {
                              setViewAsLoading(agency.id);
                              await fetch("/api/admin/view-agency", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ agencyId: agency.id }),
                              });
                              router.push("/agency");
                            }}
                          >
                            <MonitorPlay className="mr-2 h-4 w-4" />
                            View as Agency
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {agency.subscription_status === "suspended" ? (
                            <DropdownMenuItem
                              onClick={() => setSuspendDialog({ agency, action: "unsuspend" })}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Unsuspend
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => setSuspendDialog({ agency, action: "suspend" })}
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Suspend
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteDialog(agency)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Agency
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agency</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteDialog?.name}&quot;? This will unlink all
              organizations from this agency but will not delete the organizations themselves.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Deleting..." : "Delete Agency"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend/Unsuspend Confirmation */}
      <Dialog open={!!suspendDialog} onOpenChange={(open) => !open && setSuspendDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {suspendDialog?.action === "suspend" ? "Suspend Agency" : "Unsuspend Agency"}
            </DialogTitle>
            <DialogDescription>
              {suspendDialog?.action === "suspend"
                ? `Are you sure you want to suspend "${suspendDialog?.agency.name}"? All organizations under this agency will also be suspended.`
                : `Are you sure you want to unsuspend "${suspendDialog?.agency.name}"? All organizations under this agency will be reactivated.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={suspendDialog?.action === "suspend" ? "destructive" : "default"}
              onClick={handleSuspendToggle}
              disabled={loading}
            >
              {loading
                ? "..."
                : suspendDialog?.action === "suspend"
                  ? "Suspend"
                  : "Unsuspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
