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
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials =
    user.user_metadata?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || user.email?.[0]?.toUpperCase() || "?";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const sidebarContent = (
    <>
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
            "hidden md:block rounded-md p-1 text-muted-foreground hover:bg-muted",
            collapsed && "hidden"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
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
                "flex items-center gap-3 rounded-md px-3 py-2.5 md:py-2 text-sm transition-colors",
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
        <Link href="/agency" className="flex items-center gap-2">
          <FundoryMark className="text-foreground" />
          <span className="font-display text-sm font-black uppercase tracking-[0.04em]">
            Agency
          </span>
        </Link>
        <div className="w-9" />
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
          "hidden md:flex h-full flex-col border-r border-border bg-card transition-all duration-200",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
