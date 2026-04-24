"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, ExternalLink, Eye, ChevronDown, ChevronRight, Layers, List } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils/format";

export interface FilterOption {
  value: string;
  label: string;
}

export interface GroupRow {
  fingerprint: string;
  workflow_name: string | null;
  failed_node: string | null;
  error_type: string;
  occurrences: number;
  affected_org_count: number;
  affected_org_names: string[];
  last_seen_at: string;
  first_seen_at: string;
  sample_message: string | null;
  sample_execution_url: string | null;
  resolved: boolean;
}

export interface RawRow {
  id: string;
  workflow_name: string | null;
  failed_node: string | null;
  execution_id: string | null;
  execution_mode: string | null;
  error_message: string | null;
  execution_url: string | null;
  error_type: string | null;
  org_id: string | null;
  created_at: string;
}

interface Props {
  groupedRows: GroupRow[];
  rawRows: RawRow[];
  workflowOptions: FilterOption[];
  orgOptions: FilterOption[];
  filters: {
    range: string;
    workflow: string;
    org: string;
    type: string;
    view: string;
  };
  errorMessage: string | null;
}

const ERROR_TYPES = [
  "timeout",
  "oom",
  "network",
  "rate_limit",
  "http_5xx",
  "http_4xx",
  "script_error",
  "other",
  "unknown",
];

