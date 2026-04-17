"use client";

import { useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { isMissingGrantValue } from "@/lib/grants/filters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Loader2 } from "lucide-react";
import Link from "next/link";

type Grant = Tables<"grants">;

const STAGES = [
  { key: "discovery", label: "Discovered", color: "bg-blue-500", tooltip: "Grants found through search or added manually. They haven\u2019t been screened yet." },
  { key: "screening", label: "Screened", color: "bg-yellow-500", tooltip: "Grants that have been evaluated for eligibility and fit with your organization." },
  { key: "pending_approval", label: "Waiting for Approval", color: "bg-amber-500", tooltip: "Screened grants waiting for your team to approve before moving to drafting." },
  { key: "drafting", label: "Drafted", color: "bg-purple-500", tooltip: "Approved grants with a proposal draft in progress or completed." },
  // { key: "submission", label: "Submission", color: "bg-orange-500" },
  // { key: "awarded", label: "Awarded", color: "bg-green-500" },
  // { key: "reporting", label: "Reporting", color: "bg-teal-500" },
  { key: "closed", label: "Closed", color: "bg-muted-foreground", tooltip: "Grants that are no longer being pursued, whether declined, expired, or completed." },
] as const;

function ScreeningScore({ grant }: { grant: Grant }) {
  if (grant.screening_score == null) return null;
  const elig = (typeof grant.eligibility === "string" ? JSON.parse(grant.eligibility) : grant.eligibility) as { data_quality?: string; score?: string } | null;
  const insufficient = elig?.data_quality === "insufficient" || elig?.score === "INSUFFICIENT_DATA";
  if (insufficient) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
        Not Enough Info
      </span>
    );
  }
  const color =
    grant.screening_score >= 80
      ? "bg-green-100 text-green-800"
      : grant.screening_score >= 50
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {grant.screening_score}%
    </span>
  );
}

function ConfidenceScore({ grant }: { grant: Grant }) {
  if (grant.stage !== "drafting") return null;
  const elig = (typeof grant.eligibility === "string"
    ? JSON.parse(grant.eligibility)
    : grant.eligibility) as { confidence?: number } | null;
  const confidence = elig?.confidence;
  if (confidence == null) return null;
  const color =
    confidence >= 80
      ? "bg-purple-100 text-purple-800"
      : confidence >= 50
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
      title="Confidence score"
    >
      {confidence}% conf
    </span>
  );
}

function ProposalQualityScore({ score }: { score: number | undefined }) {
  if (score == null) return null;
  const color =
    score >= 85
      ? "bg-green-100 text-green-800"
      : score >= 60
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
      title="Proposal quality"
    >
      {score}% quality
    </span>
  );
}

export function KanbanView({
  grants,
  onStageChange,
  proposalQualityMap = {},
}: {
  grants: Grant[];
  onStageChange?: (grantId: string, targetStage: string) => Promise<void>;
  proposalQualityMap?: Record<string, number>;
}) {
  const [draggedGrantId, setDraggedGrantId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [movingGrants, setMovingGrants] = useState<Set<string>>(new Set());

  const grantsByStage = STAGES.map((stage) => ({
    ...stage,
    grants: grants.filter((g) => g.stage === stage.key),
  }));

  function handleDragStart(e: React.DragEvent, grantId: string) {
    setDraggedGrantId(grantId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", grantId);
  }

  function handleDragEnd() {
    setDraggedGrantId(null);
    setDropTarget(null);
  }

  function handleDragOver(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(stageKey);
  }

  function handleDragLeave(e: React.DragEvent, stageKey: string) {
    // Only clear if we're actually leaving the column (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      setDropTarget((prev) => (prev === stageKey ? null : prev));
    }
  }

  async function handleDrop(e: React.DragEvent, targetStage: string) {
    e.preventDefault();
    setDropTarget(null);

    const grantId = e.dataTransfer.getData("text/plain");
    if (!grantId || !onStageChange) return;

    // Don't move to the same stage
    const grant = grants.find((g) => g.id === grantId);
    if (!grant || grant.stage === targetStage) return;

    setMovingGrants((prev) => new Set(prev).add(grantId));
    try {
      await onStageChange(grantId, targetStage);
    } finally {
      setMovingGrants((prev) => {
        const next = new Set(prev);
        next.delete(grantId);
        return next;
      });
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {grantsByStage.map((col) => (
        <div
          key={col.key}
          onDragOver={(e) => handleDragOver(e, col.key)}
          onDragLeave={(e) => handleDragLeave(e, col.key)}
          onDrop={(e) => handleDrop(e, col.key)}
          className={`flex w-[75vw] sm:w-64 shrink-0 flex-col rounded-lg transition-colors ${
            dropTarget === col.key && draggedGrantId
              ? "bg-muted ring-2 ring-primary/40"
              : "bg-muted/50"
          }`}
        >
          {/* Column Header */}
          <div className="flex items-center gap-2 p-3">
            <div className={`h-2 w-2 rounded-full ${col.color}`} />
            <span className="text-sm font-medium">{col.label}</span>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-56 text-xs">
                  {col.tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="ml-auto text-xs text-muted-foreground">
              {col.grants.length}
            </span>
          </div>

          {/* Cards */}
          <ScrollArea className="flex-1 px-2 pb-2">
            <div className="space-y-2">
              {col.grants.map((grant) => {
                const isMoving = movingGrants.has(grant.id);
                const isDragging = draggedGrantId === grant.id;

                return (
                  <div
                    key={grant.id}
                    draggable={!isMoving}
                    onDragStart={(e) => handleDragStart(e, grant.id)}
                    onDragEnd={handleDragEnd}
                    className={`${isDragging ? "opacity-40" : ""} ${isMoving ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <Link href={`/pipeline/${grant.id}`}>
                      <Card className="cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium leading-tight flex-1">
                              {grant.title}
                            </p>
                            {isMoving && (
                              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
                            )}
                          </div>
                          <p className={`text-xs text-muted-foreground ${isMissingGrantValue(grant.funder_name) ? "italic" : ""}`}>
                            {isMissingGrantValue(grant.funder_name) ? "No funder mentioned" : grant.funder_name}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {grant.amount && !isMissingGrantValue(grant.amount) ? (
                              <Badge variant="secondary" className="text-xs">
                                ${grant.amount.toLocaleString()}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No amount mentioned</span>
                            )}
                            {grant.stage === "drafting" ? (
                              <>
                                <ConfidenceScore grant={grant} />
                                <ProposalQualityScore score={proposalQualityMap[grant.id]} />
                              </>
                            ) : (
                              <ScreeningScore grant={grant} />
                            )}
                          </div>
                          {grant.deadline && !isMissingGrantValue(grant.deadline) ? (() => {
                            const dl = new Date(grant.deadline);
                            const valid = !isNaN(dl.getTime());
                            const expired = valid && dl < new Date(new Date().toDateString());
                            return (
                              <p className={`text-xs ${expired ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                                {expired ? "Expired: " : "Due: "}
                                {valid ? dl.toLocaleDateString() : grant.deadline}
                              </p>
                            );
                          })() : (
                            <p className="text-xs text-muted-foreground italic">No deadline mentioned</p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                );
              })}
              {col.grants.length === 0 && (
                <p className={`py-8 text-center text-xs text-muted-foreground ${
                  dropTarget === col.key && draggedGrantId ? "text-primary" : ""
                }`}>
                  {dropTarget === col.key && draggedGrantId
                    ? "Drop here"
                    : "No grants"}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
