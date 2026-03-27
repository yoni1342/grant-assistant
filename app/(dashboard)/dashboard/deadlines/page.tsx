import { createClient, getUserOrgId } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  Building2,
  DollarSign,
  ExternalLink,
} from "lucide-react";

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

export default async function DeadlinesPage() {
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) redirect("/login");

  const { data: grants } = await supabase
    .from("grants")
    .select("id, title, funder_name, stage, amount, deadline, description, source_url")
    .eq("org_id", orgId)
    .not("deadline", "is", null)
    .gt("deadline", new Date().toISOString())
    .order("deadline", { ascending: true });

  const deadlineGrants = grants || [];

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
            Upcoming Deadlines
          </h1>
          <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
            {deadlineGrants.length} grant{deadlineGrants.length === 1 ? "" : "s"} with upcoming deadlines
          </p>
        </div>
      </div>

      {deadlineGrants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {deadlineGrants.map((g) => {
            const urgency = getDeadlineUrgency(g.deadline!);
            return (
              <Link key={g.id} href={`/pipeline/${g.id}?from=deadlines`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className="font-medium leading-tight truncate min-w-0">
                            {g.title}
                          </h3>
                          {urgency.label && (
                            <Badge variant={urgency.variant} className="shrink-0">
                              {urgency.label}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          {g.funder_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              {g.funder_name}
                            </span>
                          )}
                          {g.amount != null && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5" />
                              {typeof g.amount === "number"
                                ? `$${g.amount.toLocaleString()}`
                                : String(g.amount)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(g.deadline!).toLocaleDateString()}
                          </span>
                        </div>
                        {g.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {g.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 pt-0.5">
                          <Badge variant="outline" className="text-xs">
                            {STAGE_LABELS[g.stage] || g.stage}
                          </Badge>
                          {g.source_url && (
                            <a
                              href={g.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Source
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
