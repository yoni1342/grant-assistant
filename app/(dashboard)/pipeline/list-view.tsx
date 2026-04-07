"use client";

import type { Tables } from "@/lib/supabase/database.types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

type Grant = Tables<"grants">;

const STAGE_COLORS: Record<string, string> = {
  discovery: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  screening: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  pending_approval: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  drafting: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  closed: "bg-muted text-foreground",
};

const STAGE_LABELS: Record<string, string> = {
  discovery: "Discovered",
  screening: "Screened",
  pending_approval: "Waiting for Approval",
  drafting: "Drafted",
  closed: "Closed",
};

export function ListView({ grants }: { grants: Grant[] }) {
  if (grants.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No grants found
      </p>
    );
  }

  return (
    <>
    {/* Mobile card layout */}
    <div className="sm:hidden space-y-3">
      {grants.map((g) => {
        const elig = (typeof g.eligibility === "string" ? JSON.parse(g.eligibility) : g.eligibility) as { data_quality?: string; score?: string; confidence?: number } | null;
        const insufficient = elig?.data_quality === "insufficient" || elig?.score === "INSUFFICIENT_DATA";
        return (
          <Link key={g.id} href={`/pipeline/${g.id}`}>
            <div className="rounded-lg border bg-card p-4 space-y-2 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm leading-tight">{g.title}</p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${STAGE_COLORS[g.stage || "discovery"]}`}
                >
                  {STAGE_LABELS[g.stage || "discovery"] || g.stage}
                </span>
              </div>
              {g.funder_name && (
                <p className="text-xs text-muted-foreground">{g.funder_name}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {g.screening_score != null && !insufficient && (
                  <Badge
                    variant={g.screening_score >= 80 ? "default" : g.screening_score >= 50 ? "secondary" : "destructive"}
                  >
                    {g.screening_score}% score
                  </Badge>
                )}
                {insufficient && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                    Not Enough Info
                  </Badge>
                )}
                {elig?.confidence != null && (
                  <Badge variant={elig.confidence >= 80 ? "default" : elig.confidence >= 50 ? "secondary" : "destructive"}>
                    {elig.confidence}% conf
                  </Badge>
                )}
                {g.amount && <span className="text-muted-foreground">${Number(g.amount).toLocaleString()}</span>}
                {g.deadline && (
                  <span className="text-muted-foreground">
                    Due: {isNaN(new Date(g.deadline).getTime()) ? g.deadline : new Date(g.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>

    {/* Desktop table layout */}
    <div className="hidden sm:block rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Grant</TableHead>
            <TableHead>Funder</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Screening</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Deadline</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grants.map((g) => (
            <TableRow key={g.id} className="cursor-pointer hover:bg-muted/50">
              <TableCell>
                <Link
                  href={`/pipeline/${g.id}`}
                  className="font-medium hover:underline"
                >
                  {g.title}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {g.funder_name || "—"}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[g.stage || "discovery"]}`}
                >
                  {STAGE_LABELS[g.stage || "discovery"] || g.stage}
                </span>
              </TableCell>
              <TableCell>
                {g.screening_score != null ? (
                  (() => {
                    const elig = (typeof g.eligibility === "string" ? JSON.parse(g.eligibility) : g.eligibility) as { data_quality?: string; score?: string } | null;
                    const insufficient = elig?.data_quality === "insufficient" || elig?.score === "INSUFFICIENT_DATA";
                    return insufficient ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                        Not Enough Info
                      </Badge>
                    ) : (
                      <Badge
                        variant={
                          g.screening_score >= 80
                            ? "default"
                            : g.screening_score >= 50
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {g.screening_score}%
                      </Badge>
                    );
                  })()
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {(() => {
                  const elig = (typeof g.eligibility === "string"
                    ? JSON.parse(g.eligibility)
                    : g.eligibility) as { confidence?: number } | null;
                  const confidence = elig?.confidence;
                  if (confidence == null) return <span className="text-xs text-muted-foreground">—</span>;
                  return (
                    <Badge
                      variant={
                        confidence >= 80 ? "default" :
                        confidence >= 50 ? "secondary" : "destructive"
                      }
                    >
                      {confidence}%
                    </Badge>
                  );
                })()}
              </TableCell>
              <TableCell className="text-right">
                {g.amount || "—"}
              </TableCell>
              <TableCell>
                {g.deadline
                  ? isNaN(new Date(g.deadline).getTime())
                    ? g.deadline
                    : new Date(g.deadline).toLocaleDateString()
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    </>
  );
}
