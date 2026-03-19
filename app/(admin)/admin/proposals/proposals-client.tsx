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

interface Proposal {
  id: string;
  title: string | null;
  status: string | null;
  quality_score: number | null;
  org_id: string;
  grant_id: string | null;
  created_at: string | null;
}

interface Org {
  id: string;
  name: string;
}

type StatusFilter = "all" | string;

function statusBadge(status: string | null) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    generating: "bg-blue-100 text-blue-800",
    generated: "bg-green-100 text-green-800",
    reviewed: "bg-purple-100 text-purple-800",
    submitted: "bg-orange-100 text-orange-800",
    failed: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}>
      {status}
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

export function ProposalsClient({
  proposals,
  organizations,
  grantMap,
}: {
  proposals: Proposal[];
  organizations: Org[];
  grantMap: Record<string, string>;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const orgMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const org of organizations) map[org.id] = org.name;
    return map;
  }, [organizations]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const p of proposals) {
      if (p.status) set.add(p.status);
    }
    return Array.from(set).sort();
  }, [proposals]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of proposals) {
      const s = p.status || "unknown";
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [proposals]);

  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        (p.title?.toLowerCase().includes(q) ?? false) ||
        (orgMap[p.org_id]?.toLowerCase().includes(q) ?? false) ||
        (p.grant_id && grantMap[p.grant_id]?.toLowerCase().includes(q));
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [proposals, search, statusFilter, orgMap, grantMap]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Proposals</h2>

      {/* Status stat cards */}
      <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-6">
        {statuses.map((status) => (
          <Card
            key={status}
            className={`cursor-pointer transition-shadow hover:shadow-md ${statusFilter === status ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
          >
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground capitalize">
                {status}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-2xl font-bold">{statusCounts[status] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, organization, or grant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
          {statuses.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s] || 0})
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
                <TableHead>Grant</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quality Score</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No proposals found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((proposal) => (
                  <TableRow key={proposal.id}>
                    <TableCell className="font-medium max-w-[250px] truncate">
                      {proposal.title || "Untitled"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {proposal.grant_id ? grantMap[proposal.grant_id] || "Unknown" : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {orgMap[proposal.org_id] || "Unknown"}
                    </TableCell>
                    <TableCell>{statusBadge(proposal.status)}</TableCell>
                    <TableCell>{scoreBadge(proposal.quality_score)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {proposal.created_at
                        ? new Date(proposal.created_at).toLocaleDateString()
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
        Showing {filtered.length} of {proposals.length} proposals
      </p>
    </div>
  );
}
