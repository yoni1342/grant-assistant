"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Loader2,
  Zap,
  Plus,
  Calendar,
  Building2,
  DollarSign,
  ExternalLink,
  CheckCircle2,
  Globe,
  Filter,
  MapPin,
  Sparkles,
  CheckCheck,
  SearchX,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const STAGE_ICONS: Record<string, typeof Globe> = {
  searching: Search,
  deduplicating: Filter,
  checking: Globe,
  filtering: MapPin,
  matching: Sparkles,
  saving: CheckCheck,
  no_results: SearchX,
};

const DEFAULT_STAGE = { message: "Connecting to grant databases...", icon: Globe };

interface DiscoveredGrant {
  org_id: string;
  title: string;
  funder_name: string;
  description: string | null;
  amount: number | null;
  deadline: string | null;
  stage: string;
  source: string | null;
  source_id: string | null;
  source_url: string | null;
  metadata: Record<string, unknown> | null;
}

function GrantDetailBody({
  grant,
  isAdded,
  isAdding,
  onAddToPipeline,
}: {
  grant: DiscoveredGrant;
  isAdded: boolean;
  isAdding: boolean;
  onAddToPipeline: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="leading-tight pr-6">{grant.title}</DialogTitle>
      </DialogHeader>

      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-4 pr-4">
          <div className="grid grid-cols-2 gap-3">
            {grant.funder_name && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Funder</p>
                <p className="text-sm font-medium">{grant.funder_name}</p>
              </div>
            )}
            {grant.amount != null && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Amount</p>
                <p className="text-sm font-medium">
                  {typeof grant.amount === "number"
                    ? `$${grant.amount.toLocaleString()}`
                    : String(grant.amount)}
                </p>
              </div>
            )}
            {grant.deadline && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Deadline</p>
                <p className="text-sm font-medium">
                  {new Date(grant.deadline).toLocaleDateString()}
                </p>
              </div>
            )}
            {grant.source && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Source</p>
                <p className="text-sm font-medium">{grant.source}</p>
              </div>
            )}
          </div>

          <Separator />

          {grant.description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm leading-relaxed">{grant.description}</p>
            </div>
          )}

          {grant.source_url && (
            <a
              href={grant.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Original Listing
            </a>
          )}

          {typeof grant.metadata?.priority === "string" && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Priority</p>
              <Badge variant="secondary">{grant.metadata.priority}</Badge>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex justify-end pt-2">
        {isAdded ? (
          <Button variant="outline" disabled>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Added to Pipeline
          </Button>
        ) : (
          <Button disabled={isAdding} onClick={onAddToPipeline}>
            {isAdding ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Add to Pipeline
          </Button>
        )}
      </div>
    </>
  );
}

const ORG_TYPES = [
  "501(c)(3) Nonprofit",
  "501(c)(4) Nonprofit",
  "Government Agency",
  "Tribal Organization",
  "Educational Institution",
  "Faith-Based Organization",
  "Community-Based Organization",
  "Other",
];

const PROFIT_STATUSES = ["Nonprofit", "For-Profit", "Either"];

const INDUSTRIES = [
  "Health & Human Services",
  "Education",
  "Arts & Culture",
  "Environment & Conservation",
  "Housing & Community Development",
  "Youth Development",
  "Workforce Development",
  "Technology & Innovation",
  "Agriculture & Food Security",
  "Public Safety",
  "Other",
];

const FUNDING_CATEGORIES = [
  "Federal Grant",
  "State Grant",
  "Foundation / Private Grant",
  "Corporate Grant",
  "Research Grant",
  "Capacity Building",
  "Capital / Equipment",
  "Program / Project",
  "General Operating Support",
  "Other",
];

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming", "District of Columbia",
  "National / All States",
];

