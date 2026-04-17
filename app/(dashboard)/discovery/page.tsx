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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  ArrowUpRight,
  Lock,
  AlertTriangle,
  Eye,
  EyeOff,
  X,
  ChevronDown,
  Clock,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getPipelineGrantTitles } from "./actions";
import { isMissingGrantValue } from "@/lib/grants/filters";

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
  atLimit,
  onAddToPipeline,
}: {
  grant: DiscoveredGrant;
  isAdded: boolean;
  isAdding: boolean;
  atLimit: boolean;
  onAddToPipeline: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="leading-tight pr-6">{grant.title}</DialogTitle>
      </DialogHeader>

      <ScrollArea className="max-h-[75vh] sm:max-h-[60vh]">
        <div className="space-y-4 pr-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Funder</p>
              <p className={`text-sm font-medium ${isMissingGrantValue(grant.funder_name) ? "text-muted-foreground italic" : ""}`}>
                {isMissingGrantValue(grant.funder_name) ? "No funder mentioned" : grant.funder_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Amount</p>
              {grant.amount != null && !isMissingGrantValue(grant.amount) ? (
                <p className="text-sm font-medium">
                  {typeof grant.amount === "number"
                    ? `$${grant.amount.toLocaleString()}`
                    : String(grant.amount)}
                </p>
              ) : (
                <p className="text-sm font-medium text-muted-foreground italic">No amount mentioned</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Deadline</p>
              {grant.deadline && !isMissingGrantValue(grant.deadline) ? (
                <p className={`text-sm font-medium flex items-center gap-1.5 ${isGrantExpired(grant.deadline) ? "text-red-500" : ""}`}>
                  {isGrantExpired(grant.deadline) && <AlertTriangle className="h-3.5 w-3.5" />}
                  {isNaN(new Date(grant.deadline).getTime()) ? grant.deadline : new Date(grant.deadline).toLocaleDateString()}
                  {isGrantExpired(grant.deadline) && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      Expired
                    </Badge>
                  )}
                </p>
              ) : (
                <p className="text-sm font-medium text-muted-foreground italic">No deadline mentioned</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Source</p>
              <p className={`text-sm font-medium ${isMissingGrantValue(grant.source) ? "text-muted-foreground italic" : ""}`}>
                {isMissingGrantValue(grant.source) ? "No source mentioned" : formatSource(grant.source)}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            {isMissingGrantValue(grant.description) ? (
              <p className="text-sm leading-relaxed text-muted-foreground italic">No description mentioned</p>
            ) : (
              <p className="text-sm leading-relaxed">{grant.description}</p>
            )}
          </div>

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
        ) : atLimit ? (
          <a href="/billing">
            <Button className="gap-1">
              <ArrowUpRight className="h-4 w-4" />
              Upgrade to Add More Grants
            </Button>
          </a>
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

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  searchable = false,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  searchable?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = searchable && search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((s) => s !== option)
        : [...selected, option]
    );
  };

  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <Popover onOpenChange={() => setSearch("")}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-left flex items-center justify-between gap-1 min-w-0"
          >
            <span className="truncate min-w-0 text-muted-foreground">
              {selected.length === 0
                ? "Any"
                : `${selected.length} selected`}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-52 max-w-80 p-0 overflow-hidden"
          align="start"
        >
          {searchable && (
            <div className="p-2 border-b">
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          )}
          <div className="max-h-56 overflow-y-auto overscroll-contain p-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">No matches</p>
            ) : (
              filtered.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer text-sm select-none"
                >
                  <Checkbox
                    checked={selected.includes(option)}
                    onCheckedChange={() => toggle(option)}
                    className="shrink-0"
                  />
                  <span className="truncate">{option}</span>
                </label>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <div className="border-t p-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-7"
                onClick={() => onChange([])}
              >
                Clear all
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-0.5 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground"
            >
              <span className="truncate max-w-[120px]">{item}</span>
              <button
                type="button"
                onClick={() => onChange(selected.filter((s) => s !== item))}
                className="shrink-0 rounded-sm hover:bg-secondary-foreground/20 p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function formatSource(source: string | null | undefined): string {
  if (!source) return "";
  const trimmed = source.trim();
  let url: string | null = null;
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed.url === "string") url = parsed.url;
    } catch {}
  } else if (/^https?:\/\//i.test(trimmed)) {
    url = trimmed;
  }
  if (url) {
    try {
      return new URL(url).hostname.replace(/^www\./i, "");
    } catch {}
  }
  return trimmed;
}

