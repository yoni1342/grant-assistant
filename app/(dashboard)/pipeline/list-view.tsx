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
  discovery: "bg-blue-100 text-blue-800",
  screening: "bg-yellow-100 text-yellow-800",
  pending_approval: "bg-amber-100 text-amber-800",
  drafting: "bg-purple-100 text-purple-800",
  closed: "bg-muted text-foreground",
};

const STAGE_LABELS: Record<string, string> = {
  discovery: "Discovery",
  screening: "Screening",
  pending_approval: "Pending Approval",
  drafting: "Drafting",
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
    <div className="rounded-lg border bg-card">
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
            <TableRow key={g.id} className="cursor-pointer">
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
  );
}
