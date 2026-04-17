"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminAgencyViewBanner({ agencyName, showBackToAgency = false }: { agencyName: string; showBackToAgency?: boolean }) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  async function handleBackToAgency() {
    setExiting(true);
    // Clear the org view but keep agency view
    await fetch("/api/admin/view-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: null }),
    });
    router.push("/agency");
  }

  async function handleExit() {
    setExiting(true);
    // Clear both agency and org view cookies
    await Promise.all([
      fetch("/api/admin/view-agency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencyId: null }),
      }),
      fetch("/api/admin/view-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: null }),
      }),
    ]);
    router.push("/admin/agencies");
  }

  return (
    <div className="bg-amber-500 text-black px-4 py-2 flex items-center justify-between text-sm font-medium shrink-0">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span>
          Admin View — Viewing <strong>{agencyName}</strong> agency (read-only)
        </span>
      </div>
      <div className="flex gap-2">
        {showBackToAgency && (
          <Button
            size="sm"
            variant="outline"
            className="bg-white/20 border-black/20 hover:bg-white/40 text-black h-7 text-xs"
            onClick={handleBackToAgency}
            disabled={exiting}
          >
            Back to Agency
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="bg-white/20 border-black/20 hover:bg-white/40 text-black h-7 text-xs"
          onClick={handleExit}
          disabled={exiting}
        >
          <X className="h-3 w-3 mr-1" />
          {exiting ? "Exiting..." : "Exit to Admin"}
        </Button>
      </div>
    </div>
  );
}
