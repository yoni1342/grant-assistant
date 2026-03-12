"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
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
import { Trash2, Ban, UserCheck, UserPlus } from "lucide-react";
import { deleteUser, deactivateUser, activateUser, createAdmin } from "./actions";

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  is_platform_admin: boolean;
  created_at: string | null;
  org_name: string | null;
  banned_until: string | null;
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

  // Confirm dialog for delete/deactivate
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "delete" | "deactivate" | "activate";
    userId: string;
    name: string;
  } | null>(null);

  // Add admin dialog
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: "", password: "", fullName: "" });
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (u.full_name?.toLowerCase().includes(q) ?? false) ||
      (u.email?.toLowerCase().includes(q) ?? false)
    );
  });

  function isDeactivated(user: UserRow) {
    if (!user.banned_until) return false;
    return new Date(user.banned_until) > new Date();
  }

  async function handleConfirmAction() {
    if (!confirmDialog) return;
    setLoading(confirmDialog.userId);

    let result;
    if (confirmDialog.type === "delete") {
      result = await deleteUser(confirmDialog.userId);
    } else if (confirmDialog.type === "deactivate") {
      result = await deactivateUser(confirmDialog.userId);
    } else {
      result = await activateUser(confirmDialog.userId);
    }

    if (result.error) {
      alert(result.error);
    }

    setConfirmDialog(null);
    setLoading(null);
  }

  async function handleCreateAdmin() {
    setAdminLoading(true);
    setAdminError("");
    const result = await createAdmin(adminForm.email, adminForm.password, adminForm.fullName);
    if (result.error) {
      setAdminError(result.error);
    } else {
      setShowAddAdmin(false);
      setAdminForm({ email: "", password: "", fullName: "" });
    }
    setAdminLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Users</h2>
        <Button onClick={() => setShowAddAdmin(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Admin
        </Button>
      </div>

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
                <TableHead>Status</TableHead>
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
                filtered.map((user) => {
                  const deactivated = isDeactivated(user);
                  const isSelf = user.id === currentUserId;
                  return (
                    <TableRow key={user.id} className={deactivated ? "opacity-60" : ""}>
                      <TableCell className="font-medium">
                        {user.full_name || "-"}
                      </TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>{user.org_name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role || "-"}</Badge>
                      </TableCell>
                      <TableCell>
                        {deactivated ? (
                          <Badge variant="destructive">Deactivated</Badge>
                        ) : user.is_platform_admin ? (
                          <Badge className="bg-green-100 text-green-700 border-green-300">
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {!isSelf && (
                          <>
                            {deactivated ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setConfirmDialog({
                                    type: "activate",
                                    userId: user.id,
                                    name: user.full_name || user.email || "this user",
                                  })
                                }
                                disabled={loading === user.id}
                              >
                                <UserCheck className="mr-1 h-3 w-3" />
                                Activate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setConfirmDialog({
                                    type: "deactivate",
                                    userId: user.id,
                                    name: user.full_name || user.email || "this user",
                                  })
                                }
                                disabled={loading === user.id}
                              >
                                <Ban className="mr-1 h-3 w-3" />
                                Deactivate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                setConfirmDialog({
                                  type: "delete",
                                  userId: user.id,
                                  name: user.full_name || user.email || "this user",
                                })
                              }
                              disabled={loading === user.id}
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              Delete
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
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
              {confirmDialog?.type === "delete"
                ? "Delete User"
                : confirmDialog?.type === "deactivate"
                  ? "Deactivate User"
                  : "Activate User"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.type === "delete"
                ? `Are you sure you want to permanently delete ${confirmDialog?.name}? This action cannot be undone.`
                : confirmDialog?.type === "deactivate"
                  ? `Are you sure you want to deactivate ${confirmDialog?.name}? They will no longer be able to log in.`
                  : `Are you sure you want to reactivate ${confirmDialog?.name}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog?.type === "activate" ? "default" : "destructive"}
              onClick={handleConfirmAction}
              disabled={loading === confirmDialog?.userId}
            >
              {loading === confirmDialog?.userId
                ? "..."
                : confirmDialog?.type === "delete"
                  ? "Delete"
                  : confirmDialog?.type === "deactivate"
                    ? "Deactivate"
                    : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Admin Dialog */}
      <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin</DialogTitle>
            <DialogDescription>
              Create a new platform admin account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="admin-name">Full Name</Label>
              <Input
                id="admin-name"
                placeholder="John Doe"
                value={adminForm.fullName}
                onChange={(e) =>
                  setAdminForm((f) => ({ ...f, fullName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@example.com"
                value={adminForm.email}
                onChange={(e) =>
                  setAdminForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="Min 6 characters"
                value={adminForm.password}
                onChange={(e) =>
                  setAdminForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>
            {adminError && (
              <p className="text-sm text-red-600">{adminError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAdmin(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAdmin} disabled={adminLoading}>
              {adminLoading ? "Creating..." : "Create Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
