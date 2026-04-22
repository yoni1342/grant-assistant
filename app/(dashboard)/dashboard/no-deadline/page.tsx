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
import { excludeFetchedExpired, isMissingGrantValue } from "@/lib/grants/filters";

const STAGE_LABELS: Record<string, string> = {
  discovery: "Discovered",
  screening: "Screened",
  pending_approval: "Waiting for Approval",
  drafting: "Drafted",
  closed: "Closed",
};

export default async function NoDeadlinePage() {
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) redirect("/login");

  const adminDb = createAdminClient();

  const { data: grants } = await adminDb
    .from("grants_full")
    .select("id, title, funder_name, stage, amount, deadline, description, source_url, created_at")
    .eq("org_id", orgId)
    .neq("stage", "archived")
    .is("deadline", null)
    .order("created_at", { ascending: false });

  const noDeadlineGrants = excludeFetchedExpired(grants || []);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 w-full min-w-0">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            Ongoing Grants
          </h1>
          <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
            {noDeadlineGrants.length} grant{noDeadlineGrants.length === 1 ? "" : "s"} open on a rolling basis
          </p>
        </div>
      </div>

      {noDeadlineGrants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No ongoing grants in your pipeline</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[45%]">Title</TableHead>
                <TableHead className="w-[25%]">Funder</TableHead>
                <TableHead className="w-[15%]">Amount</TableHead>
                <TableHead className="w-[15%]">Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {noDeadlineGrants.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="truncate">
                    <Link href={`/pipeline/${g.id}?from=no-deadline`} className="font-medium hover:underline">
                      {g.title}
                    </Link>
                  </TableCell>
                  <TableCell className={`text-muted-foreground truncate ${isMissingGrantValue(g.funder_name) ? "italic" : ""}`}>
                    {isMissingGrantValue(g.funder_name) ? "No funder mentioned" : g.funder_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {g.amount != null && !isMissingGrantValue(g.amount)
                      ? typeof g.amount === "number"
                        ? `$${g.amount.toLocaleString()}`
                        : String(g.amount)
                      : <span className="italic">No amount mentioned</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {STAGE_LABELS[g.stage] || g.stage}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
