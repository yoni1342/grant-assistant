"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";

const PRESETS: { value: string; label: string }[] = [
  { value: "live", label: "Live" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom" },
];

export function DateRangePills({
  preset,
  from,
  to,
}: {
  preset: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function setParam(updates: Record<string, string | null>) {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === "") p.delete(k);
      else p.set(k, v);
    });
    startTransition(() => router.replace(`?${p.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((p) => {
        const active = preset === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() =>
              setParam({
                preset: p.value,
                from: p.value === "custom" ? from : null,
                to: p.value === "custom" ? to : null,
              })
            }
            className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
              active
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/40"
            }`}
          >
            {p.label}
          </button>
        );
      })}
      {preset === "custom" && (
        <div className="flex items-center gap-1.5 ml-1">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) =>
              setParam({ preset: "custom", from: e.target.value, to })
            }
            className="h-7 px-2 text-xs w-[140px]"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) =>
              setParam({ preset: "custom", from, to: e.target.value })
            }
            className="h-7 px-2 text-xs w-[140px]"
          />
        </div>
      )}
    </div>
  );
}
