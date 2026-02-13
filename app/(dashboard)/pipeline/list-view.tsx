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
  drafting: "bg-purple-100 text-purple-800",
  submission: "bg-orange-100 text-orange-800",
  awarded: "bg-green-100 text-green-800",
  reporting: "bg-teal-100 text-teal-800",
  closed: "bg-zinc-100 text-zinc-800",
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
    <div className="rounded-lg border bg-white dark:bg-zinc-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Grant</TableHead>
            <TableHead>Funder</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Screening</TableHead>
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
                  {(g.stage || "discovery").charAt(0).toUpperCase() +
                    (g.stage || "discovery").slice(1)}
                </span>
              </TableCell>
              <TableCell>
                {g.screening_result ? (
                  <Badge
                    variant={
                      g.screening_result === "green"
                        ? "default"
                        : g.screening_result === "yellow"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {g.screening_result.toUpperCase()}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {g.amount ? `$${g.amount.toLocaleString()}` : "—"}
              </TableCell>
              <TableCell>
                {g.deadline
                  ? new Date(g.deadline).toLocaleDateString()
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
