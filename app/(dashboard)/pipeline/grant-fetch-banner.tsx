"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Search, Filter, Sparkles, CheckCheck, AlertCircle } from "lucide-react";

const STATUS_CONFIG: Record<string, { icon: typeof Search; color: string }> = {
  searching: { icon: Search, color: "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400" },
  filtering: { icon: Filter, color: "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400" },
  inserting: { icon: Sparkles, color: "border-purple-400 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-400" },
  complete: { icon: CheckCheck, color: "border-green-400 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400" },
  error: { icon: AlertCircle, color: "border-red-400 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400" },
};

interface FetchStatus {
  org_id: string;
  status: string;
  stage_message: string;
  error_message?: string | null;
}

export function GrantFetchBanner({
  orgId,
  initialStatus,
}: {
  orgId: string;
  initialStatus: FetchStatus;
}) {
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>(initialStatus);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`grant-fetch-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "grant_fetch_status",
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setVisible(false);
            return;
          }
          const row = payload.new as FetchStatus;
          setFetchStatus(row);

          if (row.status === "complete") {
            setTimeout(() => setVisible(false), 4000);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  if (!visible) return null;

  const config = STATUS_CONFIG[fetchStatus.status] || STATUS_CONFIG.searching;
  const Icon = config.icon;
  const isLoading = fetchStatus.status !== "complete" && fetchStatus.status !== "error";

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${config.color}`}>
      {isLoading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      ) : (
        <Icon className="h-4 w-4 shrink-0" />
      )}
      <span className="font-medium">{fetchStatus.stage_message}</span>
      {fetchStatus.error_message && (
        <span className="text-xs opacity-75">({fetchStatus.error_message})</span>
      )}
    </div>
  );
}
