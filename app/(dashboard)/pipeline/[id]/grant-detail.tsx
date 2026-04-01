"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Loader2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";

type Grant = Tables<"grants">;

const STAGES = [
  "discovery",
  "screening",
  "pending_approval",
  "drafting",
  // "submission",
  // "awarded",
  // "reporting",
  "closed",
] as const;

const STAGE_LABELS: Record<string, string> = {
  discovery: "Discovered",
  screening: "Screened",
  pending_approval: "Waiting for Approval",
  drafting: "Drafted",
  closed: "Closed",
};

export function GrantDetail({
  grant,
  proposals,
  orgName,
  backHref = "/pipeline",
  backLabel = "Pipeline",
}: {
  grant: Grant;
  proposals: Array<{ id: string; title: string; status: string; quality_score: number | null }>;
  orgName: string;
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(grant.title);
  const [funderName, setFunderName] = useState(grant.funder_name || "");
  const [amount, setAmount] = useState(grant.amount?.toString() || "");
  const [ongoingDeadline, setOngoingDeadline] = useState(grant.deadline === "Ongoing");
  const [deadline, setDeadline] = useState(() => {
    if (!grant.deadline || grant.deadline === "Ongoing") return "";
    const d = new Date(grant.deadline);
    return isNaN(d.getTime()) ? grant.deadline : d.toISOString().split("T")[0];
  });
  const [stage, setStage] = useState<string>(grant.stage || "discovery");
  const [description, setDescription] = useState(grant.description || "");
  const [sourceUrl, setSourceUrl] = useState(grant.source_url || "");
  const metadata = (grant.metadata || {}) as Record<string, string>;
  const [notes, setNotes] = useState(metadata.notes || "");
  const [eligibilityRequirements, setEligibilityRequirements] = useState(metadata.eligibility_requirements || "");
  const [focusAreas, setFocusAreas] = useState(metadata.focus_areas || "");
  const [matchPercentage, setMatchPercentage] = useState(metadata.match_percentage || "");
  const [contactInfo, setContactInfo] = useState(metadata.contact_info || "");
  const [showAdditional, setShowAdditional] = useState(false);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [proposalStatus, setProposalStatus] = useState<"generating" | "done" | "error">("generating");
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const eligibility = (typeof grant.eligibility === "string"
    ? JSON.parse(grant.eligibility)
    : grant.eligibility) as {
    score?: string;
    indicator?: string;
    confidence?: number;
    dimension_scores?: {
      mission_alignment?: number;
      target_population?: number;
      service_fit?: number;
      geographic_alignment?: number;
      organizational_capacity?: number;
    };
  } | null;
  const concerns = grant.concerns as string[] | null;
  const recommendations = grant.recommendations as { text?: string }[] | string[] | null;

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("grants").delete().eq("id", grant.id);
    setDeleteDialogOpen(false);
    setDeleting(false);
    router.push("/pipeline");
  }

  async function handleSave() {
    // If moving to drafting, require confirmation first
    const stageChangedToDrafting = stage === "drafting" && grant.stage !== "drafting";
    if (stageChangedToDrafting) {
      setConfirmDialogOpen(true);
      return;
    }

    await saveGrant(false);
  }

  async function handleConfirmProposal() {
    setConfirmDialogOpen(false);
    await saveGrant(true);
  }

  async function saveGrant(generateProposal: boolean) {
    // If generating proposal, trigger the workflow first
    if (generateProposal) {
      setProposalError(null);
      setProposalStatus("generating");
      setProposalDialogOpen(true);

      try {
        const response = await fetch("/api/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service: "proposal-generation",
            grantId: grant.id,
            timestamp: new Date().toISOString(),
          }),
        });

        const result = await response.json();

        if (!response.ok || result.success === false) {
          setProposalStatus("error");
          setProposalError(result.error || "Proposal generation failed.");
          return;
        }

        setProposalStatus("done");
      } catch {
        setProposalStatus("error");
        setProposalError("Failed to connect to workflow.");
        return;
      }
    }

    // Save the grant fields
    setSaving(true);
    const supabase = createClient();

    const updatedMetadata: Record<string, string> = { ...metadata };
    if (notes) updatedMetadata.notes = notes; else delete updatedMetadata.notes;
    if (eligibilityRequirements) updatedMetadata.eligibility_requirements = eligibilityRequirements; else delete updatedMetadata.eligibility_requirements;
    if (focusAreas) updatedMetadata.focus_areas = focusAreas; else delete updatedMetadata.focus_areas;
    if (matchPercentage) updatedMetadata.match_percentage = matchPercentage; else delete updatedMetadata.match_percentage;
    if (contactInfo) updatedMetadata.contact_info = contactInfo; else delete updatedMetadata.contact_info;

    await supabase
      .from("grants")
      .update({
        title,
        funder_name: funderName || null,
        amount: amount || null,
        deadline: ongoingDeadline ? "Ongoing" : (deadline || null),
        stage,
        description: description || null,
        source_url: sourceUrl || null,
        metadata: updatedMetadata,
      })
      .eq("id", grant.id);

    setSaving(false);

    if (generateProposal) {
      setTimeout(() => {
        setProposalDialogOpen(false);
        router.refresh();
      }, 2000);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href={backHref}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {backLabel}
          </Button>
        </Link>
      </div>

      {/* Section 1: Grant Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Grant Details</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Funder</Label>
              <Input
                value={funderName}
                onChange={(e) => setFunderName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STAGE_LABELS[s] || s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Not specified"
              />
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              {ongoingDeadline ? (
                <div className="flex items-center h-9 px-3 rounded-md border bg-muted/50 text-sm text-muted-foreground">
                  Ongoing / Rolling
                </div>
              ) : (
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  placeholder="Not specified"
                />
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ongoingDeadline}
                  onChange={(e) => {
                    setOngoingDeadline(e.target.checked);
                    if (e.target.checked) setDeadline("");
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-xs text-muted-foreground">Ongoing / Rolling deadline</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div className="col-span-2 space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the grant opportunity..."
              rows={3}
            />
          </div>

          {/* Source URL */}
          <div className="space-y-2">
            <Label>Grant URL</Label>
            <div className="flex items-center gap-2">
              <Input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                type="url"
              />
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          {/* Additional Information */}
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
                <Label>Eligibility Requirements</Label>
                <Textarea
                  value={eligibilityRequirements}
                  onChange={(e) => setEligibilityRequirements(e.target.value)}
                  placeholder="Who can apply, restrictions..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Focus Areas</Label>
                <Input
                  value={focusAreas}
                  onChange={(e) => setFocusAreas(e.target.value)}
                  placeholder="e.g., Health, Education, Environment"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Match Requirement</Label>
                  <Input
                    value={matchPercentage}
                    onChange={(e) => setMatchPercentage(e.target.value)}
                    placeholder="e.g., 20% match"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Info</Label>
                  <Input
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder="Name or email"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Screening Report */}
      {(grant.screening_score != null || grant.screening_notes || eligibility || concerns?.length || recommendations?.length) && (
        <Card>
          <CardHeader>
            <CardTitle>Screening Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Score */}
            {grant.screening_score != null && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Score:</span>
                <Badge
                  variant={
                    grant.screening_score >= 80
                      ? "default"
                      : grant.screening_score >= 50
                        ? "secondary"
                        : "destructive"
                  }
                  className="text-sm"
                >
                  {grant.screening_score}%
                </Badge>
                {eligibility?.score && (
                  <span className="text-sm text-muted-foreground">
                    ({eligibility.score})
                  </span>
                )}
              </div>
            )}

            {/* Dimension Scores */}
            {eligibility?.dimension_scores && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Scoring Breakdown</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "mission_alignment" as const, label: "Mission Alignment" },
                    { key: "target_population" as const, label: "Target Population" },
                    { key: "service_fit" as const, label: "Service/Program Fit" },
                    { key: "geographic_alignment" as const, label: "Geographic Alignment" },
                    { key: "organizational_capacity" as const, label: "Org Capacity" },
                  ].map(({ key, label }) => {
                    const value = eligibility.dimension_scores?.[key] ?? 0;
                    const pct = (value / 20) * 100;
                    const color =
                      value >= 16
                        ? "bg-green-500"
                        : value >= 11
                          ? "bg-yellow-500"
                          : value >= 6
                            ? "bg-orange-500"
                            : "bg-red-500";
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{value}/20</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${color} transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Screening Notes */}
            {grant.screening_notes && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Assessment</p>
                <p className="text-sm text-muted-foreground leading-relaxed rounded-lg border p-3 bg-muted/30">
                  {grant.screening_notes}
                </p>
              </div>
            )}

            {/* Concerns */}
            {concerns && concerns.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Concerns
                </p>
                <ul className="space-y-1">
                  {concerns.map((concern, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-yellow-500 mt-0.5">-</span>
                      {concern}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  Recommendations
                </p>
                <ul className="space-y-1">
                  {recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">-</span>
                      {typeof rec === "string" ? rec : rec.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Discovery/Screening - prompt user to generate proposal */}
      {(grant.stage === "discovery" || grant.stage === "screening") && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              Generate Proposal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ready to apply? Generate a proposal for <strong>{orgName}</strong> based on this grant.
            </p>
            <Button
              onClick={() => {
                setStage("drafting");
                setConfirmDialogOpen(true);
              }}
            >
              Generate Proposal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pending Approval - prompt user to approve */}
      {grant.stage === "pending_approval" && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Awaiting Your Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This grant passed eligibility screening and is ready for proposal generation.
              Review the screening report above, then approve to begin generating a proposal
              for <strong>{orgName}</strong>.
            </p>
            <Button
              onClick={() => {
                setStage("drafting");
                setConfirmDialogOpen(true);
              }}
            >
              Approve & Generate Proposal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Drafting Report - show confidence & quality when in drafting stage */}
      {grant.stage === "drafting" && proposals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Drafted Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Confidence Score */}
            {eligibility?.confidence != null && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Confidence:</span>
                <Badge
                  variant={
                    eligibility.confidence >= 80
                      ? "default"
                      : eligibility.confidence >= 50
                        ? "secondary"
                        : "destructive"
                  }
                  className="text-sm"
                >
                  {eligibility.confidence}%
                </Badge>
              </div>
            )}

            {/* Proposals list with View Proposal links */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Proposals</p>
              <div className="flex flex-col gap-2">
                {proposals.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg border p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.status}</p>
                    </div>
                    {p.quality_score != null && (
                      <Badge
                        variant={
                          p.quality_score >= 85 ? "default" :
                          p.quality_score >= 60 ? "secondary" : "destructive"
                        }
                        className="text-xs shrink-0"
                      >
                        {p.quality_score}% quality
                      </Badge>
                    )}
                    <Link href={`/proposals/${p.id}`}>
                      <Button size="sm" className="shrink-0 gap-1 bg-purple-600 hover:bg-purple-700 text-white">
                        <ExternalLink className="h-3 w-3" />
                        View Proposal
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Dimension Scores (same breakdown as screening but shown in drafting context) */}
            {eligibility?.dimension_scores && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Eligibility Breakdown</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "mission_alignment" as const, label: "Mission Alignment" },
                    { key: "target_population" as const, label: "Target Population" },
                    { key: "service_fit" as const, label: "Service/Program Fit" },
                    { key: "geographic_alignment" as const, label: "Geographic Alignment" },
                    { key: "organizational_capacity" as const, label: "Org Capacity" },
                  ].map(({ key, label }) => {
                    const value = eligibility.dimension_scores?.[key] ?? 0;
                    const pct = (value / 20) * 100;
                    const color =
                      value >= 16
                        ? "bg-green-500"
                        : value >= 11
                          ? "bg-yellow-500"
                          : value >= 6
                            ? "bg-orange-500"
                            : "bg-red-500";
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{value}/20</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${color} transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirm Organization Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Proposal Generation</DialogTitle>
            <DialogDescription>
              You are about to generate a grant proposal for:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Grant:</span>
                <span className="text-sm font-medium">{grant.title}</span>
              </div>
              {grant.funder_name && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Funder:</span>
                  <span className="text-sm">{grant.funder_name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Applying as:</span>
                <span className="text-sm font-semibold">{orgName}</span>
              </div>
              {grant.screening_score != null && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Screening Score:</span>
                  <Badge
                    variant={
                      grant.screening_score >= 80 ? "default" :
                      grant.screening_score >= 50 ? "secondary" : "destructive"
                    }
                    className="text-xs"
                  >
                    {grant.screening_score}%
                  </Badge>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              This will move the grant to the Drafted stage and begin generating a proposal. Continue?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setStage(grant.stage || "pending_approval");
              setConfirmDialogOpen(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleConfirmProposal}>
              Approve & Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Grant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this grant? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-sm font-medium">{grant.title || "Untitled Grant"}</p>
            {grant.funder_name && (
              <p className="text-xs text-muted-foreground">{grant.funder_name}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
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
              {deleting ? "Deleting..." : "Delete Grant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proposal Generation Dialog */}
      <Dialog open={proposalDialogOpen} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-sm [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              {proposalStatus === "generating" && (
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              )}
              {proposalStatus === "done" && (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              )}
              {proposalStatus === "error" && (
                <XCircle className="h-8 w-8 text-red-500" />
              )}
              <DialogTitle>
                {proposalStatus === "generating" && "Generating Proposal..."}
                {proposalStatus === "done" && "Proposal Generated!"}
                {proposalStatus === "error" && "Generation Failed"}
              </DialogTitle>
              <DialogDescription className="text-center">
                {proposalStatus === "generating" &&
                  `Creating a proposal for "${grant.title}". This may take a minute.`}
                {proposalStatus === "done" && "Your proposal is ready."}
                {proposalStatus === "error" &&
                  (proposalError || "Something went wrong.")}
              </DialogDescription>
            </div>
          </DialogHeader>
          {proposalStatus === "error" && (
            <DialogFooter className="sm:justify-center">
              <Button
                variant="outline"
                onClick={() => setProposalDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