export default function DiscoveryPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [orgType, setOrgType] = useState("");
  const [profitStatus, setProfitStatus] = useState("");
  const [industry, setIndustry] = useState("");
  const [fundingCategory, setFundingCategory] = useState("");
  const [location, setLocation] = useState("");
  const [results, setResults] = useState<DiscoveredGrant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchComplete, setSearchComplete] = useState(false);
  const [selectedGrant, setSelectedGrant] = useState<DiscoveredGrant | null>(
    null
  );
  const [addingToPipeline, setAddingToPipeline] = useState<string | null>(null);
  const [addedGrants, setAddedGrants] = useState<Set<string>>(new Set());
  const [sourceCount, setSourceCount] = useState(0);
  const [stageMessage, setStageMessage] = useState(DEFAULT_STAGE);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const seenTitlesRef = useRef<Set<string>>(new Set());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current as Parameters<typeof supabase.removeChannel>[0]);
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const extractGrants = useCallback((data: unknown): DiscoveredGrant[] => {
    if (!data) return [];

    if (Array.isArray(data)) {
      if (data.length > 0 && data[0]?.title && data[0]?.funder_name) {
        return data as DiscoveredGrant[];
      }
      return data.flatMap((item: unknown) => extractGrants(item));
    }

    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;

      if (obj.title && obj.funder_name) {
        return [obj as unknown as DiscoveredGrant];
      }

      if (Array.isArray(obj.grants)) {
        return extractGrants(obj.grants);
      }
      if (obj.data) {
        return extractGrants(obj.data);
      }
    }

    return [];
  }, []);

  async function triggerDiscovery() {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    setError(null);
    setSearchComplete(false);
    setAddedGrants(new Set());
    setSourceCount(0);
    setStageMessage(DEFAULT_STAGE);
    seenTitlesRef.current = new Set();

    // Clean up previous subscription
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current as Parameters<typeof supabase.removeChannel>[0]);
      channelRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: "grant-discovery",
          searchQuery: query,
          ...(orgType && { orgType }),
          ...(profitStatus && { profitStatus }),
          ...(industry && { industry }),
          ...(fundingCategory && { fundingCategory }),
          ...(location && { location }),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to start search");
        setLoading(false);
        return;
      }

      const searchId = data.search_id;

      // Subscribe to real-time search results
      const supabase = createClient();
      const channel = supabase
        .channel(`search-${searchId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "search_results",
            filter: `search_id=eq.${searchId}`,
          },
          (payload) => {
            const row = payload.new as {
              grant_data: unknown;
              is_complete: boolean;
              source_group: string;
            };

            if (row.is_complete) {
              setSearchComplete(true);
              // Small delay so the last status message is visible before loading hides it
              setTimeout(() => setLoading(false), 600);
              return;
            }

            // Handle status updates from workflow
            if (row.source_group?.startsWith("__status__:")) {
              const data = row.grant_data as { status?: string; stage_message?: string };
              if (data?.stage_message) {
                const icon = STAGE_ICONS[data.status || ""] || Sparkles;
                setStageMessage({ message: data.stage_message, icon });
              }
              return;
            }

            const grants = extractGrants(row.grant_data);
            if (grants.length > 0) {
              // Deduplicate by title
              const newGrants = grants.filter((g) => {
                if (seenTitlesRef.current.has(g.title)) return false;
                seenTitlesRef.current.add(g.title);
                return true;
              });

              if (newGrants.length > 0) {
                setResults((prev) => [...prev, ...newGrants]);
                setSourceCount((prev) => prev + 1);
              }
            }
          }
        )
        .subscribe();

      channelRef.current = channel;

      // Safety timeout: stop loading after 3 minutes
      timeoutRef.current = setTimeout(() => {
        setLoading(false);
        setSearchComplete(true);
        supabase.removeChannel(channel);
        channelRef.current = null;
      }, 180000);
    } catch (err) {
      console.error("Discovery error:", err);
      setError("Failed to trigger discovery. Check your n8n connection.");
      setLoading(false);
    }
  }

  async function addToPipeline(grant: DiscoveredGrant) {
    const grantKey = grant.title;
    setAddingToPipeline(grantKey);

    try {
      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: "grant-screening", ...grant }),
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        result = { success: response.ok };
      }

      if (!response.ok || result.success === false) {
        toast.error("Failed to add grant to pipeline", {
          description: result.error || "Something went wrong",
        });
      } else {
        setAddedGrants((prev) => new Set(prev).add(grantKey));
        const msg = result.data?.message || result.message || "Grant added to pipeline successfully";
        toast.success(msg);
      }
    } catch {
      toast.error("Failed to add grant to pipeline", {
        description: "Check your connection and try again",
      });
    } finally {
      setAddingToPipeline(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">Grant Discovery</h1>
        <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
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
            <Button
              variant="outline"
              onClick={() => setShowFilters((v) => !v)}
              className="shrink-0"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {(orgType || profitStatus || industry || fundingCategory || location) && (
                <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                  {[orgType, profitStatus, industry, fundingCategory, location].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            <Button
              onClick={triggerDiscovery}
              disabled={loading || !query.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-1" />
              )}
              Discover
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Location</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Any</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Organization Type</label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Any</option>
                  {ORG_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nonprofit / For-Profit</label>
                <select
                  value={profitStatus}
                  onChange={(e) => setProfitStatus(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Any</option>
                  {PROFIT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Any</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Funding Category</label>
                <select
                  value={fundingCategory}
                  onChange={(e) => setFundingCategory(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Any</option>
                  {FUNDING_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {loading && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {(() => {
                  const StageIcon = stageMessage.icon;
                  return (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <StageIcon className="h-4 w-4 shrink-0" />
                      <span className="animate-pulse">{stageMessage.message}</span>
                    </>
                  );
                })()}
              </div>
              {results.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {results.length} grant{results.length !== 1 ? "s" : ""} found so far from {sourceCount} source{sourceCount !== 1 ? "s" : ""} — searching remaining sources
                </p>
              )}
            </div>
          )}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* No results message */}
      {searchComplete && !loading && results.length === 0 && (
        <div className="flex items-center gap-2 rounded-md border border-muted px-4 py-3 text-sm text-muted-foreground">
          <SearchX className="h-4 w-4 shrink-0" />
          <span>{stageMessage.message !== DEFAULT_STAGE.message ? stageMessage.message : "No grants found matching your search. Try broadening your query."}</span>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">
              Results{" "}
              <span className="text-muted-foreground font-normal">
                ({results.length} found{loading ? " so far" : ""})
              </span>
            </h2>
          </div>

          {searchComplete && !loading && (
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 px-4 py-2.5 text-sm text-green-700 dark:text-green-400">
              <CheckCheck className="h-4 w-4 shrink-0" />
              <span>
                Search complete — showing {results.length} results. Additional sources are still being reviewed and may yield more matches.
              </span>
            </div>
          )}

          <div className="grid gap-3">
            {results.map((grant, index) => {
              const grantKey = grant.title;
              const isAdded = addedGrants.has(grantKey);
              const isAdding = addingToPipeline === grantKey;

              return (
                <Card
                  key={index}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => setSelectedGrant(grant)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <h3 className="font-medium leading-tight">
                          {grant.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {grant.funder_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              {grant.funder_name}
                            </span>
                          )}
                          {grant.amount && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5" />
                              {typeof grant.amount === "number"
                                ? `$${grant.amount.toLocaleString()}`
                                : grant.amount}
                            </span>
                          )}
                          {grant.deadline && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(grant.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {grant.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {grant.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 pt-0.5">
                          {grant.source && (
                            <Badge variant="outline" className="text-xs">
                              {grant.source}
                            </Badge>
                          )}
                          {typeof grant.metadata?.priority === "string" && (
                            <Badge variant="secondary" className="text-xs">
                              {grant.metadata.priority}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isAdded ? "outline" : "default"}
                        disabled={isAdding || isAdded}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToPipeline(grant);
                        }}
                        className="shrink-0"
                      >
                        {isAdding ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : isAdded ? (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        ) : (
                          <Plus className="h-4 w-4 mr-1" />
                        )}
                        {isAdded ? "Added" : "Add to Pipeline"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}


      {/* Grant Detail Dialog */}
      <Dialog
        open={selectedGrant !== null}
        onOpenChange={(open) => !open && setSelectedGrant(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh]">
          {selectedGrant && (
            <GrantDetailBody
              grant={selectedGrant}
              isAdded={addedGrants.has(selectedGrant.title)}
              isAdding={addingToPipeline === selectedGrant.title}
              onAddToPipeline={() => addToPipeline(selectedGrant)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
