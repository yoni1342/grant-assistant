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
  Clock,
  ChevronLeft,
} from "lucide-react";
import {
  formatDistanceToNow,
  isToday,
  isYesterday,
  differenceInMinutes,
  differenceInDays,
} from "date-fns";

type TimeBucket =
  | "Now"
  | "Earlier Today"
  | "Yesterday"
  | "This Week"
  | "This Month"
  | "Older";

function getTimeBucket(dateStr: string | null): TimeBucket {
  if (!dateStr) return "Older";
  const date = new Date(dateStr);
  const now = new Date();
  if (differenceInMinutes(now, date) < 15) return "Now";
  if (isToday(date)) return "Earlier Today";
  if (isYesterday(date)) return "Yesterday";
  if (differenceInDays(now, date) < 7) return "This Week";
  if (differenceInDays(now, date) < 30) return "This Month";
  return "Older";
}

const BUCKET_ORDER: TimeBucket[] = [
  "Now",
  "Earlier Today",
  "Yesterday",
  "This Week",
  "This Month",
  "Older",
];

function groupNotifications(notifications: Notification[]) {
  const groups = new Map<TimeBucket, Notification[]>();
  for (const notif of notifications) {
    const bucket = getTimeBucket(notif.created_at);
    const list = groups.get(bucket) || [];
    list.push(notif);
    groups.set(bucket, list);
  }
  return BUCKET_ORDER.filter((b) => groups.has(b)).map((bucket) => ({
    bucket,
    items: groups.get(bucket)!,
  }));
}

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

const BUCKET_ICONS: Record<TimeBucket, typeof Bell> = {
  "Now": Bell,
  "Earlier Today": Clock,
  "Yesterday": Clock,
  "This Week": Clock,
  "This Month": Clock,
  "Older": Clock,
};

function BucketTiles({
  notifications,
  onSelectBucket,
}: {
  notifications: Notification[];
  onSelectBucket: (bucket: TimeBucket) => void;
}) {
  const groups = groupNotifications(notifications);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {groups.map(({ bucket, items }) => {
        const unreadCount = items.filter((n) => !n.is_read).length;
        const BucketIcon = BUCKET_ICONS[bucket];
        // Get a preview of notification types in this bucket
        const typeCounts = new Map<string, number>();
        for (const item of items) {
          const config = TYPE_CONFIG[item.type] || DEFAULT_CONFIG;
          typeCounts.set(config.badge, (typeCounts.get(config.badge) || 0) + 1);
        }

        return (
          <button
            key={bucket}
            onClick={() => onSelectBucket(bucket)}
            className="block text-left w-full"
          >
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BucketIcon className={`h-5 w-5 ${bucket === "Now" ? "text-blue-500" : "text-muted-foreground"}`} />
                    <h2 className="font-mono text-sm font-semibold tracking-wide uppercase">
                      {bucket}
                    </h2>
                  </div>
                  {unreadCount > 0 && (
                    <Badge variant="default" className="text-xs h-5 px-1.5">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold mb-2">{items.length}</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(typeCounts.entries()).map(([type, count]) => (
                    <span
                      key={type}
                      className="text-xs text-muted-foreground"
                    >
                      {count} {type}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}

function BucketDetail({
  bucket,
  notifications,
  onBack,
}: {
  bucket: TimeBucket;
  notifications: Notification[];
  onBack: () => void;
}) {
  const items = notifications.filter(
    (n) => getTimeBucket(n.created_at) === bucket
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <h2 className="font-mono text-xs font-semibold text-muted-foreground tracking-wide uppercase">
          {bucket}
        </h2>
        <span className="font-mono text-xs text-muted-foreground/60">
          ({items.length})
        </span>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">No notifications in this period</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((notif) => {
            const isStale =
              (notif.type === "screening_started" || notif.type === "proposal_started") &&
              notif.created_at &&
              new Date().getTime() - new Date(notif.created_at).getTime() > 60 * 60 * 1000;

            const config = isStale
              ? { icon: XCircle, color: "text-yellow-500", badge: "Timed Out", badgeVariant: "outline" as const }
              : TYPE_CONFIG[notif.type] || DEFAULT_CONFIG;
            const Icon = config.icon;
            const isSpinner =
              !isStale &&
              (notif.type === "screening_started" ||
              notif.type === "proposal_started");

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
                    {isStale ? (
                      <p className="text-sm text-yellow-600 mt-0.5">
                        This workflow did not complete. It may have been cancelled or encountered an error.
                      </p>
                    ) : notif.message ? (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                    ) : null}
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

export function NotificationsClient({
  initialNotifications,
  orgId,
}: {
  initialNotifications: Notification[];
  orgId: string;
}) {
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);
  const [selectedBucket, setSelectedBucket] = useState<TimeBucket | null>(null);

  function handleSelectBucket(bucket: TimeBucket) {
    setSelectedBucket(bucket);
  }

  function handleBack() {
    setSelectedBucket(null);
  }

  useEffect(() => {
    const supabase = createClient();

    async function fetchNotifications() {
      const { data } = await supabase
        .from("notifications")
        .select("*, grants:grants_full(title, funder_name, stage)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (data) {
        setNotifications(data as Notification[]);
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

    const interval = setInterval(fetchNotifications, 10_000);

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
    <div className="p-4 sm:p-6 space-y-4">
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
      ) : selectedBucket ? (
        <BucketDetail bucket={selectedBucket} notifications={notifications} onBack={handleBack} />
      ) : (
        <BucketTiles notifications={notifications} onSelectBucket={handleSelectBucket} />
      )}
    </div>
  );
}
