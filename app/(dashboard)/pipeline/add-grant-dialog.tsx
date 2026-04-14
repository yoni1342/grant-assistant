"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { toast } from "sonner";

export function AddGrantDialog({
  open,
  onClose,
  onGrantAdded,
  orgName,
}: {
  open: boolean;
  onClose: () => void;
  onGrantAdded: () => void;
  orgName?: string;
}) {
  const manualSourceFallback = `Manual Entry by ${orgName?.trim() || "organization"}`;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdditional, setShowAdditional] = useState(false);
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
  const [incompleteWarning, setIncompleteWarning] = useState<string[]>([]);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [ongoingDeadline, setOngoingDeadline] = useState(false);

  function addCustomField() {
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  }

  function updateCustomField(index: number, field: "key" | "value", val: string) {
    setCustomFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: val } : f))
    );
  }

  function removeCustomField(index: number) {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setError(null);
    setShowAdditional(false);
    setCustomFields([]);
    setIncompleteWarning([]);
    setPendingFormData(null);
    setOngoingDeadline(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const title = (formData.get("title") as string)?.trim();

    if (!title) {
      setError("Grant name is required.");
      return;
    }

    // Check for missing recommended fields
    const missing: string[] = [];
    if (!(formData.get("funder_name") as string)?.trim()) missing.push("Funder");
    if (!(formData.get("description") as string)?.trim()) missing.push("Description");
    if (!(formData.get("amount") as string)?.trim()) missing.push("Amount");
    if (!ongoingDeadline && !(formData.get("deadline") as string)?.trim()) missing.push("Deadline");

    if (missing.length > 0) {
      setIncompleteWarning(missing);
      setPendingFormData(formData);
      return;
    }

    submitGrant(formData);
  }

  async function submitGrant(formData: FormData) {
    setLoading(true);
    setError(null);
    setIncompleteWarning([]);
    setPendingFormData(null);

    const title = (formData.get("title") as string)?.trim();
    const deadline = ongoingDeadline ? "Ongoing" : (formData.get("deadline") as string);
    const amount = formData.get("amount") as string;
    const sourceUrl = (formData.get("source_url") as string)?.trim();
    const sourceInput = (formData.get("source") as string)?.trim();
    const source = sourceInput || manualSourceFallback;
    const eligibilityRequirements = (formData.get("eligibility_requirements") as string)?.trim();
    const focusAreas = (formData.get("focus_areas") as string)?.trim();
    const matchPercentage = (formData.get("match_percentage") as string)?.trim();
    const contactInfo = (formData.get("contact_info") as string)?.trim();
    const notes = (formData.get("notes") as string)?.trim();

    // Build metadata from additional fields
    const metadata: Record<string, unknown> = {};
    if (eligibilityRequirements) metadata.eligibility_requirements = eligibilityRequirements;
    if (focusAreas) metadata.focus_areas = focusAreas;
    if (matchPercentage) metadata.match_percentage = matchPercentage;
    if (contactInfo) metadata.contact_info = contactInfo;
    if (notes) metadata.notes = notes;

    // Add custom fields to metadata
    for (const field of customFields) {
      const key = field.key.trim();
      const value = field.value.trim();
      if (key && value) {
        metadata[key.toLowerCase().replace(/\s+/g, "_")] = value;
      }
    }

    try {
      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: "grant-screening",
          title,
          funder_name: (formData.get("funder_name") as string) || null,
          amount: amount ? parseFloat(amount) : null,
          deadline: deadline || null,
          description: (formData.get("description") as string)?.trim() || null,
          stage: "discovery",
          source,
          source_id: null,
          source_url: sourceUrl || null,
          metadata,
        }),
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        result = { success: response.ok };
      }

      if (!response.ok || result.success === false) {
        if (result.code === "GRANT_LIMIT_REACHED") {
          toast.error("Daily grant limit reached", {
            description: "Upgrade to Professional for unlimited grants.",
          });
          onClose();
        } else {
          setError(result.error || "Failed to add grant. Please try again.");
        }
      } else {
        toast.success("Grant added to pipeline");
        resetForm();
        onGrantAdded();
      }
    } catch {
      setError("Failed to add grant. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Brief description of the grant opportunity..."
              rows={3}
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
              {ongoingDeadline ? (
                <div className="flex items-center h-9 px-3 rounded-md border bg-muted/50 text-sm text-muted-foreground">
                  Ongoing / Rolling
                </div>
              ) : (
                <Input id="deadline" name="deadline" type="date" />
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ongoingDeadline}
                  onChange={(e) => setOngoingDeadline(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-xs text-muted-foreground">Ongoing / Rolling deadline</span>
              </label>
            </div>
          </div>

          {/* Additional Data Section */}
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowAdditional((v) => !v)}
          >
            {showAdditional ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Additional Information
          </button>

          {showAdditional && (
            <div className="space-y-4 rounded-md border p-3">
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  name="source"
                  placeholder={manualSourceFallback}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source_url">Grant URL</Label>
                <Input
                  id="source_url"
                  name="source_url"
                  type="url"
                  placeholder="https://www.grants.gov/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eligibility_requirements">Eligibility Requirements</Label>
                <Textarea
                  id="eligibility_requirements"
                  name="eligibility_requirements"
                  placeholder="Who can apply, restrictions..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="focus_areas">Focus Areas</Label>
                <Input
                  id="focus_areas"
                  name="focus_areas"
                  placeholder="e.g., Health, Education, Environment"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="match_percentage">Match Requirement</Label>
                  <Input
                    id="match_percentage"
                    name="match_percentage"
                    placeholder="e.g., 20% match"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_info">Contact Info</Label>
                  <Input
                    id="contact_info"
                    name="contact_info"
                    placeholder="Name or email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>

              {/* Custom Fields */}
              {customFields.length > 0 && (
                <div className="space-y-2">
                  {customFields.map((field, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Input
                        placeholder="Field name"
                        value={field.key}
                        onChange={(e) => updateCustomField(index, "key", e.target.value)}
                        className="w-1/3"
                      />
                      <Input
                        placeholder="Value"
                        value={field.value}
                        onChange={(e) => updateCustomField(index, "value", e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-9 w-9 p-0"
                        onClick={() => removeCustomField(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={addCustomField}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Custom Field
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Grant"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Incomplete fields warning */}
    <Dialog open={incompleteWarning.length > 0} onOpenChange={(open) => {
      if (!open) {
        setIncompleteWarning([]);
        setPendingFormData(null);
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Missing Information
          </DialogTitle>
          <DialogDescription>
            The following fields are empty. Filling them in helps produce better screening and proposal results.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 py-2">
          {incompleteWarning.map((field) => (
            <span
              key={field}
              className="rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-sm text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400"
            >
              {field}
            </span>
          ))}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              setIncompleteWarning([]);
              setPendingFormData(null);
            }}
          >
            Go Back & Fill In
          </Button>
          <Button
            onClick={() => {
              if (pendingFormData) submitGrant(pendingFormData);
            }}
          >
            Add Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
