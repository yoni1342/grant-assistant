"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  Bell,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  org_id: string;
  grant_id: string | null;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string | null;
  grants: {
    title: string;
    funder_name: string | null;
    stage: string | null;
  } | null;
};

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Bell; color: string; badge: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }
> = {
  screening_started: {
    icon: Loader2,
    color: "text-blue-500",
    badge: "Screening",
    badgeVariant: "secondary",
  },
  screening_completed: {
    icon: CheckCircle2,
    color: "text-green-500",
    badge: "Screening",
    badgeVariant: "default",
  },
  grant_not_eligible: {
    icon: XCircle,
    color: "text-red-500",
    badge: "Ineligible",
    badgeVariant: "destructive",
  },
  proposal_started: {
    icon: Loader2,
    color: "text-purple-500",
    badge: "Proposal",
    badgeVariant: "secondary",
  },
  proposal_generated: {
    icon: FileText,
    color: "text-green-500",
    badge: "Proposal",
    badgeVariant: "default",
  },
};

const DEFAULT_CONFIG = {
  icon: Bell,
  color: "text-muted-foreground",
  badge: "Update",
  badgeVariant: "outline" as const,
};

export function NotificationsClient({
  initialNotifications,
  orgId,
}: {
  initialNotifications: Notification[];
  orgId: string;
}) {
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);

  useEffect(() => {
    const supabase = createClient();

    async function fetchNotifications() {
      const { data } = await supabase
        .from("notifications")
        .select("*, grants(title, funder_name, stage)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (data) {
        setNotifications(data as Notification[]);
        // Mark unread ones as read since user is on the page
        const unreadIds = data.filter((n) => !n.is_read).map((n) => n.id);
        if (unreadIds.length > 0) {
          supabase
            .from("notifications")
            .update({ is_read: true })
            .in("id", unreadIds)
            .then();
        }
      }
    }

    // Poll every 10 seconds for reliable updates
    const interval = setInterval(fetchNotifications, 10_000);

    // Also keep realtime subscription for instant updates when it works
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          // Fetch the full notification with grants join
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">Notifications</h1>
        <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
          Grant status updates and workflow progress
        </p>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const config = TYPE_CONFIG[notif.type] || DEFAULT_CONFIG;
            const Icon = config.icon;
            const isSpinner =
              notif.type === "screening_started" ||
              notif.type === "proposal_started";

            return (
              <Card
                key={notif.id}
                className={notif.is_read ? "opacity-70" : ""}
              >
                <CardContent className="flex items-start gap-4 py-4">
                  <div className="mt-0.5">
                    <Icon
                      className={`h-5 w-5 ${config.color} ${isSpinner ? "animate-spin" : ""}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={config.badgeVariant} className="text-xs">
                        {config.badge}
                      </Badge>
                      {!notif.is_read && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                      {notif.created_at && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatDistanceToNow(new Date(notif.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium">{notif.title}</p>
                    {notif.message && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                    )}
                    {notif.grants && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {notif.grants.funder_name && (
                          <span>Funder: {notif.grants.funder_name}</span>
                        )}
                        {notif.grants.stage && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {notif.grants.stage}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  {notif.grant_id && (
                    <Link
                      href={`/pipeline/${notif.grant_id}`}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1"
                    >
                      View grant
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
