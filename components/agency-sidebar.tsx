"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { href: "/agency", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/agency/organizations", label: "Organizations", icon: Building2 },
  { href: "/agency/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/agency/billing", label: "Billing", icon: CreditCard },
  { href: "/agency/settings", label: "Settings", icon: Settings },
];

function FundoryMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-[5px]", className)}>
      <div className="h-[4px] w-[28px] bg-current" />
      <div className="h-[4px] w-[20px] bg-current" />
      <div className="h-[4px] w-[12px] bg-current" />
    </div>
  );
}

export function AgencySidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const initials =
    user.user_metadata?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || user.email?.[0]?.toUpperCase() || "?";

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Header — Brand lockup */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {!collapsed ? (
          <Link href="/agency" className="flex items-center gap-3">
            <FundoryMark className="text-foreground" />
            <div className="h-[24px] w-px bg-border" />
            <div className="flex flex-col">
              <span className="font-display text-sm font-black uppercase tracking-[0.04em] leading-none">
                Fundory
              </span>
              <span className="font-mono text-[8px] tracking-[0.18em] text-muted-foreground uppercase">
                Agency
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/agency" className="mx-auto">
            <FundoryMark className="text-foreground" />
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "rounded-md p-1 text-muted-foreground hover:bg-muted",
            collapsed && "hidden"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href ||
              pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-foreground/[0.06] font-medium text-foreground"
                  : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
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
    </aside>
  );
}
