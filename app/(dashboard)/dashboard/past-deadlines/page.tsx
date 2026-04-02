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

const STAGE_LABELS: Record<string, string> = {
  discovery: "Discovered",
  screening: "Screened",
  pending_approval: "Waiting for Approval",
  drafting: "Drafted",
  closed: "Closed",
};

export default async function PastDeadlinesPage() {
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) redirect("/login");

  const adminDb = createAdminClient();

  const { data: grants } = await adminDb
    .from("grants")
    .select("id, title, funder_name, stage, amount, deadline, description, source_url")
    .eq("org_id", orgId)
    .neq("stage", "archived")
    .not("deadline", "is", null)
    .order("created_at", { ascending: false });

  const now = new Date();
  const pastGrants = (grants || [])
    .filter((g) => {
      const dl = new Date(g.deadline!);
      return !isNaN(dl.getTime()) && dl <= now;
    })
    .sort((a, b) => new Date(b.deadline!).getTime() - new Date(a.deadline!).getTime());

  return (
    <div className="p-6 space-y-6 w-full min-w-0">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            Past Deadlines
          </h1>
          <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
            {pastGrants.length} grant{pastGrants.length === 1 ? "" : "s"} with expired deadlines
          </p>
        </div>
      </div>

      {pastGrants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No past deadlines</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table className="table-fixed w-full">
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
              {pastGrants.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="truncate">
                    <Link href={`/pipeline/${g.id}`} className="font-medium hover:underline">
                      {g.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate">
                    {g.funder_name || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm">{new Date(g.deadline!).toLocaleDateString()}</span>
                      <Badge variant="destructive" className="text-xs">
                        Expired
                      </Badge>
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
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
