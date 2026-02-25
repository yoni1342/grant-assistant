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
  DollarSign,
  Send,
  Trophy,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/discovery", label: "Discovery", icon: Search },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/narratives", label: "Narratives", icon: BookOpen },
  { href: "/proposals", label: "Proposals", icon: PenTool },
  { href: "/budgets", label: "Budgets", icon: DollarSign },
  // { href: "/submissions", label: "Submissions", icon: Send },
  // { href: "/awards", label: "Awards", icon: Trophy },
];

export function Sidebar({ user }: { user: User }) {
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
        "flex h-full flex-col border-r bg-white dark:bg-zinc-900 transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">
            Grant Assistant
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1 text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-zinc-100 font-medium text-foreground dark:bg-zinc-800"
                  : "text-muted-foreground hover:bg-zinc-50 hover:text-foreground dark:hover:bg-zinc-800/50"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t p-2">
        <div
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2",
            collapsed && "justify-center px-0"
          )}
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
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
