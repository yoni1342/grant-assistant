"use client";

import { useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import Link from "next/link";

type Grant = Tables<"grants">;

const STAGES = [
  { key: "discovery", label: "Discovery", color: "bg-blue-500" },
  { key: "screening", label: "Screening", color: "bg-yellow-500" },
  { key: "drafting", label: "Drafting", color: "bg-purple-500" },
  // { key: "submission", label: "Submission", color: "bg-orange-500" },
  // { key: "awarded", label: "Awarded", color: "bg-green-500" },
  // { key: "reporting", label: "Reporting", color: "bg-teal-500" },
  { key: "closed", label: "Closed", color: "bg-zinc-400" },
] as const;

function ScreeningScore({ score }: { score: number | null }) {
  if (score == null) return null;
  const color =
    score >= 70
      ? "bg-green-100 text-green-800"
      : score >= 40
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {score}%
    </span>
  );
}

export function KanbanView({
  grants,
  onStageChange,
}: {
  grants: Grant[];
  onStageChange?: (grantId: string, targetStage: string) => Promise<void>;
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
          className={`flex w-64 shrink-0 flex-col rounded-lg transition-colors ${
            dropTarget === col.key && draggedGrantId
              ? "bg-zinc-200/80 ring-2 ring-primary/40 dark:bg-zinc-700/50"
              : "bg-zinc-100/50 dark:bg-zinc-800/30"
          }`}
        >
          {/* Column Header */}
          <div className="flex items-center gap-2 p-3">
            <div className={`h-2 w-2 rounded-full ${col.color}`} />
            <span className="text-sm font-medium">{col.label}</span>
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
                          {grant.funder_name && (
                            <p className="text-xs text-muted-foreground">
                              {grant.funder_name}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            {grant.amount && (
                              <Badge variant="secondary" className="text-xs">
                                ${grant.amount.toLocaleString()}
                              </Badge>
                            )}
                            <ScreeningScore score={grant.screening_score} />
                          </div>
                          {grant.deadline && (
                            <p className="text-xs text-muted-foreground">
                              Due:{" "}
                              {isNaN(new Date(grant.deadline).getTime())
                                ? grant.deadline
                                : new Date(grant.deadline).toLocaleDateString()}
                            </p>
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
