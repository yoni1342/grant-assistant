"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  discovery: "Discovery",
  screening: "Screening",
  pending_approval: "Pending Approval",
  drafting: "Drafting",
  closed: "Closed",
};

export function GrantDetail({
  grant,
  proposals,
  orgName,
}: {
  grant: Grant;
  proposals: Array<{ id: string; title: string; status: string; quality_score: number | null }>;
  orgName: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(grant.title);
  const [funderName, setFunderName] = useState(grant.funder_name || "");
  const [amount, setAmount] = useState(grant.amount?.toString() || "");
  const [deadline, setDeadline] = useState(() => {
    if (!grant.deadline) return "";
    const d = new Date(grant.deadline);
    return isNaN(d.getTime()) ? grant.deadline : d.toISOString().split("T")[0];
  });
  const [stage, setStage] = useState<string>(grant.stage || "discovery");
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [proposalStatus, setProposalStatus] = useState<"generating" | "done" | "error">("generating");
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

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

    await supabase
      .from("grants")
      .update({
        title,
        funder_name: funderName || null,
        amount: amount || null,
        deadline: deadline || null,
        stage,
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
        <Link href="/pipeline">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Pipeline
          </Button>
        </Link>
      </div>

      {/* Section 1: Grant Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Grant Details</CardTitle>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
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
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="Not specified"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <p className="text-sm text-muted-foreground leading-relaxed rounded-lg border p-3 bg-muted/30">
              {grant.description || "No description available"}
            </p>
          </div>

          {/* Source Link */}
          {grant.source_url && (
            <div className="flex items-center gap-2">
              <Label>Source</Label>
              <a
                href={grant.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                {grant.source_url}
                <ExternalLink className="h-3 w-3" />
              </a>
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
              Review the screening report above, then approve to begin drafting a proposal
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
            <CardTitle>Drafting Report</CardTitle>
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

            {/* Proposal Quality Scores */}
            {proposals.some((p) => p.quality_score != null) && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Proposal Quality</p>
                <div className="flex flex-col gap-2">
                  {proposals.filter((p) => p.quality_score != null).map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <Link href={`/proposals/${p.id}`} className="text-sm hover:underline flex-1 truncate">
                        {p.title}
                      </Link>
                      <Badge
                        variant={
                          p.quality_score! >= 80 ? "default" :
                          p.quality_score! >= 60 ? "secondary" : "destructive"
                        }
                        className="text-xs"
                      >
                        {p.quality_score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              This will move the grant to the Drafting stage and begin generating a proposal. Continue?
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
