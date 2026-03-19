"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { Building2, Users, FileText, PenTool, Clock, CheckCircle2, ShieldOff, UserX } from "lucide-react";
import { approveOrganization } from "./organizations/actions";
import Link from "next/link";

interface OverviewClientProps {
  organizations: Array<{
    id: string;
    name: string;
    status: string;
    created_at: string | null;
    sector: string | null;
  }>;
  totalUsers: number;
  deactivatedUsers: number;
  grants: Array<{
    id: string;
    created_at: string | null;
    stage: string | null;
  }>;
  proposals: Array<{
    id: string;
    created_at: string | null;
    status: string | null;
  }>;
  workflowExecutions: Array<{
    id: string;
    created_at: string | null;
    status: string | null;
  }>;
  activityLog: Array<{
    id: string;
    action: string;
    created_at: string | null;
  }>;
  pendingOrgsWithOwners: Array<{
    id: string;
    name: string;
    created_at: string | null;
    owner_name: string | null;
    owner_email: string | null;
  }>;
}

function groupByMonth(
  items: Array<{ created_at: string | null }>,
  months: number = 6
) {
  const now = new Date();
  const result: Record<string, number> = {};

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    result[key] = 0;
  }

  for (const item of items) {
    if (!item.created_at) continue;
    const d = new Date(item.created_at);
    const key = d.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    if (key in result) {
      result[key]++;
    }
  }

  return Object.entries(result).map(([month, count]) => ({ month, count }));
}

function groupWorkflowsByMonth(
  items: Array<{ created_at: string | null; status: string | null }>,
  months: number = 6
) {
  const now = new Date();
  const result: Record<string, { completed: number; failed: number }> = {};

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    result[key] = { completed: 0, failed: 0 };
  }

  for (const item of items) {
    if (!item.created_at) continue;
    const d = new Date(item.created_at);
    const key = d.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    if (key in result) {
      if (item.status === "completed") result[key].completed++;
      else if (item.status === "failed") result[key].failed++;
    }
  }

  return Object.entries(result).map(([month, data]) => ({
    month,
    ...data,
  }));
}

const registrationChartConfig: ChartConfig = {
  count: { label: "Registrations", color: "hsl(220, 70%, 50%)" },
};

const grantsChartConfig: ChartConfig = {
  count: { label: "Grants", color: "hsl(142, 70%, 45%)" },
};

const proposalsChartConfig: ChartConfig = {
  count: { label: "Proposals", color: "hsl(280, 70%, 50%)" },
};

const workflowChartConfig: ChartConfig = {
  completed: { label: "Completed", color: "hsl(142, 70%, 45%)" },
  failed: { label: "Failed", color: "hsl(0, 70%, 50%)" },
};

export function OverviewClient({
  organizations,
  totalUsers,
  deactivatedUsers,
  grants,
  proposals,
  workflowExecutions,
  activityLog,
  pendingOrgsWithOwners,
}: OverviewClientProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const pendingCount = organizations.filter(
    (o) => o.status === "pending"
  ).length;
  const approvedCount = organizations.filter(
    (o) => o.status === "approved"
  ).length;
  const suspendedCount = organizations.filter(
    (o) => o.status === "suspended"
  ).length;

  const registrationData = useMemo(
    () => groupByMonth(organizations),
    [organizations]
  );
  const grantsData = useMemo(() => groupByMonth(grants), [grants]);
  const proposalsData = useMemo(() => groupByMonth(proposals), [proposals]);
  const workflowData = useMemo(
    () => groupWorkflowsByMonth(workflowExecutions),
    [workflowExecutions]
  );

  async function handleApprove(orgId: string) {
    setLoading(orgId);
    await approveOrganization(orgId);
    setLoading(null);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Platform Overview</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Link href="/admin/organizations" className="h-full">
          <Card className="h-full cursor-pointer transition-shadow hover:shadow-md hover:ring-1 hover:ring-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Orgs
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{organizations.length}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/organizations?status=pending" className="h-full">
          <Card className="h-full cursor-pointer transition-shadow hover:shadow-md hover:ring-1 hover:ring-amber-400/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Approvals
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/organizations?status=approved" className="h-full">
          <Card className="h-full cursor-pointer transition-shadow hover:shadow-md hover:ring-1 hover:ring-green-400/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved Orgs
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/organizations?status=suspended" className="h-full">
          <Card className="h-full cursor-pointer transition-shadow hover:shadow-md hover:ring-1 hover:ring-orange-400/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Suspended Orgs
              </CardTitle>
              <ShieldOff className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{suspendedCount}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users" className="h-full">
          <Card className="h-full cursor-pointer transition-shadow hover:shadow-md hover:ring-1 hover:ring-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalUsers}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users?status=deactivated" className="h-full">
          <Card className="h-full cursor-pointer transition-shadow hover:shadow-md hover:ring-1 hover:ring-red-400/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Deactivated Users
              </CardTitle>
              <UserX className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{deactivatedUsers}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/grants" className="h-full">
          <Card className="h-full cursor-pointer transition-shadow hover:shadow-md hover:ring-1 hover:ring-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Grants
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{grants.length}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/proposals" className="h-full">
          <Card className="h-full cursor-pointer transition-shadow hover:shadow-md hover:ring-1 hover:ring-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Proposals
              </CardTitle>
              <PenTool className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{proposals.length}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Usage Graphs */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Registrations Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={registrationChartConfig} className="h-[200px] w-full">
              <BarChart data={registrationData}>
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Grants Created Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={grantsChartConfig} className="h-[200px] w-full">
              <BarChart data={grantsData}>
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Proposals Generated Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={proposalsChartConfig} className="h-[200px] w-full">
              <BarChart data={proposalsData}>
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Workflow Executions Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={workflowChartConfig} className="h-[200px] w-full">
              <BarChart data={workflowData}>
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="completed" stackId="a" fill="var(--color-completed)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="failed" stackId="a" fill="var(--color-failed)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Pending Orgs + Activity Feed */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent Pending Orgs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Recent Pending Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingOrgsWithOwners.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending organizations
              </p>
            ) : (
              <div className="space-y-3">
                {pendingOrgsWithOwners.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{org.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {org.owner_name || org.owner_email || "Unknown owner"}
                        {org.created_at &&
                          ` \u00b7 ${new Date(org.created_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => handleApprove(org.id)}
                      disabled={loading === org.id}
                    >
                      {loading === org.id ? "..." : "Approve"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Platform Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {activityLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">{entry.action}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {entry.created_at
                        ? new Date(entry.created_at).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