const RANGES: FilterOption[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

function typeBadgeClass(t: string) {
  switch (t) {
    case "oom":
    case "timeout":
      return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
    case "http_5xx":
    case "network":
      return "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300";
    case "http_4xx":
    case "rate_limit":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
    case "script_error":
      return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function SystemErrorsClient({
  groupedRows,
  rawRows,
  workflowOptions,
  orgOptions,
  filters,
  errorMessage,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") p.delete(key);
    else p.set(key, value);
    startTransition(() => router.replace(`?${p.toString()}`));
  };

  const totalOccurrences = useMemo(
    () => groupedRows.reduce((acc, r) => acc + r.occurrences, 0),
    [groupedRows]
  );
  const uniqueWorkflows = useMemo(
    () => new Set(groupedRows.map((r) => r.workflow_name).filter(Boolean)).size,
    [groupedRows]
  );
  const orgIdToName = useMemo(
    () => new Map(orgOptions.map((o) => [o.value, o.label])),
    [orgOptions]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight">
          System Errors
        </h1>
        <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase mt-1">
          n8n workflow failures — grouped by fingerprint (workflow + node + type)
        </p>
      </div>

      {errorMessage && (
        <Card>
          <CardContent className="py-4 text-sm text-red-500">
            Failed to load errors: {errorMessage}
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard label="Unique error groups" value={String(groupedRows.length)} />
        <SummaryCard label="Total occurrences" value={String(totalOccurrences)} />
        <SummaryCard label="Workflows affected" value={String(uniqueWorkflows)} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4 flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Range"
            value={filters.range}
            options={RANGES}
            onChange={(v) => updateParam("range", v)}
          />
          <FilterSearchable
            label="Workflow"
            value={filters.workflow || "all"}
            options={workflowOptions}
            onChange={(v) => updateParam("workflow", v)}
            placeholder="Type to search workflows…"
            allLabel="All workflows"
          />
          <FilterSearchable
            label="Organization"
            value={filters.org || "all"}
            options={orgOptions}
            onChange={(v) => updateParam("org", v)}
            placeholder="Type to search organizations…"
            allLabel="All organizations"
            disabled={filters.view !== "raw"}
            hint={filters.view !== "raw" ? "(switch to raw list)" : undefined}
          />
          <FilterSelect
            label="Type"
            value={filters.type || "all"}
            options={[
              { value: "all", label: "All types" },
              ...ERROR_TYPES.map((t) => ({ value: t, label: t })),
            ]}
            onChange={(v) => updateParam("type", v)}
          />

          <div className="ml-auto inline-flex rounded-md border border-border p-0.5">
            <button
              onClick={() => updateParam("view", "grouped")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono uppercase rounded ${
                filters.view !== "raw"
                  ? "bg-foreground/[0.06] text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3 w-3" /> Grouped
            </button>
            <button
              onClick={() => updateParam("view", "raw")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono uppercase rounded ${
                filters.view === "raw"
                  ? "bg-foreground/[0.06] text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-3 w-3" /> Raw
            </button>
          </div>
        </CardContent>
      </Card>

      {filters.view === "raw" ? (
        <RawView rows={rawRows} orgIdToName={orgIdToName} />
      ) : (
        <GroupedView rows={groupedRows} />
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[160px]">
      <label className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label} {hint && <span className="text-muted-foreground/60">{hint}</span>}
      </label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterSearchable({
  label,
  value,
  options,
  onChange,
  placeholder,
  allLabel,
  disabled,
  hint,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  allLabel?: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[220px] max-w-[260px]">
      <label className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label} {hint && <span className="text-muted-foreground/60">{hint}</span>}
      </label>
      <SearchableSelect
        value={value}
        options={options}
        onChange={onChange}
        placeholder={placeholder}
        allLabel={allLabel}
        disabled={disabled}
      />
    </div>
  );
}

// ---------- Grouped view ----------

function GroupedView({ rows }: { rows: GroupRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (fp: string) => {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(fp)) n.delete(fp);
      else n.add(fp);
      return n;
    });
  };

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No errors match the current filters.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-20 text-center">Count</TableHead>
              <TableHead>Workflow / Node / Type</TableHead>
              <TableHead>Affected orgs</TableHead>
              <TableHead>First seen</TableHead>
              <TableHead>Last seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const open = expanded.has(r.fingerprint);
              return (
                <>
                  <TableRow
                    key={r.fingerprint}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => toggle(r.fingerprint)}
                  >
                    <TableCell className="text-muted-foreground">
                      {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono text-sm font-semibold">{r.occurrences}×</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium">
                          {r.workflow_name || <span className="italic text-muted-foreground">unknown</span>}
                          {r.failed_node && (
                            <span className="text-muted-foreground"> / {r.failed_node}</span>
                          )}
                        </span>
                        <div>
                          <Badge variant="secondary" className={`text-[10px] font-mono uppercase ${typeBadgeClass(r.error_type)}`}>
                            {r.error_type}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.affected_org_count === 0 ? (
                        <span className="text-muted-foreground italic">— none tagged —</span>
                      ) : (
                        <span>
                          {r.affected_org_count}{" "}
                          <span className="text-muted-foreground">
                            ({r.affected_org_names.slice(0, 2).join(", ")}
                            {r.affected_org_names.length > 2 ? `, +${r.affected_org_names.length - 2}` : ""})
                          </span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimeAgo(r.first_seen_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimeAgo(r.last_seen_at)}
                    </TableCell>
                  </TableRow>
                  {open && (
                    <TableRow key={r.fingerprint + ":detail"} className="bg-muted/20 hover:bg-muted/20">
                      <TableCell></TableCell>
                      <TableCell colSpan={5} className="py-3">
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="font-mono text-muted-foreground uppercase tracking-wide">Fingerprint: </span>
                            <span className="font-mono">{r.fingerprint.slice(0, 16)}…</span>
                          </div>
                          {r.affected_org_names.length > 0 && (
                            <div>
                              <span className="font-mono text-muted-foreground uppercase tracking-wide">Orgs: </span>
                              {r.affected_org_names.join(", ")}
                            </div>
                          )}
                          <div>
                            <span className="font-mono text-muted-foreground uppercase tracking-wide">Sample message:</span>
                            <pre className="mt-1 bg-background border border-border rounded p-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-red-600 dark:text-red-400">
                              {r.sample_message || "(no message)"}
                            </pre>
                          </div>
                          {r.sample_execution_url && (
                            <a
                              href={r.sample_execution_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" /> Open latest execution in n8n
                            </a>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------- Raw view ----------

function RawView({
  rows,
  orgIdToName,
}: {
  rows: RawRow[];
  orgIdToName: Map<string, string>;
}) {
  const [selected, setSelected] = useState<RawRow | null>(null);

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No errors match the current filters.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Node</TableHead>
                <TableHead>Org</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell
                    className="text-xs text-muted-foreground whitespace-nowrap"
                    title={new Date(r.created_at).toLocaleString()}
                  >
                    {formatTimeAgo(r.created_at)}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {r.workflow_name || <span className="italic text-muted-foreground">unknown</span>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.failed_node || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.org_id ? (
                      orgIdToName.get(r.org_id) || (
                        <span className="font-mono text-muted-foreground">{r.org_id.slice(0, 8)}…</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-mono uppercase ${typeBadgeClass(r.error_type || "unknown")}`}
                    >
                      {r.error_type || "unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs max-w-[360px]">
                    <span className="line-clamp-2 text-red-600 dark:text-red-400 font-mono">
                      {r.error_message || "(no message)"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelected(r)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <Eye className="h-3 w-3" /> View
                      </button>
                      {r.execution_url && (
                        <a
                          href={r.execution_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" /> n8n
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-tight">
              Error Detail
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <DetailRow label="Workflow" value={selected.workflow_name} />
              <DetailRow label="Failed Node" value={selected.failed_node} />
              <DetailRow
                label="Org"
                value={selected.org_id ? orgIdToName.get(selected.org_id) || selected.org_id : null}
              />
              <DetailRow label="Type" value={selected.error_type} />
              <DetailRow label="Mode" value={selected.execution_mode} />
              <DetailRow label="Execution ID" value={selected.execution_id} mono />
              <DetailRow label="When" value={new Date(selected.created_at).toLocaleString()} />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Error Message
                </p>
                <pre className="text-xs font-mono bg-muted/50 p-3 rounded overflow-x-auto whitespace-pre-wrap break-words text-red-600 dark:text-red-400">
                  {selected.error_message || "(no message)"}
                </pre>
              </div>
              {selected.execution_url && (
                <a
                  href={selected.execution_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Open execution in n8n
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-32 shrink-0 pt-0.5">
        {label}
      </p>
      <p className={`text-sm flex-1 ${mono ? "font-mono" : ""}`}>
        {value || <span className="text-muted-foreground italic">—</span>}
      </p>
    </div>
  );
}
