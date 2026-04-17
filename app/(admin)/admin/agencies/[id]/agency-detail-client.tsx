"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Building2,
  Ban,
  RotateCcw,
  Trash2,
  ExternalLink,
  Loader2,
  MonitorPlay,
} from "lucide-react";
import { deleteAgency, suspendAgency, unsuspendAgency } from "../actions";

interface AgencyDetailClientProps {
  agency: {
    id: string;
    name: string;
    owner_user_id: string;
    subscription_status: string | null;
    trial_ends_at: string | null;
    setup_complete: boolean;
    created_at: string;
    updated_at: string;
  };
  owner: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  orgs: Array<{
    id: string;
    name: string;
    sector: string | null;
    status: string;
    plan: string | null;
    is_tester: boolean;
    created_at: string;
    grant_count: number;
  }>;
}

export function AgencyDetailClient({ agency, owner, orgs }: AgencyDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<"suspend" | "unsuspend" | "delete" | null>(null);
  const [viewAsLoading, setViewAsLoading] = useState(false);

  const isSuspended = agency.subscription_status === "suspended";

  async function handleViewAsAgency() {
    setViewAsLoading(true);
    await fetch("/api/admin/view-agency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agencyId: agency.id }),
    });
    router.push("/agency");
  }
  const totalGrants = orgs.reduce((sum, o) => sum + o.grant_count, 0);

  const initials = owner?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

  async function handleAction() {
    if (!confirmDialog) return;
    setLoading(confirmDialog);

    let result;
    if (confirmDialog === "delete") {
      result = await deleteAgency(agency.id);
      if (!result.error) {
        router.push("/admin/agencies");
        return;
      }
    } else if (confirmDialog === "suspend") {
      result = await suspendAgency(agency.id);
    } else {
      result = await unsuspendAgency(agency.id);
    }

    setLoading(null);
    setConfirmDialog(null);
    if (!result?.error) router.refresh();
  }

  const statusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="border-green-300 text-green-700 dark:text-green-400">Active</Badge>;
      case "trialing":
        return <Badge variant="outline" className="border-blue-300 text-blue-700 dark:text-blue-400">Trialing</Badge>;
      case "suspended":
        return <Badge variant="outline" className="border-orange-300 text-orange-700 dark:text-orange-400">Suspended</Badge>;
      case "past_due":
        return <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-400">Past Due</Badge>;
      case "canceled":
        return <Badge variant="outline" className="border-gray-300 text-gray-600 dark:text-gray-400">Canceled</Badge>;
      default:
        return <Badge variant="outline" className="border-green-300 text-green-700 dark:text-green-400">{status || "Active"}</Badge>;
    }
  };

  const orgStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "active":
        return <Badge variant="outline" className="border-green-300 text-green-700 dark:text-green-400">Active</Badge>;
      case "suspended":
        return <Badge variant="outline" className="border-orange-300 text-orange-700 dark:text-orange-400">Suspended</Badge>;
      case "pending":
        return <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/agencies")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            {agency.name}
          </h1>
          <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
            Agency Details
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewAsAgency}
            disabled={viewAsLoading}
          >
            {viewAsLoading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <MonitorPlay className="h-4 w-4 mr-1" />
            )}
            View as Agency
          </Button>
          {isSuspended ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDialog("unsuspend")}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Unsuspend
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDialog("suspend")}
            >
              <Ban className="h-4 w-4 mr-1" />
              Suspend
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDialog("delete")}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusBadge(agency.subscription_status)}
            {!agency.setup_complete && (
              <Badge variant="outline" className="ml-2 border-amber-300 text-amber-700 dark:text-amber-400">
                Setup Pending
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{orgs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Grants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalGrants}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {new Date(agency.created_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Owner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Agency Owner</CardTitle>
        </CardHeader>
        <CardContent>
          {owner ? (
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={owner.avatar_url || undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{owner.full_name || "—"}</p>
                <p className="text-sm text-muted-foreground">{owner.email || "—"}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No owner found</p>
          )}
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Organizations ({orgs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orgs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No organizations under this agency yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Grants</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{org.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{org.sector || "—"}</TableCell>
                      <TableCell>{orgStatusBadge(org.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm capitalize">{org.plan || "free"}</span>
                          {org.is_tester && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-400 text-purple-600 dark:text-purple-400">
                              Tester
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{org.grant_count}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(org.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/organizations/${org.id}?from=agency&agencyId=${agency.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog === "delete"
                ? "Delete Agency"
                : confirmDialog === "suspend"
                  ? "Suspend Agency"
                  : "Unsuspend Agency"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog === "delete"
                ? `Are you sure you want to delete "${agency.name}"? This will unlink all organizations but not delete them.`
                : confirmDialog === "suspend"
                  ? `Are you sure you want to suspend "${agency.name}"? All ${orgs.length} organizations under it will also be suspended.`
                  : `Are you sure you want to unsuspend "${agency.name}"? All organizations under it will be reactivated.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog === "unsuspend" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={!!loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              {confirmDialog === "delete"
                ? "Delete"
                : confirmDialog === "suspend"
                  ? "Suspend"
                  : "Unsuspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
