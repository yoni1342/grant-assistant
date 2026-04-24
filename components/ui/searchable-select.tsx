"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: SearchableOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Value that represents the "clear filter" / "all" choice. When the user
   *  clears the input or chooses this value, onChange is called with allValue. */
  allValue?: string;
  allLabel?: string;
}

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Type to search…",
  disabled,
  className,
  allValue = "all",
  allLabel = "All",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOption =
    value === allValue ? null : options.find((o) => o.value === value) ?? null;

  // Close on outside click. The input's displayed value is derived from
  // `open` + `selectedOption` + `query` below, so no sync-effect needed.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q))
    : options;

  function pick(optValue: string) {
    onChange(optValue);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function clear() {
    onChange(allValue);
    setQuery("");
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={open ? query : selectedOption?.label ?? ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          disabled={disabled}
          className="h-8 text-xs pr-7"
        />
        {selectedOption && !disabled && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear selection"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
          <button
            type="button"
            onClick={() => pick(allValue)}
            className={cn(
              "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground",
              value === allValue && "bg-accent/50"
            )}
          >
            <span className="text-muted-foreground italic">{allLabel}</span>
            {value === allValue && <Check className="h-3.5 w-3.5" />}
          </button>
          {filtered.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              No matches
            </div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => pick(opt.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground",
                  opt.value === value && "bg-accent/50"
                )}
              >
                <span className="truncate text-left">{opt.label}</span>
                {opt.value === value && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
