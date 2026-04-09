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
    await fetch("/api/admin/view-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: null }),
    });
    router.push("/admin/organizations");
  }

  return (
    <div className="bg-amber-500 text-black px-4 py-2 flex items-center justify-between text-sm font-medium z-50 relative">
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
