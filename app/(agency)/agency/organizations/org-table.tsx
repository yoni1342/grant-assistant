"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, ExternalLink, Loader2, Ban, RotateCcw } from "lucide-react";

interface Org {
  id: string;
  name: string;
  sector: string | null;
  status: string;
  mission: string | null;
  created_at: string;
}

interface OrgTableProps {
  initialOrgs: Org[];
  grantCounts: Record<string, number>;
}

export function OrgTable({ initialOrgs, grantCounts }: OrgTableProps) {
  const [orgs, setOrgs] = useState(initialOrgs);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "suspend" | "unsuspend";
    orgId: string;
    name: string;
  } | null>(null);
  const [errorDialog, setErrorDialog] = useState<{
    title: string;
    message: string;
  } | null>(null);

  async function updateStatus(orgId: string, newStatus: string) {
    setLoadingId(orgId);
    try {
      const res = await fetch(`/api/agency/organizations/${orgId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrgs((prev) =>
          prev.map((o) => (o.id === orgId ? { ...o, status: newStatus } : o))
        );
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorDialog({
          title: "Failed to update status",
          message: data.error || "Something went wrong. Please try again.",
        });
      }
    } catch {
      setErrorDialog({
        title: "Failed to update status",
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setLoadingId(null);
      setConfirmDialog(null);
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
      case "approved":
        return (
          <Badge variant="outline" className="border-green-300 text-green-700 dark:text-green-400">
            Active
          </Badge>
        );
      case "suspended":
        return (
          <Badge variant="outline" className="border-orange-300 text-orange-700 dark:text-orange-400">
            Suspended
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400">
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-gray-300 text-gray-600 dark:text-gray-400">
            {status}
          </Badge>
        );
    }
  };

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">Sector</th>
              <th className="text-left px-4 py-3 font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">Grants</th>
              <th className="text-left px-4 py-3 font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">Created</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => {
              const isLoading = loadingId === org.id;
              const isSuspended = org.status === "suspended";
              const isActive = org.status === "active" || org.status === "approved";
              return (
                <tr key={org.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate max-w-[200px]">{org.name}</span>
                    </div>
                    {org.mission && (
                      <p className="text-xs text-muted-foreground mt-0.5 ml-6 line-clamp-1">{org.mission}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{org.sector || "\u2014"}</td>
                  <td className="px-4 py-3">{statusBadge(org.status)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{grantCounts[org.id] || 0}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(org.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {isSuspended ? (
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
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-1 h-3 w-3" />
                          )}
                          Unsuspend
                        </Button>
                      ) : isActive ? (
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
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Ban className="mr-1 h-3 w-3" />
                          )}
                          Suspend
                        </Button>
                      ) : null}
                      <Link href={`/api/agency/switch-org?orgId=${org.id}&redirect=true`}>
                        <Button size="sm" variant="outline" className="gap-2">
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirm dialog for suspend/unsuspend */}
      <Dialog
        open={!!confirmDialog}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.type === "suspend"
                ? "Suspend Organization"
                : "Unsuspend Organization"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.type === "suspend"
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
              onClick={() => {
                if (!confirmDialog) return;
                updateStatus(
                  confirmDialog.orgId,
                  confirmDialog.type === "suspend" ? "suspended" : "active"
                );
              }}
              disabled={loadingId === confirmDialog?.orgId}
            >
              {loadingId === confirmDialog?.orgId
                ? "..."
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
    </>
  );
}
