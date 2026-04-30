"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminViewBanner({ orgName }: { orgName: string }) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  async function handleExit() {
    setExiting(true);
    // Pull the entry point captured when the admin clicked "View as
    // Organization" so they go back where they started — works for the
    // agency detail page or the org list. Falls back to /admin/organizations
    // for older sessions.
    const returnPath =
      (typeof window !== "undefined" &&
        sessionStorage.getItem("viewOrg.returnPath")) ||
      "/admin/organizations";
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("viewOrg.returnPath");
    }
    await fetch("/api/admin/view-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: null }),
    });
    router.push(returnPath);
  }

  return (
    <div className="bg-amber-500 text-black px-4 py-2 flex items-center justify-between text-sm font-medium shrink-0">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span>
          Admin View — Viewing <strong>{orgName}</strong> (read-only)
        </span>
      </div>
      <Button
        data-admin-action
        size="sm"
        variant="outline"
        className="bg-white/20 border-black/20 hover:bg-white/40 text-black h-7 text-xs"
        onClick={handleExit}
        disabled={exiting}
      >
        <X className="h-3 w-3 mr-1" />
        {exiting ? "Exiting..." : "Exit View"}
      </Button>
    </div>
  );
}
