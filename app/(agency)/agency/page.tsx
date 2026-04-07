import { createClient, getUserAgencyId, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, FileText, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AgencyDashboardPage() {
  const supabase = await createClient();
  const { agencyId } = await getUserAgencyId(supabase);
  if (!agencyId) redirect("/login");

  // Fetch agency info
  const { data: agency } = await supabase
    .from("agencies")
    .select("name, subscription_status, trial_ends_at")
    .eq("id", agencyId)
    .single();

  // Fetch all orgs under this agency using admin client to bypass RLS
  const adminClient = createAdminClient();
  const { data: orgs } = await adminClient
    .from("organizations")
    .select("id, name, sector, status, created_at")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  // Fetch grant counts per org
  const orgIds = (orgs || []).map((o) => o.id);
  let grantCounts: Record<string, number> = {};
  if (orgIds.length > 0) {
    const { data: grants } = await adminClient
      .from("grants")
      .select("org_id")
      .in("org_id", orgIds);
    if (grants) {
      grantCounts = grants.reduce((acc, g) => {
        acc[g.org_id] = (acc[g.org_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }
  }

  const totalOrgs = orgs?.length || 0;
  const totalGrants = Object.values(grantCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            {agency?.name || "Agency"} Dashboard
          </h1>
          <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
            Manage your organizations
          </p>
        </div>
        <Link href="/agency/organizations/new" className="shrink-0">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Organization
          </Button>
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={agency?.subscription_status === "active" || agency?.subscription_status === "trialing" ? "default" : "destructive"}>
              {agency?.subscription_status || "active"}
            </Badge>
            {agency?.subscription_status === "trialing" && agency?.trial_ends_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Trial ends {new Date(agency.trial_ends_at).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Organization Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold uppercase tracking-tight">
            Your Organizations
          </h2>
          <Link
            href="/agency/organizations"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {totalOrgs === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                No organizations yet. Create your first one to get started.
              </p>
              <Link href="/agency/organizations/new">
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Organization
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(orgs || []).map((org) => (
              <Link key={org.id} href={`/api/agency/switch-org?orgId=${org.id}&redirect=true`}>
                <Card className="hover:border-foreground/20 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium truncate">
                        {org.name}
                      </CardTitle>
                      <Badge
                        variant={
                          org.status === "active" || org.status === "approved"
                            ? "default"
                            : "secondary"
                        }
                        className={
                          org.status === "suspended"
                            ? "border-orange-300 text-orange-700 dark:text-orange-400"
                            : ""
                        }
                      >
                        {org.status === "active" || org.status === "approved"
                          ? "Active"
                          : org.status === "suspended"
                            ? "Suspended"
                            : org.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{org.sector || "No sector"}</span>
                      <span>{grantCounts[org.id] || 0} grants</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
