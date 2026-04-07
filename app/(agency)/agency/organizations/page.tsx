import { createClient, getUserAgencyId, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";
import { OrgTable } from "./org-table";

export default async function AgencyOrganizationsPage() {
  const supabase = await createClient();
  const { agencyId } = await getUserAgencyId(supabase);
  if (!agencyId) redirect("/login");

  // Use admin client to bypass RLS — agency owner needs to see all client orgs
  const adminClient = createAdminClient();
  const { data: orgs } = await adminClient
    .from("organizations")
    .select("id, name, sector, status, mission, created_at")
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            Organizations
          </h1>
          <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
            {(orgs || []).length} organization{(orgs || []).length !== 1 ? "s" : ""} managed
          </p>
        </div>
        <Link href="/agency/organizations/new" className="shrink-0">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Organization
          </Button>
        </Link>
      </div>

      {(!orgs || orgs.length === 0) ? (
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
        <OrgTable initialOrgs={orgs} grantCounts={grantCounts} />
      )}
    </div>
  );
}
