"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Kanban,
  Search,
  FileText,
  BookOpen,
  PenTool,
  Send,
  Trophy,
  Settings,
  LogOut,
  ChevronLeft,
  Bell,
  CreditCard,
  Archive,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { OrgSwitcher } from "@/components/org-switcher";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/discovery", label: "Discovery", icon: Search },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/narratives", label: "Narratives", icon: BookOpen },
  { href: "/proposals", label: "Proposals", icon: PenTool },
  { href: "/dashboard/archive", label: "Archive", icon: Archive },
  // { href: "/submissions", label: "Submissions", icon: Send },
  // { href: "/awards", label: "Awards", icon: Trophy },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Fundory convergence mark — 3 descending bars */
function FundoryMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-[5px]", className)}>
      <div className="h-[4px] w-[28px] bg-current" />
      <div className="h-[4px] w-[20px] bg-current" />
      <div className="h-[4px] w-[12px] bg-current" />
    </div>
  );
}

interface SidebarProps {
  user: User;
  agencyId?: string | null;
  activeOrgId?: string | null;
}

export function Sidebar({ user, agencyId, activeOrgId }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const initials =
    user.user_metadata?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || user.email?.[0]?.toUpperCase() || "?";

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Fetch unread count and subscribe to realtime updates
  useEffect(() => {
    const supabase = createClient();

    async function fetchUnreadCount() {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      if (!error) setUnreadCount(count ?? 0);
    }

    // Initial fetch
    fetchUnreadCount();

    // Poll every 10 seconds for reliable updates
    const interval = setInterval(fetchUnreadCount, 10_000);

    // Refetch when tab becomes visible or window regains focus
    function handleVisibility() {
      if (document.visibilityState === "visible") fetchUnreadCount();
    }
    function handleFocus() {
      fetchUnreadCount();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    // Also keep realtime subscription for instant updates when it works
    const channel = supabase
      .channel("sidebar-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => fetchUnreadCount()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      supabase.removeChannel(channel);
    };
  }, []);

  // Reset count when navigating to notifications page
  const displayCount = pathname.startsWith("/notifications") ? 0 : unreadCount;

  const sidebarContent = (
    <>
      {/* Header — Brand lockup */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-3">
            <FundoryMark className="text-foreground" />
            <div className="h-[24px] w-px bg-border" />
            <div className="flex flex-col">
              <span className="font-display text-sm font-black uppercase tracking-[0.04em] leading-none">
                Fundory
              </span>
              <span className="font-mono text-[8px] tracking-[0.18em] text-muted-foreground uppercase">
                Grant Intelligence
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/dashboard" className="mx-auto">
            <FundoryMark className="text-foreground" />
          </Link>
        )}
        {/* Desktop collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "hidden md:block rounded-md p-1 text-muted-foreground hover:bg-muted",
            collapsed && "hidden"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Org Switcher (agency users only) */}
      {agencyId && (
        <div className="border-b border-border">
          <OrgSwitcher agencyId={agencyId} activeOrgId={activeOrgId ?? null} collapsed={collapsed} />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {navItems.filter((item) => !(agencyId && item.href === "/billing")).map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const isNotifications = item.href === "/notifications";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 md:py-2 text-sm transition-colors",
                isActive
                  ? "bg-foreground/[0.06] font-medium text-foreground"
                  : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
              )}
            >
              {isNotifications ? (
                <div className="relative shrink-0">
                  <item.icon className="h-4 w-4" />
                  {displayCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white shadow-sm">
                      {displayCount > 99 ? "99+" : displayCount}
                    </span>
                  )}
                </div>
              ) : (
                <item.icon className="h-4 w-4 shrink-0" />
              )}
              {!collapsed && (
                <span className="font-mono text-xs tracking-wide uppercase">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-border p-2">
        <div
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2",
            collapsed && "justify-center px-0"
          )}
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs bg-foreground text-background font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 truncate">
              <p className="truncate text-xs font-medium">
                {user.user_metadata?.full_name || user.email}
              </p>
            </div>
          )}
          {!collapsed && (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 text-foreground hover:bg-muted -ml-2"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <FundoryMark className="text-foreground" />
          <span className="font-display text-sm font-black uppercase tracking-[0.04em]">
            Fundory
          </span>
        </Link>
        <div className="w-9 shrink-0" /> {/* Spacer for centering */}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-out sidebar */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-card transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex h-full flex-col border-r border-border bg-card transition-all duration-200 ease-in-out",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile top bar spacer — pushes content below fixed top bar */}
      <div className="md:hidden h-14 shrink-0 fixed top-0" />
    </>
  );
}
