"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Grant = Tables<"grants">;

export function AddGrantDialog({
  open,
  onClose,
  onGrantAdded,
}: {
  open: boolean;
  onClose: () => void;
  onGrantAdded: (grant: Grant) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const supabase = createClient();

    // Get user's org_id
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!profile?.org_id) {
      setError("No organization found. Please set up your organization first.");
      setLoading(false);
      return;
    }

    const deadline = formData.get("deadline") as string;
    const amount = formData.get("amount") as string;

    const { data, error: insertError } = await supabase
      .from("grants")
      .insert({
        org_id: profile.org_id,
        title: formData.get("title") as string,
        funder_name: (formData.get("funder_name") as string) || null,
        amount: amount ? parseFloat(amount) : null,
        deadline: deadline || null,
        stage: "discovery",
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    onGrantAdded(data);
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Grant Opportunity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Grant Name *</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., Community Health Initiative Grant"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="funder_name">Funder</Label>
            <Input
              id="funder_name"
              name="funder_name"
              placeholder="e.g., Robert Wood Johnson Foundation"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                placeholder="50000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" name="deadline" type="date" />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Grant"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
