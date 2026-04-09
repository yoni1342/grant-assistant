import { createClient, getUserAgencyId } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, FileText, Clock, TrendingUp } from "lucide-react";

const STAGE_LABELS: Record<string, string> = {
  discovery: "Discovered",
  screening: "Screened",
  pending_approval: "Waiting for Approval",
  drafting: "Drafted",
  closed: "Closed",
};

export default async function AgencyAnalyticsPage() {
  const supabase = await createClient();
  const { agencyId } = await getUserAgencyId(supabase);
  if (!agencyId) redirect("/login");

  // Fetch all orgs under this agency
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, sector, status")
    .eq("agency_id", agencyId)
    .neq("plan", "agency")
    .order("name");

  const orgIds = (orgs || []).map((o) => o.id);

  // Fetch all grants across agency orgs
  let allGrants: { id: string; org_id: string; title: string; stage: string; amount: number | null; deadline: string | null; funder_name: string | null }[] = [];
  if (orgIds.length > 0) {
    const { data: grants } = await supabase
      .from("grants")
      .select("id, org_id, title, stage, amount, deadline, funder_name")
      .in("org_id", orgIds)
      .order("created_at", { ascending: false });
    allGrants = grants || [];
  }

  // Fetch recent activity across all orgs
  let activities: { id: string; org_id: string; action: string; created_at: string }[] = [];
  if (orgIds.length > 0) {
    const { data: acts } = await supabase
      .from("activity_log")
      .select("id, org_id, action, created_at")
      .in("org_id", orgIds)
      .order("created_at", { ascending: false })
      .limit(20);
    activities = acts || [];
  }

  // Aggregate metrics
  const totalGrants = allGrants.length;
  const totalOrgs = orgs?.length || 0;
  const upcomingDeadlines = allGrants.filter(
    (g) => g.deadline && new Date(g.deadline) > new Date()
  ).length;

  // Stage counts
  const stageCounts = allGrants.reduce((acc, g) => {
    const stage = g.stage || "discovery";
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Per-org breakdown
  const orgMap = new Map((orgs || []).map((o) => [o.id, o]));
  const perOrgStats = (orgs || []).map((org) => {
    const orgGrants = allGrants.filter((g) => g.org_id === org.id);
    return {
      id: org.id,
      name: org.name,
      sector: org.sector,
      status: org.status,
      grantCount: orgGrants.length,
      totalAmount: orgGrants.reduce((sum, g) => sum + (g.amount || 0), 0),
      upcomingDeadlines: orgGrants.filter(
        (g) => g.deadline && new Date(g.deadline) > new Date()
      ).length,
    };
  });

  // Upcoming deadlines across all orgs
  const deadlineGrants = allGrants
    .filter((g) => g.deadline && new Date(g.deadline) > new Date())
    .sort(
      (a, b) =>
        new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
    )
    .slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">
          Analytics
        </h1>
        <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
          Cross-organization performance overview
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4" data-tour="agency-analytics-summary">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrgs}</div>
          </CardContent>
        </Card>
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
            <CardTitle className="text-sm font-medium">Pending Deadlines</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingDeadlines}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${allGrants.reduce((sum, g) => sum + (g.amount || 0), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3" data-tour="agency-analytics-pipeline">
        {/* Pipeline Overview (aggregated) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pipeline Overview (All Orgs)</CardTitle>
          </CardHeader>
          <CardContent>
            {totalGrants === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No grants yet across any organizations.
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(STAGE_LABELS).map(([stage, label]) => {
                  const count = stageCounts[stage] || 0;
                  const pct = totalGrants > 0 ? Math.round((count / totalGrants) * 100) : 0;
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <span className="w-32 text-sm text-muted-foreground">{label}</span>
                      <div className="flex-1 h-2 bg-muted">
                        <div
                          className="h-full bg-foreground transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm font-medium">{count}</span>
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
              <ScrollArea className="h-[280px] -mr-4 pr-4">
                <div className="space-y-2">
                  {deadlineGrants.map((g) => {
                    const orgName = orgMap.get(g.org_id)?.name || "Unknown";
                    return (
                      <div key={g.id} className="rounded-md px-2 py-2 hover:bg-muted/50 transition-colors">
                        <p className="truncate text-sm font-medium">{g.title}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                          <span>{orgName}</span>
                          <span>{new Date(g.deadline!).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-Org Breakdown */}
      <Card data-tour="agency-analytics-breakdown">
        <CardHeader>
          <CardTitle className="text-base">Organization Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {perOrgStats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No organizations yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-muted-foreground">Organization</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Sector</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Grants</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Pipeline Value</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Deadlines</th>
                  </tr>
                </thead>
                <tbody>
                  {perOrgStats.map((org) => (
                    <tr key={org.id} className="border-b border-border/50">
                      <td className="py-2 font-medium">{org.name}</td>
                      <td className="py-2 text-muted-foreground">{org.sector || "-"}</td>
                      <td className="py-2">
                        <Badge variant={org.status === "approved" ? "default" : "secondary"}>
                          {org.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-right">{org.grantCount}</td>
                      <td className="py-2 text-right">${org.totalAmount.toLocaleString()}</td>
                      <td className="py-2 text-right">{org.upcomingDeadlines}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card data-tour="agency-analytics-activity">
        <CardHeader>
          <CardTitle className="text-base">Recent Activity (All Orgs)</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No recent activity
            </p>
          ) : (
            <div className="space-y-3">
              {activities.map((a) => {
                const orgName = orgMap.get(a.org_id)?.name || "Unknown";
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{orgName}:</span> {a.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
