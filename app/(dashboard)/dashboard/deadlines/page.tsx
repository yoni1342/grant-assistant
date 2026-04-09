import { createClient, createAdminClient, getUserOrgId } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { DeadlineFilter } from "./deadline-filter";
import { excludeFetchedExpired } from "@/lib/grants/filters";

const STAGE_LABELS: Record<string, string> = {
  discovery: "Discovered",
  screening: "Screened",
  pending_approval: "Waiting for Approval",
  drafting: "Drafted",
  closed: "Closed",
};

function getDeadlineUrgency(deadline: string) {
  const now = new Date();
  const dl = new Date(deadline);
  const hoursLeft = (dl.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursLeft < 24) return { label: "Critical", variant: "destructive" as const };
  if (hoursLeft < 48) return { label: "Urgent", variant: "destructive" as const };
  if (hoursLeft < 168) return { label: "Soon", variant: "secondary" as const };
  return { label: "", variant: "outline" as const };
}

function getFilterCutoff(filter: string): Date | null {
  const now = new Date();
  switch (filter) {
    case "1w": return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "2w": return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    case "1m": return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    case "3m": return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    default: return null;
  }
}

export default async function DeadlinesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = "all" } = await searchParams;
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) redirect("/login");

  const adminDb = createAdminClient();

  const { data: grants } = await adminDb
    .from("grants")
    .select("id, title, funder_name, stage, amount, deadline, description, source_url, created_at")
    .eq("org_id", orgId)
    .neq("stage", "archived")
    .not("deadline", "is", null)
    .order("created_at", { ascending: false });

  const now = new Date();
  const cutoff = getFilterCutoff(filter);

  const allActive = excludeFetchedExpired(grants || []).filter((g) => {
    const dl = new Date(g.deadline!);
    const isValidDate = !isNaN(dl.getTime());
    if (isValidDate) return dl > now;
    return true;
  });

  const filtered = filter === "ongoing"
    ? allActive.filter((g) => isNaN(new Date(g.deadline!).getTime()))
    : cutoff
      ? allActive.filter((g) => {
          const dl = new Date(g.deadline!);
          if (isNaN(dl.getTime())) return false;
          return dl <= cutoff;
        })
      : allActive;

  const sorted = [...filtered].sort((a, b) => {
    const aDate = new Date(a.deadline!);
    const bDate = new Date(b.deadline!);
    const aValid = !isNaN(aDate.getTime());
    const bValid = !isNaN(bDate.getTime());
    if (aValid && bValid) return aDate.getTime() - bDate.getTime();
    if (aValid) return -1;
    if (bValid) return 1;
    return 0;
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 w-full min-w-0">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            Active Deadlines
          </h1>
          <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
            {sorted.length} grant{sorted.length === 1 ? "" : "s"}
          </p>
        </div>
        <DeadlineFilter />
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No grants match this filter</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden overflow-x-auto">
          <Table className="table-fixed w-full min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Title</TableHead>
                <TableHead className="w-[20%]">Funder</TableHead>
                <TableHead className="w-[20%]">Deadline</TableHead>
                <TableHead className="w-[10%]">Amount</TableHead>
                <TableHead className="w-[10%]">Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((g) => {
                const dl = new Date(g.deadline!);
                const isValidDate = !isNaN(dl.getTime());
                const urgency = isValidDate ? getDeadlineUrgency(g.deadline!) : null;
                return (
                  <TableRow key={g.id}>
                    <TableCell className="truncate">
                      <Link href={`/pipeline/${g.id}?from=deadlines`} className="font-medium hover:underline">
                        {g.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate">
                      {g.funder_name || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm">{isValidDate ? dl.toLocaleDateString() : g.deadline}</span>
                        {isValidDate && urgency?.label && (
                          <Badge variant={urgency.variant} className="text-xs">
                            {urgency.label}
                          </Badge>
                        )}
                        {!isValidDate && (
                          <Badge variant="secondary" className="text-xs">
                            Rolling
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {g.amount != null
                        ? typeof g.amount === "number"
                          ? `$${g.amount.toLocaleString()}`
                          : String(g.amount)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {STAGE_LABELS[g.stage] || g.stage}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
