"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

const SEARCH_STAGES = [
  { message: "Connecting to grant databases...", icon: Globe, delay: 0 },
  { message: "Searching Grants.gov, ProPublica, and federal sources...", icon: Search, delay: 3000 },
  { message: "Querying foundation directories and philanthropy feeds...", icon: Building2, delay: 7000 },
  { message: "Combining results from all sources...", icon: Sparkles, delay: 14000 },
  { message: "Removing duplicate listings...", icon: Filter, delay: 18000 },
  { message: "Classifying grants by type and relevance...", icon: Sparkles, delay: 22000 },
  { message: "Filtering based on your organization's location...", icon: MapPin, delay: 28000 },
  { message: "Ranking results by relevance to your search...", icon: Filter, delay: 34000 },
  { message: "Finalizing results — almost there...", icon: CheckCheck, delay: 42000 },
];

function useSearchStage(loading: boolean) {
  const [stageIndex, setStageIndex] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!loading) {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setStageIndex(0);
      return;
    }

    setStageIndex(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    SEARCH_STAGES.forEach((stage, i) => {
      if (i === 0) return; // already at 0
      timers.push(setTimeout(() => setStageIndex(i), stage.delay));
    });
    timersRef.current = timers;

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [loading]);

  return SEARCH_STAGES[stageIndex];
}

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

export default function DiscoveryPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoveredGrant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchComplete, setSearchComplete] = useState(false);
  const [selectedGrant, setSelectedGrant] = useState<DiscoveredGrant | null>(
    null
  );
  const [addingToPipeline, setAddingToPipeline] = useState<string | null>(null);
  const [addedGrants, setAddedGrants] = useState<Set<string>>(new Set());
  const currentStage = useSearchStage(loading);

  async function triggerDiscovery() {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    setError(null);
    setSearchComplete(false);
    setAddedGrants(new Set());

    try {
      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: "grant-discovery", searchQuery: query }),
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        result = { success: response.ok, data: text };
      }

      if (!response.ok || result.success === false) {
        setError(result.error || "Workflow failed");
        return;
      }

      // Parse grants from n8n response
      console.log("Full result from API:", JSON.stringify(result, null, 2));
      console.log("result.data:", JSON.stringify(result.data, null, 2));
      const grants = extractGrants(result.data);
      console.log("Extracted grants:", grants.length, grants);
      if (grants.length === 0) {
        setError("No grants found for your search. Try different keywords.");
      } else {
        setResults(grants);
        setSearchComplete(true);
      }
    } catch (err) {
      console.error("Discovery error:", err);
      setError("Failed to trigger discovery. Check your n8n connection.");
    } finally {
      setLoading(false);
    }
  }

  function extractGrants(data: unknown): DiscoveredGrant[] {
    if (!data) return [];

    // Handle array
    if (Array.isArray(data)) {
      // Check if this is directly an array of grant objects
      if (data.length > 0 && data[0]?.title && data[0]?.funder_name) {
        return data as DiscoveredGrant[];
      }
      // Otherwise recurse into each item and collect results
      return data.flatMap((item: unknown) => extractGrants(item));
    }

    // Handle object
    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;

      // If this object looks like a grant itself, return it
      if (obj.title && obj.funder_name) {
        return [obj as unknown as DiscoveredGrant];
      }

      // Dig into .data.grants, .grants, or .data
      if (Array.isArray(obj.grants)) {
        return extractGrants(obj.grants);
      }
      if (obj.data) {
        return extractGrants(obj.data);
      }
    }

    return [];
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

          {loading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              {(() => {
                const StageIcon = currentStage.icon;
                return (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <StageIcon className="h-4 w-4 shrink-0" />
                    <span className="animate-pulse">{currentStage.message}</span>
                  </>
                );
              })()}
            </div>
          )}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">
              Results{" "}
              <span className="text-muted-foreground font-normal">
                ({results.length} found)
              </span>
            </h2>
          </div>

          {searchComplete && (
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 px-4 py-2.5 text-sm text-green-700 dark:text-green-400">
              <CheckCheck className="h-4 w-4 shrink-0" />
              <span>
                Search complete — showing all {results.length} results from all sources.
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
