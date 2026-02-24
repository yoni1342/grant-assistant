import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Target,
  DollarSign,
  Clock,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

const STAGE_LABELS: Record<string, string> = {
  discovery: "Discovery",
  screening: "Screening",
  drafting: "Drafting",
  // submission: "Submission",
  // awarded: "Awarded",
  // reporting: "Reporting",
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

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch grants for pipeline overview
  const { data: grants } = await supabase
    .from("grants")
    .select("id, title, funder_name, stage, amount, deadline")
    .order("created_at", { ascending: false });

  // Fetch recent activity
  const { data: activities } = await supabase
    .from("activity_log")
    .select("id, action, details, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch submissions and awards for metrics
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id");
  const { data: awards } = await supabase
    .from("awards")
    .select("id, amount");

  const allGrants = grants || [];
  const allAwards = awards || [];
  const allSubmissions = submissions || [];

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
  const totalGrants = allGrants.length;
  const pipelineValue = allGrants.reduce(
    (sum, g) => sum + (g.amount || 0),
    0
  );
  const winRate =
    allSubmissions.length > 0
      ? ((allAwards.length / allSubmissions.length) * 100).toFixed(0)
      : "0";
  const upcomingDeadlines = allGrants.filter(
    (g) => g.deadline && new Date(g.deadline) > new Date()
  ).length;

  // Upcoming deadlines list
  const deadlineGrants = allGrants
    .filter((g) => g.deadline && new Date(g.deadline) > new Date())
    .sort(
      (a, b) =>
        new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
    )
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your grant pipeline at a glance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Grants</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGrants}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pipeline Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${pipelineValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Deadlines
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingDeadlines}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pipeline Overview */}
        <Card className="lg:col-span-2">
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
                    <div key={stage} className="flex items-center gap-3">
                      <span className="w-24 text-sm text-muted-foreground">
                        {label}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-all"
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            {deadlineGrants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No upcoming deadlines
              </p>
            ) : (
              <div className="space-y-3">
                {deadlineGrants.map((g) => {
                  const urgency = getDeadlineUrgency(g.deadline!);
                  return (
                    <div
                      key={g.id}
                      className="flex items-start justify-between gap-2"
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
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
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
                    <p className="text-sm">{a.action}</p>
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
