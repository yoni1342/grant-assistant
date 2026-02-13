"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Zap, ExternalLink } from "lucide-react";

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_BASE_URL || "";

export default function DiscoveryPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [screeningLoading, setScreeningLoading] = useState<string | null>(null);
  const [results, setResults] = useState<string | null>(null);

  async function triggerDiscovery() {
    if (!query.trim()) return;
    setLoading(true);
    setResults(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user!.id)
        .single();

      // Log the workflow execution
      await supabase.from("workflow_executions").insert({
        org_id: profile!.org_id!,
        workflow_name: "grant-discovery",
        status: "running",
        webhook_url: "/webhook/discover-grants",
      });

      setResults(
        "Discovery workflow triggered. Grants will appear in your pipeline as they're found. This typically takes 1-3 minutes."
      );
    } catch {
      setResults("Failed to trigger discovery. Check your n8n connection.");
    } finally {
      setLoading(false);
    }
  }

  async function triggerScreening(grantId: string) {
    setScreeningLoading(grantId);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user!.id)
        .single();

      await supabase.from("workflow_executions").insert({
        org_id: profile!.org_id!,
        grant_id: grantId,
        workflow_name: "eligibility-screening",
        status: "running",
        webhook_url: "/webhook/screen-grant",
      });
    } catch {
      // handle error
    } finally {
      setScreeningLoading(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Grant Discovery</h1>
        <p className="text-sm text-muted-foreground">
          Search for grant opportunities across Grants.gov, ProPublica,
          USAspending, CFDA, and Philanthropy News Digest
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for grants... (e.g., 'community health', 'STEM education')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && triggerDiscovery()}
                className="pl-9"
              />
            </div>
            <Button onClick={triggerDiscovery} disabled={loading || !query.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-1" />
              )}
              Discover
            </Button>
          </div>
          {results && (
            <p className="mt-3 text-sm text-muted-foreground">{results}</p>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Enter keywords describing grants you&apos;re looking for</li>
              <li>
                n8n searches across 5 databases simultaneously
              </li>
              <li>Matching grants appear in your Pipeline automatically</li>
              <li>Run AI screening on any grant to check eligibility</li>
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Data Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Grants.gov</li>
              <li>ProPublica Nonprofit Explorer</li>
              <li>USAspending.gov</li>
              <li>CFDA (Assistance Listings)</li>
              <li>Philanthropy News Digest</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AI Screening</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              After discovery, trigger AI eligibility screening on any grant.
              You&apos;ll get a GREEN / YELLOW / RED score plus detailed notes on
              fit, requirements, and recommendations.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
