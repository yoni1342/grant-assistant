"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
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
import { ShieldCheck, ShieldOff } from "lucide-react";
import { togglePlatformAdmin } from "./actions";

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  is_platform_admin: boolean;
  created_at: string | null;
  org_name: string | null;
}

export function UsersClient({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    userId: string;
    name: string;
    newValue: boolean;
  } | null>(null);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (u.full_name?.toLowerCase().includes(q) ?? false) ||
      (u.email?.toLowerCase().includes(q) ?? false)
    );
  });

  function openConfirm(user: UserRow) {
    setConfirmDialog({
      userId: user.id,
      name: user.full_name || user.email || "this user",
      newValue: !user.is_platform_admin,
    });
  }

  async function handleToggle() {
    if (!confirmDialog) return;
    setLoading(confirmDialog.userId);
    await togglePlatformAdmin(confirmDialog.userId, confirmDialog.newValue);
    setConfirmDialog(null);
    setLoading(null);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Users</h2>

      <Input
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Platform Admin</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || "-"}
                    </TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>{user.org_name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role || "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.is_platform_admin ? (
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          Admin
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openConfirm(user)}
                        disabled={
                          loading === user.id ||
                          (user.id === currentUserId && user.is_platform_admin)
                        }
                      >
                        {user.is_platform_admin ? (
                          <>
                            <ShieldOff className="mr-1 h-3 w-3" />
                            Revoke
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            Grant
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog
        open={!!confirmDialog}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.newValue
                ? "Grant Admin Access"
                : "Revoke Admin Access"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to{" "}
              {confirmDialog?.newValue ? "grant" : "revoke"} platform admin
              access for {confirmDialog?.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog?.newValue ? "default" : "destructive"}
              onClick={handleToggle}
              disabled={loading === confirmDialog?.userId}
            >
              {loading === confirmDialog?.userId
                ? "..."
                : confirmDialog?.newValue
                  ? "Grant Admin"
                  : "Revoke Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
