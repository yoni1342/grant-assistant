import { createClient, createAdminClient, getUserOrgId } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Clock,
  TrendingUp,
  ArrowRight,
  CircleOff,
  AlertTriangle,
} from "lucide-react";
import { GrantUsageCard } from "./grant-usage-card";
import { excludeFetchedExpired } from "@/lib/grants/filters";

const STAGE_LABELS: Record<string, string> = {
  discovery: "Discovered",
  screening: "Screened",
  pending_approval: "Waiting for Approval",
  drafting: "Drafted",
  // submission: "Submission",
  // awarded: "Awarded",
  // reporting: "Reporting",
  closed: "Closed",
};

const ACTION_LABELS: Record<string, string> = {
  screening_started: "Started eligibility screening",
  screening_completed: "Completed eligibility screening",
  screening_failed: "Eligibility screening failed",
  proposal_started: "Started proposal draft",
  proposal_generated: "Generated proposal draft",
  proposal_failed: "Proposal generation failed",
  grant_added: "Added grant to pipeline",
  grant_archived: "Archived grant",
  grant_restored: "Restored grant from archive",
  stage_changed: "Moved grant to a new stage",
  stage_changed_pending_approval: "Marked grant as ready for approval",
};

function formatActivityAction(
  action: string,
  details: Record<string, unknown> | null | undefined
) {
  const base =
    ACTION_LABELS[action] ??
    action
      .replace(/_/g, " ")
      .replace(/^./, (c) => c.toUpperCase());
  const grantName =
    details && typeof details === "object" && "grant_name" in details
      ? (details as { grant_name?: unknown }).grant_name
      : undefined;
  if (typeof grantName === "string" && grantName.trim()) {
    return `${base} — ${grantName}`;
  }
  return base;
}

function getDeadlineUrgency(deadline: string) {
  const now = new Date();
  const dl = new Date(deadline);
  const hoursLeft = (dl.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursLeft < 24) return { label: "Critical", variant: "destructive" as const };
  if (hoursLeft < 48) return { label: "Urgent", variant: "destructive" as const };
  if (hoursLeft < 168) return { label: "Soon", variant: "secondary" as const };
  return { label: "", variant: "outline" as const };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { orgId } = await getUserOrgId(supabase);
  if (!orgId) redirect("/login");

  const adminDb = createAdminClient();

  // Fetch grants for pipeline overview
  const { data: grants } = await adminDb
    .from("grants_full")
    .select("id, title, funder_name, stage, amount, deadline, created_at")
    .eq("org_id", orgId)
    .neq("stage", "archived")
    .order("created_at", { ascending: false });

  // Fetch recent activity
  const { data: activities } = await adminDb
    .from("activity_log")
    .select("id, action, details, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  const allGrants = excludeFetchedExpired(grants || []);

  // Pipeline counts by stage
  const stageCounts = allGrants.reduce(
    (acc, g) => {
      const stage = g.stage || "discovery";
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Metrics
  const now = new Date();
  const totalGrants = allGrants.length;
  const activeDeadlines = allGrants.filter(
    (g) => g.deadline && (!isNaN(new Date(g.deadline).getTime()) ? new Date(g.deadline) > now : true)
  ).length;
  const noDeadlineGrants = allGrants.filter((g) => !g.deadline).length;
  const pastDeadlineGrants = allGrants.filter(
    (g) => g.deadline && !isNaN(new Date(g.deadline).getTime()) && new Date(g.deadline) <= now
  ).length;

  // Upcoming deadlines list (all, sorted by soonest first)
  const deadlineGrants = allGrants
    .filter((g) => g.deadline && new Date(g.deadline) > new Date())
    .sort(
      (a, b) =>
        new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
    );

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight">Dashboard</h1>
        <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
          Your grant pipeline at a glance
        </p>
      </div>

      {/* Key Metrics */}
      <div data-tour="dashboard-metrics" className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Link href="/pipeline">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Grants</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGrants}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/deadlines">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Deadlines</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeDeadlines}</div>
              <p className="text-xs text-muted-foreground">Pending + Ongoing</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/no-deadline">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ongoing</CardTitle>
              <CircleOff className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{noDeadlineGrants}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/past-deadlines">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Past Deadlines</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pastDeadlineGrants}</div>
            </CardContent>
          </Card>
        </Link>
        <GrantUsageCard />
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 min-w-0">
        {/* Pipeline Overview */}
        <Card data-tour="dashboard-pipeline" className="lg:col-span-2 min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {totalGrants === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No grants yet. Head to Discovery to find opportunities.
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(STAGE_LABELS).map(([stage, label]) => {
                  const count = stageCounts[stage] || 0;
                  const pct =
                    totalGrants > 0
                      ? Math.round((count / totalGrants) * 100)
                      : 0;
                  return (
                    <div key={stage} className="flex items-center gap-2 sm:gap-3">
                      <span className="w-16 sm:w-24 text-xs sm:text-sm text-muted-foreground truncate">
                        {label}
                      </span>
                      <div className="flex-1 h-2 bg-muted">
                        <div
                          className="h-full bg-foreground transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm font-medium">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card data-tour="dashboard-deadlines" className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
            {deadlineGrants.length > 0 && (
              <Link
                href="/dashboard/deadlines"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View All
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {deadlineGrants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No upcoming deadlines
              </p>
            ) : (
              <ScrollArea className="h-[260px] sm:h-[340px] -mr-4 pr-4">
                <div className="space-y-1">
                  {deadlineGrants.map((g) => {
                    const urgency = getDeadlineUrgency(g.deadline!);
                    return (
                      <Link
                        key={g.id}
                        href={`/pipeline/${g.id}?from=deadlines`}
                        className="flex items-start justify-between gap-2 rounded-md px-2 py-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {g.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(g.deadline!).toLocaleDateString()}
                          </p>
                        </div>
                        {urgency.label && (
                          <Badge variant={urgency.variant} className="shrink-0">
                            {urgency.label}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card data-tour="dashboard-activity">
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {!activities || activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No recent activity
            </p>
          ) : (
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      {formatActivityAction(
                        a.action,
                        a.details as Record<string, unknown> | null
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at!).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
