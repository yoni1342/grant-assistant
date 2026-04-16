"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { KanbanView } from "./kanban-view";
import { ListView } from "./list-view";
import { AddGrantDialog } from "./add-grant-dialog";
import { triggerStageWorkflow } from "./actions";
import { Search, Plus, LayoutGrid, List, Loader2, Lightbulb } from "lucide-react";
import { toast } from "sonner";

type Grant = Tables<"grants">;

const STAGES = [
  "discovery",
  "screening",
  "pending_approval",
  "drafting",
  // "submission",
  // "awarded",
  // "reporting",
  "closed",
] as const;

export function PipelineClient({
  initialGrants,
  orgId,
  isFetchingGrants = false,
  proposalQualityMap = {},
}: {
  initialGrants: Grant[];
  orgId: string;
  isFetchingGrants?: boolean;
  proposalQualityMap?: Record<string, number>;
}) {
  const [grants, setGrants] = useState<Grant[]>(initialGrants);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [checkingLimit, setCheckingLimit] = useState(false);
  const [confirmGrant, setConfirmGrant] = useState<Grant | null>(null);
  const [orgName, setOrgName] = useState<string>("");

  // Fetch org name for confirmation dialog
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single()
        .then(({ data: profile }) => {
          if (!profile?.org_id) return;
          supabase
            .from("organizations")
            .select("name")
            .eq("id", profile.org_id)
            .single()
            .then(({ data: org }) => {
              if (org?.name) setOrgName(org.name);
            });
        });
    });
  }, []);

  // Realtime subscription + polling fallback
  useEffect(() => {
    const supabase = createClient();

    async function fetchGrants() {
      const { data } = await supabase
        .from("grants")
        .select("*")
        .eq("org_id", orgId)
        .neq("stage", "archived")
        .order("created_at", { ascending: false });
      if (data) setGrants(data as Grant[]);
    }

    // Poll every 15 seconds for reliable updates
    const interval = setInterval(fetchGrants, 15_000);

    const channel = supabase
      .channel("grants-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grants" },
        () => {
          fetchGrants();
        }
      )
      .subscribe();

    // Listen for notifications to show toasts
    const notifChannel = supabase
      .channel("pipeline-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const notif = payload.new as {
            type: string;
            title: string;
            message: string | null;
          };
          const text = notif.title;
          switch (notif.type) {
            case "screening_started":
            case "proposal_started":
              toast.info(text);
              break;
            case "screening_completed":
            case "proposal_generated":
              toast.success(text);
              break;
            case "grant_not_eligible":
              toast.error(text);
              break;
            default:
              toast(text);
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
      supabase.removeChannel(notifChannel);
    };
  }, [orgId]);

  const filtered = useMemo(() => {
    return grants.filter((g) => {
      if (g.stage === "archived") return false;
      const matchesSearch =
        !search ||
        g.title.toLowerCase().includes(search.toLowerCase()) ||
        g.funder_name?.toLowerCase().includes(search.toLowerCase());
      const matchesStage =
        stageFilter === "all" || g.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [grants, search, stageFilter]);

  function handleGrantAdded() {
    setShowAddDialog(false);
  }

  async function handleAddGrantClick() {
    setCheckingLimit(true);
    try {
      const res = await fetch("/api/grants/usage");
      if (res.ok) {
        const usage = await res.json();
        if (usage.limit !== null && usage.used >= usage.limit) {
          toast.error("Daily grant limit reached", {
            description: `You've used ${usage.used}/${usage.limit} grant${usage.limit === 1 ? "" : "s"} today. Upgrade to Professional for unlimited grants.`,
          });
          return;
        }
      }
      setShowAddDialog(true);
    } catch {
      // If usage check fails, still allow opening the dialog
      setShowAddDialog(true);
    } finally {
      setCheckingLimit(false);
    }
  }

  const handleStageChange = useCallback(async (grantId: string, targetStage: string) => {
    const grant = grants.find((g) => g.id === grantId);
    if (!grant) return;

    // If moving to drafting, show confirmation dialog instead of proceeding
    if (targetStage === "drafting" && grant.stage !== "drafting") {
      setConfirmGrant(grant);
      return;
    }

    await executeStageChange(grantId, targetStage);
  }, [grants]); // eslint-disable-line react-hooks/exhaustive-deps

  const executeStageChange = useCallback(async (grantId: string, targetStage: string) => {
    const grant = grants.find((g) => g.id === grantId);
    if (!grant) return;
    const previousStage = grant.stage;

    // Optimistically move the grant in the UI
    setGrants((prev) =>
      prev.map((g) =>
        g.id === grantId
          ? { ...g, stage: targetStage as Grant["stage"] }
          : g
      )
    );

    const result = await triggerStageWorkflow(grantId, targetStage);

    if (result.error) {
      // Revert on failure
      setGrants((prev) =>
        prev.map((g) => (g.id === grantId ? { ...g, stage: previousStage } : g))
      );
      toast.error(`Failed to move grant: ${result.error}`);
    } else {
      toast.success(
        `Grant moved to ${targetStage}${result.workflowId ? " — workflow triggered" : ""}`
      );
    }
  }, [grants]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">Pipeline</h1>
          <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
            {grants.length} grants in pipeline
          </p>
        </div>
        <Button data-tour="pipeline-add-btn" onClick={handleAddGrantClick} disabled={checkingLimit} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          {checkingLimit ? "Checking..." : "Add Grant"}
        </Button>
      </div>

      {/* Filters */}
      <div data-tour="pipeline-filters" className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search grants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGES.map((s) => {
              const labels: Record<string, string> = {
                discovery: "Discovered",
                screening: "Screened",
                pending_approval: "Waiting for Approval",
                drafting: "Drafted",
                closed: "Closed",
              };
              return (
                <SelectItem key={s} value={s}>
                  {labels[s] || s}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Tabs
          data-tour="pipeline-view-toggle"
          value={view}
          onValueChange={(v) => setView(v as "kanban" | "list")}
        >
          <TabsList>
            <TabsTrigger value="kanban">
              <LayoutGrid className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Recommendation tip */}
      {grants.some((g) => g.stage === "screening" || g.stage === "pending_approval" || g.stage === "drafting") && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
          <Lightbulb className="h-4 w-4 shrink-0" />
          <span>We recommend applying to grants with a screening score of <strong>85%+</strong> for the best chance of success.</span>
        </div>
      )}

      {/* Views */}
      {grants.length === 0 && isFetchingGrants ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="text-sm font-medium">Searching for grants matching your organization...</p>
          <p className="text-xs mt-1">This may take a minute. Grants will appear automatically.</p>
        </div>
      ) : view === "kanban" ? (
        <KanbanView grants={filtered} onStageChange={handleStageChange} proposalQualityMap={proposalQualityMap} />
      ) : (
        <ListView grants={filtered} proposalQualityMap={proposalQualityMap} />
      )}

      <AddGrantDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onGrantAdded={handleGrantAdded}
        orgName={orgName}
      />

      {/* Confirm Proposal Generation Dialog */}
      <Dialog open={!!confirmGrant} onOpenChange={(open) => { if (!open) setConfirmGrant(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Proposal Generation</DialogTitle>
            <DialogDescription>
              You are about to generate a grant proposal for:
            </DialogDescription>
          </DialogHeader>
          {confirmGrant && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Grant:</span>
                  <span className="text-sm font-medium">{confirmGrant.title}</span>
                </div>
                {confirmGrant.funder_name && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Funder:</span>
                    <span className="text-sm">{confirmGrant.funder_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Applying as:</span>
                  <span className="text-sm font-semibold">{orgName || "your organization"}</span>
                </div>
                {confirmGrant.screening_score != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Screening Score:</span>
                    <Badge
                      variant={
                        confirmGrant.screening_score >= 80 ? "default" :
                        confirmGrant.screening_score >= 50 ? "secondary" : "destructive"
                      }
                      className="text-xs"
                    >
                      {confirmGrant.screening_score}%
                    </Badge>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                This will move the grant to the Drafted stage and begin generating a proposal. Continue?
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmGrant(null)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (confirmGrant) {
                executeStageChange(confirmGrant.id, "drafting");
                setConfirmGrant(null);
              }
            }}>
              Approve & Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