function isGrantExpired(deadline: string | null): boolean {
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return deadlineDate < now;
}

interface GrantUsage {
  used: number;
  limit: number | null;
  plan: string;
}

interface SearchSession {
  id: string;
  query: string;
  results: DiscoveredGrant[];
  loading: boolean;
  searchComplete: boolean;
  stageMessage: { message: string; icon: typeof Globe };
  sourceCount: number;
  error: string | null;
}

interface SessionRefs {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  channel: any;
  poll: ReturnType<typeof setInterval> | null;
  seenTitles: Set<string>;
  seenRowIds: Set<string>;
}

export default function DiscoveryPage() {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [orgType, setOrgType] = useState<string[]>([]);
  const [profitStatus, setProfitStatus] = useState<string[]>([]);
  const [industry, setIndustry] = useState<string[]>([]);
  const [fundingCategory, setFundingCategory] = useState<string[]>([]);
  const [location, setLocation] = useState<string[]>([]);
  const [hideExpired, setHideExpired] = useState(true);
  const [selectedGrant, setSelectedGrant] = useState<DiscoveredGrant | null>(
    null
  );
  const [addingToPipeline, setAddingToPipeline] = useState<string | null>(null);
  const [addedGrants, setAddedGrants] = useState<Set<string>>(new Set());
  const [grantUsage, setGrantUsage] = useState<GrantUsage | null>(null);

  // Concurrent search sessions
  const [sessions, setSessions] = useState<SearchSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const sessionRefsMap = useRef<Map<string, SessionRefs>>(new Map());

  // Derived: active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const results = activeSession?.results ?? [];
  const loading = activeSession?.loading ?? false;
  const searchComplete = activeSession?.searchComplete ?? false;
  const stageMessage = activeSession?.stageMessage ?? DEFAULT_STAGE;
  const error = activeSession?.error ?? null;

  // Helper: update a specific session
  function updateSession(sessionId: string, updates: Partial<SearchSession>) {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, ...updates } : s))
    );
  }

  // Helper: append results to a specific session
  function appendResults(sessionId: string, newGrants: DiscoveredGrant[]) {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, results: [...s.results, ...newGrants], sourceCount: s.sourceCount + 1 }
          : s
      )
    );
  }

  // Helper: cleanup a session's subscriptions
  function cleanupSessionRefs(sessionId: string) {
    const refs = sessionRefsMap.current.get(sessionId);
    if (!refs) return;
    if (refs.channel) {
      const supabase = createClient();
      supabase.removeChannel(refs.channel as Parameters<typeof supabase.removeChannel>[0]);
    }
    if (refs.poll) clearInterval(refs.poll);
    sessionRefsMap.current.delete(sessionId);
  }

  // Helper: close a session tab
  function closeSession(sessionId: string) {
    cleanupSessionRefs(sessionId);
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== sessionId);
      if (activeSessionId === sessionId && remaining.length > 0) {
        setActiveSessionId(remaining[remaining.length - 1].id);
      } else if (remaining.length === 0) {
        setActiveSessionId(null);
      }
      return remaining;
    });
  }

  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<{ id: string; query: string; search_id?: string }[]>([]);
  const [deleteSearchConfirm, setDeleteSearchConfirm] = useState<{ id: string; query: string } | null>(null);

  // Resolve org-specific storage key
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.org_id) {
            setStorageKey(`fundory_discovery_${data.org_id}`);
          }
        });
    });
  }, []);

  // Load recent searches from database
  useEffect(() => {
    fetch("/api/search-history")
      .then((r) => r.ok ? r.json() : [])
      .then((data: { id: string; query: string; search_id?: string }[]) => setRecentSearches(data))
      .catch(() => {});
  }, []);

  function saveRecentSearch(q: string, searchId?: string) {
    if (!q.trim()) return;
    setRecentSearches((prev) => [
      { id: "temp-" + Date.now(), query: q.trim(), search_id: searchId },
      ...prev.filter((s) => s.query !== q.trim()),
    ].slice(0, 8));
    fetch("/api/search-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q.trim(), search_id: searchId }),
    }).catch(() => {});
  }

  async function loadCachedResults(searchId: string) {
    try {
      const res = await fetch(`/api/grants/search-results?search_id=${searchId}`);
      if (!res.ok) return null;
      const rows = await res.json() as { grant_data: unknown; is_complete: boolean; source_group: string }[];
      const grants: DiscoveredGrant[] = [];
      const seen = new Set<string>();
      for (const row of rows) {
        if (row.is_complete || row.source_group?.startsWith("__status__")) continue;
        const extracted = extractGrants(row.grant_data);
        for (const g of extracted) {
          if (!seen.has(g.title)) {
            seen.add(g.title);
            grants.push(g);
          }
        }
      }
      return grants.length > 0 ? grants : null;
    } catch {
      return null;
    }
  }

  function removeRecentSearch(id: string) {
    setRecentSearches((prev) => prev.filter((s) => s.id !== id));
    fetch("/api/search-history", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  // Restore state from sessionStorage on mount (once storageKey is resolved)
  const hasRestored = useRef(false);
  useEffect(() => {
    if (hasRestored.current || !storageKey) return;
    hasRestored.current = true;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (!saved) return;
      const s = JSON.parse(saved);
      if (s.query) setQuery(s.query);
      if (s.orgType) setOrgType(s.orgType);
      if (s.profitStatus) setProfitStatus(s.profitStatus);
      if (s.industry) setIndustry(s.industry);
      if (s.fundingCategory) setFundingCategory(s.fundingCategory);
      if (s.location) setLocation(s.location);
      // Restore all sessions if available, otherwise fall back to single-session legacy format
      if (s.sessions?.length) {
        const restoredSessions: SearchSession[] = s.sessions.map((ss: { id: string; query: string; results: DiscoveredGrant[] }) => ({
          id: ss.id,
          query: ss.query,
          results: ss.results,
          loading: false,
          searchComplete: true,
          stageMessage: DEFAULT_STAGE,
          sourceCount: 0,
          error: null,
        }));
        setSessions(restoredSessions);
        setActiveSessionId(s.activeSessionId || restoredSessions[restoredSessions.length - 1].id);
      } else if (s.results?.length) {
        const restoredId = "restored-" + Date.now();
        const restoredSession: SearchSession = {
          id: restoredId,
          query: s.query || "",
          results: s.results,
          loading: false,
          searchComplete: true,
          stageMessage: DEFAULT_STAGE,
          sourceCount: 0,
          error: null,
        };
        setSessions([restoredSession]);
        setActiveSessionId(restoredId);
      }
      if (s.addedGrants?.length) setAddedGrants(new Set(s.addedGrants));
    } catch {
      // corrupted storage — ignore
    }
  }, [storageKey]);

  // Save state to sessionStorage on changes
  useEffect(() => {
    if (!hasRestored.current || !storageKey) return;
    try {
      // Persist all sessions (id, query, results) so they survive navigation
      const sessionsToSave = sessions
        .filter((s) => s.results.length > 0)
        .map((s) => ({ id: s.id, query: s.query, results: s.results }));
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          query: activeSession?.query || query,
          orgType,
          profitStatus,
          industry,
          fundingCategory,
          location,
          sessions: sessionsToSave,
          activeSessionId,
          addedGrants: Array.from(addedGrants),
        })
      );
    } catch {
      // storage full — ignore
    }
  }, [storageKey, query, activeSession, activeSessionId, sessions, orgType, profitStatus, industry, fundingCategory, location, addedGrants]);

  const atLimit = grantUsage !== null && grantUsage.limit !== null && grantUsage.used >= grantUsage.limit;

  const expiredCount = results.filter((g) => isGrantExpired(g.deadline)).length;
  const visibleResults = hideExpired
    ? results.filter((g) => !isGrantExpired(g.deadline))
    : results;

  // Fetch grant usage on mount
  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch("/api/grants/usage");
        if (res.ok) {
          const data = await res.json();
          setGrantUsage(data);
        }
      } catch {
        // silent — usage indicator just won't show
      }
    }
    fetchUsage();
  }, []);

  // Fetch pipeline grant titles on mount to mark already-added grants
  useEffect(() => {
    getPipelineGrantTitles().then((titles) => {
      if (titles.length > 0) {
        setAddedGrants((prev) => {
          const next = new Set(prev);
          for (const t of titles) next.add(t);
          return next;
        });
      }
    }).catch(() => {});
  }, []);

  // Cleanup all sessions on unmount
  useEffect(() => {
    const refsMap = sessionRefsMap.current;
    return () => {
      const supabase = createClient();
      for (const [, refs] of refsMap) {
        if (refs.channel) {
          supabase.removeChannel(refs.channel as Parameters<typeof supabase.removeChannel>[0]);
        }
        if (refs.poll) clearInterval(refs.poll);
      }
      refsMap.clear();
    };
  }, []);

  const extractGrants = useCallback((data: unknown): DiscoveredGrant[] => {
    if (!data) return [];

    // Normalise source-specific field names to DiscoveredGrant schema
    const normalise = (obj: Record<string, unknown>) => {
      if (!obj.funder_name && obj.agency) obj.funder_name = obj.agency;
      if (!obj.source_url && obj.link) obj.source_url = obj.link;
      if (!obj.source_id && obj.id) obj.source_id = String(obj.id);
      if (!obj.deadline && obj.closeDate) obj.deadline = obj.closeDate;
      if (obj.amount == null && obj.awardCeiling && Number(obj.awardCeiling) > 0) obj.amount = Number(obj.awardCeiling);
      if (!obj.source_id && obj.oppNum) obj.source_id = String(obj.oppNum);
      return obj as unknown as DiscoveredGrant;
    };

    if (Array.isArray(data)) {
      if (data.length > 0 && data[0]?.title && (data[0]?.funder_name || (data[0] as Record<string, unknown>)?.agency)) {
        return data.map((item: unknown) => normalise(item as Record<string, unknown>));
      }
      return data.flatMap((item: unknown) => extractGrants(item));
    }

    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;

      if (obj.title && (obj.funder_name || obj.agency)) {
        return [normalise(obj)];
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

  // Start a new search and subscribe to results
  function startSearchSession(sessionId: string) {
    const supabase = createClient();

    // Create refs for this session
    const refs: SessionRefs = {
      channel: null,
      poll: null,
      seenTitles: new Set(),
      seenRowIds: new Set(),
    };
    sessionRefsMap.current.set(sessionId, refs);

    // Helper: process a row from search_results
    const processRow = (row: { grant_data: unknown; is_complete: boolean; source_group: string }) => {
      if (row.is_complete) {
        updateSession(sessionId, {
          searchComplete: true,
          loading: false,
          stageMessage: DEFAULT_STAGE,
        });
        const r = sessionRefsMap.current.get(sessionId);
        if (r?.poll) {
          clearInterval(r.poll);
          r.poll = null;
        }
        return;
      }

      if (row.source_group?.startsWith("__status__:")) {
        const d = row.grant_data as { status?: string; stage_message?: string };
        if (d?.stage_message) {
          const icon = STAGE_ICONS[d.status || ""] || Sparkles;
          updateSession(sessionId, { stageMessage: { message: d.stage_message, icon } });
        }
        return;
      }

      const grants = extractGrants(row.grant_data);
      if (grants.length > 0) {
        const newGrants = grants.filter((g) => {
          if (refs.seenTitles.has(g.title)) return false;
          refs.seenTitles.add(g.title);
          return true;
        });

        if (newGrants.length > 0) {
          appendResults(sessionId, newGrants);
        }
      }
    };

    // Subscribe to real-time search results
    const channel = supabase
      .channel(`search-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "search_results",
          filter: `search_id=eq.${sessionId}`,
        },
        (payload) => {
          processRow(payload.new as { grant_data: unknown; is_complete: boolean; source_group: string });
        }
      )
      .subscribe();

    refs.channel = channel;

    // Polling fallback: fetch search_results via server API every 2s
    const pollForResults = async () => {
      try {
        const res = await fetch(`/api/grants/search-results?search_id=${sessionId}`);
        if (!res.ok) return;
        const rows = await res.json() as { id: string; grant_data: unknown; is_complete: boolean; source_group: string }[];

        for (const row of rows) {
          if (refs.seenRowIds.has(row.id)) continue;
          refs.seenRowIds.add(row.id);
          processRow(row);
        }
      } catch {
        // silent — will retry on next poll
      }
    };

    pollForResults();
    refs.poll = setInterval(pollForResults, 2000);
  }

  async function triggerDiscovery() {
    if (!query.trim()) return;
    saveRecentSearch(query);

    // Create a temporary session ID, will be replaced with real searchId
    const tempId = "pending-" + Date.now();
    const newSession: SearchSession = {
      id: tempId,
      query: query.trim(),
      results: [],
      loading: true,
      searchComplete: false,
      stageMessage: DEFAULT_STAGE,
      sourceCount: 0,
      error: null,
    };

    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(tempId);

    try {
      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: "grant-discovery",
          searchQuery: query,
          ...(orgType.length > 0 && { orgType: orgType.join(", ") }),
          ...(profitStatus.length > 0 && { profitStatus: profitStatus.join(", ") }),
          ...(industry.length > 0 && { industry: industry.join(", ") }),
          ...(fundingCategory.length > 0 && { fundingCategory: fundingCategory.join(", ") }),
          ...(location.length > 0 && { location: location.join(", ") }),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        updateSession(tempId, {
          error: data.error || "Failed to start search",
          loading: false,
        });
        return;
      }

      const searchId = data.search_id;

      // Update the recent search entry with the search_id
      if (searchId) {
        setRecentSearches((prev) =>
          prev.map((s) => s.query === query.trim() ? { ...s, search_id: searchId } : s)
        );
        fetch("/api/search-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim(), search_id: searchId }),
        }).catch(() => {});
      }

      // Replace temp ID with real search ID
      setSessions((prev) =>
        prev.map((s) => (s.id === tempId ? { ...s, id: searchId } : s))
      );
      setActiveSessionId(searchId);

      // Start listening for results
      startSearchSession(searchId);

    } catch (err) {
      console.error("Discovery error:", err);
      updateSession(tempId, {
        error: "Failed to trigger discovery. Check your n8n connection.",
        loading: false,
      });
    }
  }

  async function refreshUsage() {
    try {
      const res = await fetch("/api/grants/usage");
      if (res.ok) setGrantUsage(await res.json());
    } catch { /* silent */ }
  }

  async function addToPipeline(grant: DiscoveredGrant) {
    if (atLimit) {
      toast.error("Daily grant limit reached", {
        description: "Upgrade to Professional for unlimited grants.",
      });
      return;
    }

    if (!grant.title?.trim()) {
      toast.error("Cannot add grant", {
        description: "This grant has no title and cannot be added to the pipeline.",
      });
      return;
    }

    const grantKey = grant.title;
    setAddingToPipeline(grantKey);

    try {
      // Only send fields that exist in the grants table — raw discovery
      // results carry extra source fields (agency, agencyCode, oppNum, etc.)
      // that would cause a Supabase insert error (PGRST204).
      const raw = grant as unknown as Record<string, unknown>;

      // Parse deadline: source may use closeDate, openDate, or deadline.
      // Values like "See listing" are not valid dates — treat as null.
      const rawDeadline = grant.deadline || raw.closeDate || raw.openDate;
      const parsedDeadline = rawDeadline && !isNaN(new Date(String(rawDeadline)).getTime())
        ? String(rawDeadline)
        : null;

      // Reject grants whose deadline has already passed
      if (parsedDeadline && new Date(parsedDeadline) < new Date()) {
        toast.error("Grant has expired", {
          description: "This grant's deadline has already passed and cannot be added to the pipeline.",
        });
        setAddingToPipeline(null);
        return;
      }

      // Amount may come as amount, awardCeiling, or awardFloor — take first non-zero value
      const rawAmount = grant.amount
        || (raw.awardCeiling && Number(raw.awardCeiling) > 0 ? Number(raw.awardCeiling) : null)
        || (raw.awardFloor && Number(raw.awardFloor) > 0 ? Number(raw.awardFloor) : null)
        || null;

      const grantPayload = {
        title: grant.title,
        funder_name: grant.funder_name || (raw.agency as string) || null,
        description: grant.description || null,
        amount: rawAmount,
        deadline: parsedDeadline,
        stage: "discovery",
        source: grant.source || null,
        source_id: grant.source_id || null,
        source_url: grant.source_url || null,
        metadata: grant.metadata || null,
      };

      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: "grant-screening", ...grantPayload }),
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        result = { success: response.ok };
      }

      if (!response.ok || result.success === false) {
        if (result.code === "GRANT_LIMIT_REACHED") {
          toast.error("Monthly grant limit reached", {
            description: "Upgrade to Professional for unlimited grants.",
          });
          await refreshUsage();
        } else {
          toast.error("Failed to add grant to pipeline", {
            description: result.error || "Something went wrong",
          });
        }
      } else {
        setAddedGrants((prev) => new Set(prev).add(grantKey));
        const msg = result.data?.message || result.message || "Grant added to pipeline successfully";
        toast.success(msg);
        await refreshUsage();
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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">Grant Discovery</h1>
        <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
          Search for grant opportunities across Grants.gov, ProPublica,
          USAspending, CFDA, and Philanthropy News Digest
        </p>
      </div>

      {/* Search */}
      <Card data-tour="discovery-search">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for grants..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && triggerDiscovery()}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button
                variant="outline"
                data-tour="discovery-filters"
                onClick={() => setShowFilters((v) => !v)}
                className="shrink-0 flex-1 sm:flex-none"
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {[...orgType, ...profitStatus, ...industry, ...fundingCategory, ...location].length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                    {orgType.length + profitStatus.length + industry.length + fundingCategory.length + location.length}
                  </Badge>
                )}
              </Button>
              <Button
                data-tour="discovery-discover-btn"
                onClick={triggerDiscovery}
                disabled={!query.trim()}
                className="shrink-0 flex-1 sm:flex-none"
              >
                <Zap className="h-4 w-4 mr-1" />
                Discover
              </Button>
            </div>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div data-tour="discovery-recent" className="flex items-center gap-2 mt-3 flex-wrap">
              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Recent:</span>
              {recentSearches.map((s) => (
                <button
                  key={s.id}
                  className="group inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  onClick={async () => {
                    setQuery(s.query);
                    // Check if there's already a session for this query
                    const existing = sessions.find((sess) => sess.query === s.query);
                    if (existing) {
                      setActiveSessionId(existing.id);
                      return;
                    }
                    if (s.search_id) {
                      const cachedSessionId = "cached-" + s.search_id;
                      const cachedSession: SearchSession = {
                        id: cachedSessionId,
                        query: s.query,
                        results: [],
                        loading: true,
                        searchComplete: false,
                        stageMessage: { message: "Loading previous results...", icon: Globe },
                        sourceCount: 0,
                        error: null,
                      };
                      setSessions((prev) => [...prev, cachedSession]);
                      setActiveSessionId(cachedSessionId);
                      const cached = await loadCachedResults(s.search_id);
                      if (cached) {
                        updateSession(cachedSessionId, {
                          results: cached,
                          searchComplete: true,
                          loading: false,
                          stageMessage: DEFAULT_STAGE,
                        });
                      } else {
                        updateSession(cachedSessionId, {
                          loading: false,
                          searchComplete: true,
                          stageMessage: DEFAULT_STAGE,
                        });
                      }
                    }
                  }}
                >
                  {s.query}
                  <X
                    className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteSearchConfirm({ id: s.id, query: s.query });
                    }}
                  />
                </button>
              ))}
            </div>
          )}

          {showFilters && (
            <div className="space-y-3 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <MultiSelect label="Location" options={US_STATES} selected={location} onChange={setLocation} searchable />
                <MultiSelect label="Organization Type" options={ORG_TYPES} selected={orgType} onChange={setOrgType} />
                <MultiSelect label="Nonprofit / For-Profit" options={PROFIT_STATUSES} selected={profitStatus} onChange={setProfitStatus} />
                <MultiSelect label="Industry" options={INDUSTRIES} selected={industry} onChange={setIndustry} />
                <MultiSelect label="Funding Category" options={FUNDING_CATEGORIES} selected={fundingCategory} onChange={setFundingCategory} />
              </div>
              {(orgType.length + profitStatus.length + industry.length + fundingCategory.length + location.length) > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 gap-1 text-muted-foreground"
                    onClick={() => {
                      setOrgType([]);
                      setProfitStatus([]);
                      setIndustry([]);
                      setFundingCategory([]);
                      setLocation([]);
                    }}
                  >
                    <X className="h-3 w-3" />
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Search Session Tabs */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={`group inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                session.id === activeSessionId
                  ? "border-foreground/20 bg-foreground/[0.06] text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
              }`}
            >
              {session.loading ? (
                <Loader2 className="h-3 w-3 animate-spin shrink-0" />
              ) : session.searchComplete && session.results.length > 0 ? (
                <CheckCheck className="h-3 w-3 text-green-500 shrink-0" />
              ) : session.error ? (
                <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
              ) : (
                <Search className="h-3 w-3 shrink-0" />
              )}
              <span className="max-w-[150px] truncate">{session.query}</span>
              {session.results.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-[1.25rem] justify-center">
                  {session.results.length}
                </Badge>
              )}
              <X
                className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  closeSession(session.id);
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Active session status */}
      {activeSession && loading && !searchComplete && (
        <div className="space-y-2">
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
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Grant Usage Indicator (free tier) */}
      {grantUsage && grantUsage.limit !== null && (
        <div className={`rounded-lg border-2 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          atLimit
            ? "border-red-500 bg-red-500/10"
            : grantUsage.used >= grantUsage.limit - 1
              ? "border-amber-500 bg-amber-500/10"
              : "border-muted bg-muted/30"
        }`}>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {Array.from({ length: grantUsage.limit }, (_, i) => (
                <div
                  key={i}
                  className={`h-2.5 w-6 rounded-full ${
                    i < grantUsage.used
                      ? atLimit ? "bg-red-500" : "bg-primary"
                      : "bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
            <span className={`text-sm font-medium ${atLimit ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
              {grantUsage.used}/{grantUsage.limit} grant{grantUsage.limit === 1 ? "" : "s"} used today
            </span>
          </div>
          {atLimit ? (
            <a href="/billing">
              <Button size="sm" className="gap-1">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Upgrade to Professional
              </Button>
            </a>
          ) : grantUsage.used >= grantUsage.limit - 1 ? (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              {grantUsage.limit - grantUsage.used} grant{grantUsage.limit - grantUsage.used === 1 ? "" : "s"} remaining
            </span>
          ) : null}
        </div>
      )}

      {/* No results message */}
      {searchComplete && !loading && results.length === 0 && (
        <div className="flex items-center gap-2 rounded-md border border-muted px-4 py-3 text-sm text-muted-foreground">
          <SearchX className="h-4 w-4 shrink-0" />
          <span>{stageMessage.message !== DEFAULT_STAGE.message ? stageMessage.message : "No grants found matching your search. Try broadening your query."}</span>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">
              Results{" "}
              <span className="text-muted-foreground font-normal">
                ({visibleResults.length} found{loading ? " so far" : ""}
                {expiredCount > 0 && hideExpired
                  ? `, ${expiredCount} expired hidden`
                  : ""}
                ){loading ? " — searching remaining sources" : ""}
              </span>
            </h2>
            {expiredCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHideExpired((v) => !v)}
                className="text-xs gap-1.5"
              >
                {hideExpired ? (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    Show {expiredCount} Expired
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    Hide Expired
                  </>
                )}
              </Button>
            )}
          </div>

          {!searchComplete && results.length > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
              <Sparkles className="h-4 w-4 shrink-0 animate-pulse" />
              <span>
                Showing {visibleResults.length} result{visibleResults.length === 1 ? "" : "s"} so far. Additional sources are still being reviewed and may yield more matches.
              </span>
            </div>
          )}

          {searchComplete && !loading && results.length > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 px-4 py-2.5 text-sm font-medium text-green-700 dark:text-green-400">
              <CheckCheck className="h-4 w-4 shrink-0" />
              <span>
                Found {visibleResults.length} grant{visibleResults.length === 1 ? "" : "s"} matching your search.
              </span>
            </div>
          )}

          <div className="grid gap-3 min-w-0">
            {visibleResults.map((grant, index) => {
              const grantKey = grant.title;
              const isAdded = addedGrants.has(grantKey);
              const isAdding = addingToPipeline === grantKey;

              return (
                <Card
                  key={index}
                  className="cursor-pointer transition-shadow hover:shadow-md overflow-hidden"
                  onClick={() => setSelectedGrant(grant)}
                >
                  <CardContent className="p-4 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0 space-y-1.5 break-words">
                        <h3 className="font-medium leading-tight">
                          {grant.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
                          <span className={`flex items-center gap-1 ${isMissingGrantValue(grant.funder_name) ? "italic" : ""}`}>
                            <Building2 className="h-3.5 w-3.5" />
                            {isMissingGrantValue(grant.funder_name) ? "No funder mentioned" : grant.funder_name}
                          </span>
                          {grant.amount != null && !isMissingGrantValue(grant.amount) ? (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5" />
                              {typeof grant.amount === "number"
                                ? `$${grant.amount.toLocaleString()}`
                                : grant.amount}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 italic">
                              <DollarSign className="h-3.5 w-3.5" />
                              No amount mentioned
                            </span>
                          )}
                          {grant.deadline && !isMissingGrantValue(grant.deadline) ? (
                            <span className={`flex items-center gap-1 ${isGrantExpired(grant.deadline) ? "text-red-500" : ""}`}>
                              {isGrantExpired(grant.deadline) ? (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              ) : (
                                <Calendar className="h-3.5 w-3.5" />
                              )}
                              {isNaN(new Date(grant.deadline).getTime())
                                ? grant.deadline
                                : new Date(grant.deadline).toLocaleDateString()}
                              {isGrantExpired(grant.deadline) && (
                                <Badge variant="destructive" className="text-[10px] px-1 py-0 leading-tight">
                                  Expired
                                </Badge>
                              )}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 italic">
                              <Calendar className="h-3.5 w-3.5" />
                              No deadline mentioned
                            </span>
                          )}
                        </div>
                        {!isMissingGrantValue(grant.description) && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {grant.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 pt-0.5">
                          {grant.source && (
                            <Badge variant="outline" className="text-xs">
                              {formatSource(grant.source)}
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
                        variant={isAdded ? "outline" : atLimit && !isAdded ? "outline" : "default"}
                        disabled={isAdding || isAdded || atLimit}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToPipeline(grant);
                        }}
                        className="shrink-0 w-full sm:w-auto"
                      >
                        {isAdding ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : isAdded ? (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        ) : atLimit ? (
                          <Lock className="h-4 w-4 mr-1" />
                        ) : (
                          <Plus className="h-4 w-4 mr-1" />
                        )}
                        {isAdded ? "Added" : atLimit ? "Limit Reached" : "Add to Pipeline"}
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
              atLimit={atLimit}
              onAddToPipeline={() => addToPipeline(selectedGrant)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete search history confirmation */}
      <AlertDialog open={!!deleteSearchConfirm} onOpenChange={(open) => !open && setDeleteSearchConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Search</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &ldquo;{deleteSearchConfirm?.query}&rdquo; from your search history? Its cached results will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteSearchConfirm) {
                  removeRecentSearch(deleteSearchConfirm.id);
                  setDeleteSearchConfirm(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
