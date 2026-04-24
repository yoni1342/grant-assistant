"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// Banner shows while the org's last grant fetch is still in the "running"
// window (same signal the admin Fetch Queue uses — derived from
// organizations.last_grant_fetch_at + a 30-minute window in org_fetch_schedule).
// We self-hide at `hideAt` so a crashed n8n workflow doesn't leave the UI
// stuck on "Running..." forever.

const MESSAGE = "Running daily grant fetch for your organization...";

export function GrantFetchBanner({ hideAt }: { hideAt: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const target = new Date(hideAt).getTime();
    const delay = Math.max(0, target - Date.now());
    const t = setTimeout(() => setVisible(false), delay);
    return () => clearTimeout(t);
  }, [hideAt]);

  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-400 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      <span className="font-medium">{MESSAGE}</span>
    </div>
  );
}
