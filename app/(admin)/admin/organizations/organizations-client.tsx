"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { Eye, Trash2, Ban, RotateCcw } from "lucide-react";
import { approveOrganization, rejectOrganization, deleteOrganization, suspendOrganization, unsuspendOrganization } from "./actions";

interface Organization {
  id: string;
  name: string;
  sector: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  rejection_reason: string | null;
  created_at: string | null;
  owner_email: string | null;
  owner_name: string | null;
  mission: string | null;
  ein: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  founding_year: number | null;
  description: string | null;
  executive_summary: string | null;
  annual_budget: number | null;
  staff_count: number | null;
  geographic_focus: string[] | null;
  documents: Record<string, unknown>[];
  budgets: Record<string, unknown>[];
  narratives: Record<string, unknown>[];
}

type Filter = "all" | "pending" | "approved" | "rejected" | "suspended";

export function OrganizationsClient({
  organizations,
}: {
  organizations: Organization[];
}) {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get("status") as Filter) || "all";
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "delete" | "suspend" | "unsuspend";
    orgId: string;
    name: string;
  } | null>(null);
  const [errorDialog, setErrorDialog] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const counts = {
    pending: organizations.filter((o) => o.status === "pending").length,
    approved: organizations.filter((o) => o.status === "approved").length,
    rejected: organizations.filter((o) => o.status === "rejected").length,
    suspended: organizations.filter((o) => o.status === "suspended").length,
  };

  const filtered =
    filter === "all"
      ? organizations
      : organizations.filter((o) => o.status === filter);

  async function handleApprove(orgId: string) {
    setLoading(orgId);
    await approveOrganization(orgId);
    setLoading(null);
  }

  function openRejectDialog(orgId: string) {
    setSelectedOrgId(orgId);
    setRejectReason("");
    setRejectDialogOpen(true);
  }

  async function handleReject() {
    if (!selectedOrgId) return;
    setLoading(selectedOrgId);
    await rejectOrganization(selectedOrgId, rejectReason || undefined);
    setRejectDialogOpen(false);
    setSelectedOrgId(null);
    setLoading(null);
  }

  async function handleConfirmAction() {
    if (!confirmDialog) return;
    setLoading(confirmDialog.orgId);

    let result;
    if (confirmDialog.type === "delete") {
      result = await deleteOrganization(confirmDialog.orgId);
    } else if (confirmDialog.type === "suspend") {
      result = await suspendOrganization(confirmDialog.orgId);
    } else {
      result = await unsuspendOrganization(confirmDialog.orgId);
    }

    if (result.error) {
      const action = confirmDialog.type === "delete"
        ? "deleting"
        : confirmDialog.type === "suspend"
          ? "suspending"
          : "unsuspending";
      setErrorDialog({
        title: `Failed to ${confirmDialog.type} organization`,
        message: `Something went wrong while ${action} "${confirmDialog.name}". Please try again or contact support if the issue persists.`,
      });
    }

    setConfirmDialog(null);
    setLoading(null);
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400">Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="border-green-300 text-green-700 dark:text-green-400">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-400">Rejected</Badge>;
      case "suspended":
        return <Badge variant="outline" className="border-orange-300 text-orange-700 dark:text-orange-400">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filters: { label: string; value: Filter }[] = [
    { label: "All", value: "all" },
    { label: `Pending (${counts.pending})`, value: "pending" },
    { label: `Approved (${counts.approved})`, value: "approved" },
    { label: `Rejected (${counts.rejected})`, value: "rejected" },
    { label: `Suspended (${counts.suspended})`, value: "suspended" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Organizations</h2>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{counts.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{counts.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{counts.rejected}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Suspended</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{counts.suspended}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No organizations found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="hover:underline text-blue-600 dark:text-blue-400"
                      >
                        {org.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        {org.owner_name && <p className="text-sm">{org.owner_name}</p>}
                        {org.owner_email && <p className="text-xs text-muted-foreground">{org.owner_email}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{org.sector || "-"}</TableCell>
                    <TableCell>{statusBadge(org.status)}</TableCell>
                    <TableCell>
                      {org.created_at
                        ? new Date(org.created_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/organizations/${org.id}`}>
                            <Eye className="mr-1 h-3 w-3" />
                            View
                          </Link>
                        </Button>
                        {org.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => handleApprove(org.id)}
                              disabled={loading === org.id}
                            >
                              {loading === org.id ? "..." : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-700 border-red-300 hover:bg-red-50"
                              onClick={() => openRejectDialog(org.id)}
                              disabled={loading === org.id}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {org.status === "suspended" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setConfirmDialog({
                                type: "unsuspend",
                                orgId: org.id,
                                name: org.name,
                              })
                            }
                            disabled={loading === org.id}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Unsuspend
                          </Button>
                        ) : org.status !== "pending" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setConfirmDialog({
                                type: "suspend",
                                orgId: org.id,
                                name: org.name,
                              })
                            }
                            disabled={loading === org.id}
                          >
                            <Ban className="mr-1 h-3 w-3" />
                            Suspend
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setConfirmDialog({
                              type: "delete",
                              orgId: org.id,
                              name: org.name,
                            })
                          }
                          disabled={loading === org.id}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Organization</DialogTitle>
            <DialogDescription>
              Provide an optional reason for rejecting this organization. This
              will be visible to the user.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading === selectedOrgId}
            >
              {loading === selectedOrgId ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Confirm dialog for delete/suspend/unsuspend */}
      <Dialog
        open={!!confirmDialog}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.type === "delete"
                ? "Delete Organization"
                : confirmDialog?.type === "suspend"
                  ? "Suspend Organization"
                  : "Unsuspend Organization"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.type === "delete"
                ? `Are you sure you want to permanently delete "${confirmDialog?.name}"? All associated data and user accounts will be removed. This action cannot be undone.`
                : confirmDialog?.type === "suspend"
                  ? `Are you sure you want to suspend "${confirmDialog?.name}"? Members will no longer be able to access the platform.`
                  : `Are you sure you want to unsuspend "${confirmDialog?.name}"? Members will regain access to the platform.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog?.type === "unsuspend" ? "default" : "destructive"}
              onClick={handleConfirmAction}
              disabled={loading === confirmDialog?.orgId}
            >
              {loading === confirmDialog?.orgId
                ? "..."
                : confirmDialog?.type === "delete"
                  ? "Delete"
                  : confirmDialog?.type === "suspend"
                    ? "Suspend"
                    : "Unsuspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error dialog */}
      <Dialog
        open={!!errorDialog}
        onOpenChange={(open) => !open && setErrorDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{errorDialog?.title}</DialogTitle>
            <DialogDescription>{errorDialog?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setErrorDialog(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
