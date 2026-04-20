"use client";

import { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Search, ExternalLink, Eye } from "lucide-react";

interface N8nError {
  id: string;
  workflow_name: string | null;
  failed_node: string | null;
  execution_id: string | null;
  execution_mode: string | null;
  error_message: string | null;
  execution_url: string | null;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function modeColor(mode: string | null): string {
  switch (mode) {
    case "manual":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
    case "trigger":
      return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300";
    case "webhook":
      return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function SystemErrorsClient({ errors, last24h }: { errors: N8nError[]; last24h: number }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<N8nError | null>(null);

  const filtered = useMemo(() => {
    if (!search) return errors;
    const q = search.toLowerCase();
    return errors.filter(
      (e) =>
        (e.workflow_name || "").toLowerCase().includes(q) ||
        (e.failed_node || "").toLowerCase().includes(q) ||
        (e.error_message || "").toLowerCase().includes(q) ||
        (e.execution_id || "").toLowerCase().includes(q)
    );
  }, [errors, search]);

  const uniqueWorkflows = useMemo(() => {
    const s = new Set<string>();
    errors.forEach((e) => e.workflow_name && s.add(e.workflow_name));
    return s.size;
  }, [errors]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight">
          System Errors
        </h1>
        <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
          n8n workflow failures forwarded by the Error Notification Handler
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Errors
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{errors.length}</p>
            <p className="text-xs text-muted-foreground">Last 500 records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last 24h
            </CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${last24h > 0 ? "text-red-500" : "text-muted-foreground"}`}
            />
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${last24h > 0 ? "text-red-600" : ""}`}
            >
              {last24h}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Workflows Affected
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{uniqueWorkflows}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm font-medium">Error Log</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workflow, node, message..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">
              {errors.length === 0
                ? "No errors logged yet. When an n8n workflow fails, it will appear here."
                : "No errors match your search."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">When</TableHead>
                    <TableHead className="text-xs">Workflow</TableHead>
                    <TableHead className="text-xs">Failed Node</TableHead>
                    <TableHead className="text-xs">Mode</TableHead>
                    <TableHead className="text-xs">Error</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell
                        className="text-xs text-muted-foreground whitespace-nowrap"
                        title={new Date(row.created_at).toLocaleString()}
                      >
                        {timeAgo(row.created_at)}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {row.workflow_name || (
                          <span className="text-muted-foreground italic">unknown</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.failed_node || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.execution_mode && (
                          <Badge
                            variant="secondary"
                            className={modeColor(row.execution_mode)}
                          >
                            {row.execution_mode}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-[360px]">
                        <span className="line-clamp-2 text-red-600 dark:text-red-400 font-mono">
                          {row.error_message || "(no message)"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelected(row)}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <Eye className="h-3 w-3" /> View
                          </button>
                          {row.execution_url && (
                            <a
                              href={row.execution_url}
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
            </div>
          )}
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
              <DetailRow label="Mode" value={selected.execution_mode} />
              <DetailRow label="Execution ID" value={selected.execution_id} mono />
              <DetailRow
                label="When"
                value={new Date(selected.created_at).toLocaleString()}
              />
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
    </div>
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
