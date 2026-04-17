"use client";

import type { Tables } from "@/lib/supabase/database.types";
import { parseGrantAmount, isMissingGrantValue } from "@/lib/grants/filters";
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

const STAGES = [
  { key: "discovery", label: "Discovered", color: "bg-blue-500" },
  { key: "screening", label: "Screened", color: "bg-yellow-500" },
  { key: "pending_approval", label: "Waiting for Approval", color: "bg-amber-500" },
  { key: "drafting", label: "Drafted", color: "bg-purple-500" },
  { key: "closed", label: "Closed", color: "bg-muted-foreground" },
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
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {grant.screening_score}%
    </span>
  );
}

function ConfidenceScore({ grant }: { grant: Grant }) {
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
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
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
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {score}% quality
    </span>
  );
}

function DeadlineCell({ deadline }: { deadline: string | null }) {
  if (!deadline || isMissingGrantValue(deadline)) {
    return <span className="text-xs text-muted-foreground italic">No deadline mentioned</span>;
  }
  const dl = new Date(deadline);
  const valid = !isNaN(dl.getTime());
  const expired = valid && dl < new Date(new Date().toDateString());
  return (
    <span className={`text-xs ${expired ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
      {expired ? "Expired: " : "Due: "}
      {valid ? dl.toLocaleDateString() : deadline}
    </span>
  );
}

function groupByStage(grants: Grant[]) {
  const groups = new Map<string, Grant[]>();
  for (const g of grants) {
    const stage = g.stage || "discovery";
    const list = groups.get(stage) || [];
    list.push(g);
    groups.set(stage, list);
  }
  return STAGES.filter((s) => groups.has(s.key)).map((stage) => ({
    ...stage,
    grants: groups.get(stage.key)!,
  }));
}

export function ListView({
  grants,
  proposalQualityMap = {},
}: {
  grants: Grant[];
  proposalQualityMap?: Record<string, number>;
}) {
  if (grants.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No grants found
      </p>
    );
  }

  const grouped = groupByStage(grants);

  return (
    <>
    {/* Mobile card layout */}
    <div className="sm:hidden space-y-6">
      {grouped.map((col) => (
        <div key={col.key} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${col.color}`} />
            <span className="text-sm font-medium">{col.label}</span>
            <span className="text-xs text-muted-foreground">
              {col.grants.length}
            </span>
          </div>
          {col.grants.map((g) => (
            <Link key={g.id} href={`/pipeline/${g.id}`}>
              <div className="rounded-lg border bg-card p-3 space-y-2 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium leading-tight">{g.title}</p>
                <p className={`text-xs text-muted-foreground ${isMissingGrantValue(g.funder_name) ? "italic" : ""}`}>
                  {isMissingGrantValue(g.funder_name) ? "No funder mentioned" : g.funder_name}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {g.amount && !isMissingGrantValue(g.amount) ? (
                    <Badge variant="secondary" className="text-xs">
                      ${parseGrantAmount(g.amount).toLocaleString()}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No amount mentioned</span>
                  )}
                  {col.key === "drafting" ? (
                    <>
                      <ConfidenceScore grant={g} />
                      <ProposalQualityScore score={proposalQualityMap[g.id]} />
                    </>
                  ) : (
                    <ScreeningScore grant={g} />
                  )}
                </div>
                <DeadlineCell deadline={g.deadline} />
              </div>
            </Link>
          ))}
        </div>
      ))}
    </div>

    {/* Desktop table layout */}
    <div className="hidden sm:block space-y-6">
      {grouped.map((col) => (
        <div key={col.key}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-2 w-2 rounded-full ${col.color}`} />
            <span className="text-sm font-medium">{col.label}</span>
            <span className="text-xs text-muted-foreground">
              {col.grants.length}
            </span>
          </div>
          <div className="rounded-lg border bg-card overflow-hidden">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Grant</TableHead>
                  <TableHead className="w-[20%]">Funder</TableHead>
                  <TableHead className="w-[15%]">Score</TableHead>
                  <TableHead className="w-[15%] text-right">Amount</TableHead>
                  <TableHead className="w-[15%]">Deadline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {col.grants.map((g) => (
                  <TableRow key={g.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="truncate">
                      <Link
                        href={`/pipeline/${g.id}`}
                        className="font-medium hover:underline"
                      >
                        {g.title}
                      </Link>
                    </TableCell>
                    <TableCell className={`text-muted-foreground truncate ${isMissingGrantValue(g.funder_name) ? "italic" : ""}`}>
                      {isMissingGrantValue(g.funder_name) ? "No funder mentioned" : g.funder_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {col.key === "drafting" ? (
                          <>
                            <ConfidenceScore grant={g} />
                            <ProposalQualityScore score={proposalQualityMap[g.id]} />
                          </>
                        ) : (
                          <ScreeningScore grant={g} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {g.amount && !isMissingGrantValue(g.amount) ? (
                        <Badge variant="secondary" className="text-xs">
                          ${parseGrantAmount(g.amount).toLocaleString()}
                        </Badge>
                      ) : <span className="text-xs text-muted-foreground italic">No amount mentioned</span>}
                    </TableCell>
                    <TableCell>
                      <DeadlineCell deadline={g.deadline} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
    </>
  );
}
