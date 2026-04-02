"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "1w", label: "Within 1 week" },
  { value: "2w", label: "Within 2 weeks" },
  { value: "1m", label: "Within 1 month" },
  { value: "3m", label: "Within 3 months" },
  { value: "ongoing", label: "Ongoing / Rolling" },
];

export function DeadlineFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("filter") || "all";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("filter");
    } else {
      params.set("filter", value);
    }
    router.push(`/dashboard/deadlines?${params.toString()}`);
  }

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filter by date" />
      </SelectTrigger>
      <SelectContent>
        {FILTER_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
