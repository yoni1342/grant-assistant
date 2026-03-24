"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

interface Grant {
  id: string;
  title: string;
  funder_name: string | null;
  amount: string | null;
  stage: string | null;
  screening_score: number | null;
  org_id: string;
  deadline: string | null;
  created_at: string | null;
}

interface Org {
  id: string;
  name: string;
}

type StageFilter = "all" | "discovery" | "screening" | "pending_approval" | "drafting" | "submission" | "awarded" | "reporting" | "closed";

const STAGES: StageFilter[] = ["all", "discovery", "screening", "pending_approval", "drafting", "submission", "awarded", "reporting", "closed"];

function stageBadge(stage: string | null) {
  if (!stage) return <span className="text-muted-foreground">—</span>;
  const colors: Record<string, string> = {
    discovery: "bg-blue-100 text-blue-800",
    screening: "bg-yellow-100 text-yellow-800",
    pending_approval: "bg-amber-100 text-amber-800",
    drafting: "bg-purple-100 text-purple-800",
    submission: "bg-orange-100 text-orange-800",
    awarded: "bg-green-100 text-green-800",
    reporting: "bg-teal-100 text-teal-800",
    closed: "bg-gray-100 text-gray-800",
  };
  const labels: Record<string, string> = {
    discovery: "Discovered",
    screening: "Screened",
    pending_approval: "Waiting for Approval",
    drafting: "Drafted",
    closed: "Closed",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[stage] || "bg-gray-100 text-gray-800"}`}>
      {labels[stage] || stage}
    </span>
  );
}

function scoreBadge(score: number | null) {
  if (score == null) return <span className="text-muted-foreground">—</span>;
  const color =
    score >= 80
      ? "bg-green-100 text-green-800"
      : score >= 50
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {score}%
    </span>
  );
}

export function GrantsClient({
  grants,
  organizations,
}: {
  grants: Grant[];
  organizations: Org[];
}) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");

  const orgMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const org of organizations) map[org.id] = org.name;
    return map;
  }, [organizations]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of grants) {
      const s = g.stage || "unknown";
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [grants]);

  const filtered = useMemo(() => {
    return grants.filter((g) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        g.title.toLowerCase().includes(q) ||
        (g.funder_name?.toLowerCase().includes(q) ?? false) ||
        (orgMap[g.org_id]?.toLowerCase().includes(q) ?? false);
      const matchesStage = stageFilter === "all" || g.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [grants, search, stageFilter, orgMap]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Grants</h2>

      {/* Stage stat cards */}
      <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-7">
        {STAGES.filter((s) => s !== "all").map((stage) => (
          <Card
            key={stage}
            className={`cursor-pointer transition-shadow hover:shadow-md ${stageFilter === stage ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStageFilter(stageFilter === stage ? "all" : stage)}
          >
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground capitalize">
                {stage}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-2xl font-bold">{stageCounts[stage] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search grants by title, funder, or organization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {STAGES.map((s) => (
            <Button
              key={s}
              variant={stageFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStageFilter(s)}
            >
              {s === "all" ? "All" : s === "pending_approval" ? "Waiting for Approval" : s === "discovery" ? "Discovered" : s === "screening" ? "Screened" : s.charAt(0).toUpperCase() + s.slice(1)}
              {s !== "all" && ` (${stageCounts[s] || 0})`}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Funder</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No grants found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((grant) => (
                  <TableRow key={grant.id}>
                    <TableCell className="font-medium max-w-[250px] truncate">
                      {grant.title}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {grant.funder_name || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {orgMap[grant.org_id] || "Unknown"}
                    </TableCell>
                    <TableCell>{stageBadge(grant.stage)}</TableCell>
                    <TableCell>{scoreBadge(grant.screening_score)}</TableCell>
                    <TableCell className="text-sm">
                      {grant.amount ? `$${Number(grant.amount).toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {grant.deadline
                        ? isNaN(new Date(grant.deadline).getTime())
                          ? grant.deadline
                          : new Date(grant.deadline).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {grant.created_at
                        ? new Date(grant.created_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {grants.length} grants
      </p>
    </div>
  );
}
