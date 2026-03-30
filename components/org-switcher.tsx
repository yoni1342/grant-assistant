"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Org {
  id: string;
  name: string;
}

interface OrgSwitcherProps {
  agencyId: string;
  activeOrgId: string | null;
  collapsed?: boolean;
}

export function OrgSwitcher({ agencyId, activeOrgId, collapsed }: OrgSwitcherProps) {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchOrgs() {
      const res = await fetch("/api/agency/organizations");
      if (res.ok) {
        const { orgs: data } = await res.json();
        if (data) setOrgs(data);
      }
    }
    fetchOrgs();
  }, [agencyId]);

  const activeOrg = orgs.find((o) => o.id === activeOrgId);

  async function switchOrg(orgId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/agency/switch-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      if (res.ok) {
        setOpen(false);
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function backToAgency() {
    await fetch("/api/agency/switch-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: null }),
    });
    router.push("/agency");
    router.refresh();
  }

  if (collapsed) {
    return (
      <div className="px-2 py-1">
        <button
          onClick={activeOrgId ? backToAgency : () => setOpen(!open)}
          className="flex items-center justify-center w-full rounded-md p-2 text-muted-foreground hover:bg-muted"
        >
          {activeOrgId ? (
            <ArrowLeft className="h-4 w-4" />
          ) : (
            <Building2 className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="px-2 py-1 space-y-1">
      {activeOrgId && (
        <button
          onClick={backToAgency}
          className="flex items-center gap-2 w-full rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          <span className="font-mono tracking-wide uppercase">Back to Agency</span>
        </button>
      )}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          disabled={loading}
          className={cn(
            "flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm transition-colors",
            "border border-border hover:bg-muted",
            loading && "opacity-50"
          )}
        >
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-left font-mono text-xs tracking-wide">
            {activeOrg?.name || "Select Organization"}
          </span>
          <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-border bg-card shadow-lg">
            <div className="max-h-48 overflow-y-auto p-1">
              {orgs.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">No organizations yet</p>
              ) : (
                orgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => switchOrg(org.id)}
                    className={cn(
                      "flex items-center gap-2 w-full rounded px-3 py-1.5 text-xs transition-colors",
                      org.id === activeOrgId
                        ? "bg-foreground/[0.06] font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{org.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
