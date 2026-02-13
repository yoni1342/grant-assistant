"use client";

import type { Tables } from "@/lib/supabase/database.types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

type Grant = Tables<"grants">;

const STAGES = [
  { key: "discovery", label: "Discovery", color: "bg-blue-500" },
  { key: "screening", label: "Screening", color: "bg-yellow-500" },
  { key: "drafting", label: "Drafting", color: "bg-purple-500" },
  { key: "submission", label: "Submission", color: "bg-orange-500" },
  { key: "awarded", label: "Awarded", color: "bg-green-500" },
  { key: "reporting", label: "Reporting", color: "bg-teal-500" },
  { key: "closed", label: "Closed", color: "bg-zinc-400" },
] as const;

function ScreeningBadge({ result }: { result: string | null }) {
  if (!result) return null;
  const colors = {
    green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-800",
    red: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[result as keyof typeof colors] || ""}`}
    >
      {result.toUpperCase()}
    </span>
  );
}

export function KanbanView({ grants }: { grants: Grant[] }) {
  const grantsByStage = STAGES.map((stage) => ({
    ...stage,
    grants: grants.filter((g) => g.stage === stage.key),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {grantsByStage.map((col) => (
        <div
          key={col.key}
          className="flex w-64 shrink-0 flex-col rounded-lg bg-zinc-100/50 dark:bg-zinc-800/30"
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
              {col.grants.map((grant) => (
                <Link
                  key={grant.id}
                  href={`/pipeline/${grant.id}`}
                >
                  <Card className="cursor-pointer transition-shadow hover:shadow-md">
                    <CardContent className="p-3 space-y-2">
                      <p className="text-sm font-medium leading-tight">
                        {grant.title}
                      </p>
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
                        <ScreeningBadge result={grant.screening_result} />
                      </div>
                      {grant.deadline && (
                        <p className="text-xs text-muted-foreground">
                          Due:{" "}
                          {new Date(grant.deadline).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {col.grants.length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No grants
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
