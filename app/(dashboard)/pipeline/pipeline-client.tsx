"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KanbanView } from "./kanban-view";
import { ListView } from "./list-view";
import { AddGrantDialog } from "./add-grant-dialog";
import { Search, Plus, LayoutGrid, List } from "lucide-react";

type Grant = Tables<"grants">;

const STAGES = [
  "discovery",
  "screening",
  "drafting",
  // "submission",
  // "awarded",
  // "reporting",
  "closed",
] as const;

export function PipelineClient({
  initialGrants,
}: {
  initialGrants: Grant[];
}) {
  const [grants, setGrants] = useState<Grant[]>(initialGrants);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("grants-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grants" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setGrants((prev) => [payload.new as Grant, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setGrants((prev) =>
              prev.map((g) =>
                g.id === (payload.new as Grant).id
                  ? (payload.new as Grant)
                  : g
              )
            );
          } else if (payload.eventType === "DELETE") {
            setGrants((prev) =>
              prev.filter((g) => g.id !== (payload.old as Grant).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    return grants.filter((g) => {
      const matchesSearch =
        !search ||
        g.title.toLowerCase().includes(search.toLowerCase()) ||
        g.funder_name?.toLowerCase().includes(search.toLowerCase());
      const matchesStage =
        stageFilter === "all" || g.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [grants, search, stageFilter]);

  function handleGrantAdded(grant: Grant) {
    setGrants((prev) => [grant, ...prev]);
    setShowAddDialog(false);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {grants.length} grants in pipeline
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Grant
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
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
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tabs
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

      {/* Views */}
      {view === "kanban" ? (
        <KanbanView grants={filtered} />
      ) : (
        <ListView grants={filtered} />
      )}

      <AddGrantDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onGrantAdded={handleGrantAdded}
      />
    </div>
  );
}
