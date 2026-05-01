"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LifeBuoy, Mail, ExternalLink } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils/format";
import { updateSupportRequestStatus } from "./actions";

export interface SupportRequestRow {
  id: string;
  org_id: string | null;
  org_name: string | null;
  user_id: string | null;
  submitter_name: string;
  submitter_email: string;
  org_plan: string | null;
  category: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

interface Props {
  rows: SupportRequestRow[];
  counts: { open: number; in_progress: number; resolved: number; closed: number; total: number };
  filters: { status: string; category: string; q: string };
  selectedId: string;
  errorMessage: string | null;
}

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "general", label: "General question" },
  { value: "billing", label: "Billing / subscription" },
  { value: "bug", label: "Something is broken" },
  { value: "grants", label: "Grant discovery / matching" },
  { value: "proposals", label: "Proposals / drafting" },
  { value: "feature", label: "Feature request" },
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

const STATUS_LABEL: Record<string, string> = {
  open: "Awaiting reply",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

function statusBadgeClass(s: string) {
  switch (s) {
    case "open":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    case "in_progress":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
    case "resolved":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
    case "closed":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function ticketRef(id: string): string {
  return "FND-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function SupportRequestsClient({
  rows,
  counts,
  filters,
  selectedId,
  errorMessage,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") p.delete(key);
    else p.set(key, value);
    startTransition(() => router.replace(`?${p.toString()}`));
  };

  // Local search buffer — submitting the form pushes value to URL ?q.
  // Re-keying on filters.q resets the input when the URL filter is cleared elsewhere.
  const [searchValue, setSearchValue] = useState(filters.q);

  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const closeDialog = () => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("id");
    router.replace(p.toString() ? `?${p.toString()}` : window.location.pathname);
  };

  const openRow = (id: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("id", id);
    router.replace(`?${p.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight">
          Support Requests
        </h1>
        <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase mt-1">
          User-submitted help & support tickets — replies happen via email
        </p>
      </div>

      {errorMessage && (
        <Card>
          <CardContent className="py-4 text-sm text-red-500">
            Failed to load requests: {errorMessage}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Awaiting reply" value={counts.open} tone="amber" />
        <SummaryCard label="In progress" value={counts.in_progress} tone="blue" />
        <SummaryCard label="Resolved" value={counts.resolved} tone="emerald" />
        <SummaryCard label="All-time" value={counts.total} tone="muted" />
      </div>

      <Card>
        <CardContent className="py-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Status
            </label>
            <Select
              value={filters.status || "all"}
              onValueChange={(v) => setParam("status", v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Category
            </label>
            <Select
              value={filters.category || "all"}
              onValueChange={(v) => setParam("category", v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <form
            className="flex flex-col gap-1 flex-1 min-w-[220px]"
            onSubmit={(e) => {
              e.preventDefault();
              setParam("q", searchValue.trim());
            }}
          >
            <label className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Search
            </label>
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Subject, message, name, or email…"
              className="h-8 text-xs"
            />
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <LifeBuoy className="mx-auto mb-3 h-6 w-6 text-muted-foreground/60" />
            No support requests match the current filters.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Ticket</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="w-44">From</TableHead>
                  <TableHead className="w-44">Org</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-28">Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => openRow(r.id)}
                  >
                    <TableCell className="font-mono text-xs">{ticketRef(r.id)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium truncate max-w-[420px]">{r.subject}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {CATEGORY_LABEL[r.category] || r.category}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="truncate font-medium">{r.submitter_name || "—"}</div>
                      <div className="truncate text-muted-foreground">{r.submitter_email || "—"}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.org_name ? (
                        <span className="truncate">{r.org_name}</span>
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                      {r.org_plan && (
                        <div className="text-[11px] text-muted-foreground capitalize">{r.org_plan}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-mono uppercase ${statusBadgeClass(r.status)}`}
                      >
                        {STATUS_LABEL[r.status] || r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimeAgo(r.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <SupportRequestDialog row={selectedRow} onClose={closeDialog} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "blue" | "emerald" | "muted";
}) {
  const toneClass: Record<string, string> = {
    amber: "text-amber-600 dark:text-amber-400",
    blue: "text-blue-600 dark:text-blue-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    muted: "text-foreground",
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${toneClass[tone]}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function SupportRequestDialog({
  row,
  onClose,
}: {
  row: SupportRequestRow | null;
  onClose: () => void;
}) {
  if (!row) {
    return (
      <Dialog open={false} onOpenChange={(o) => !o && onClose()}>
        <DialogContent />
      </Dialog>
    );
  }
  return <SupportRequestDialogBody key={row.id} row={row} onClose={onClose} />;
}

function SupportRequestDialogBody({
  row,
  onClose,
}: {
  row: SupportRequestRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [statusValue, setStatusValue] = useOptimistic(row.status);

  const handleStatusChange = (next: string) => {
    if (next === row.status) return;
    startTransition(async () => {
      setStatusValue(next);
      const res = await updateSupportRequestStatus(row.id, next);
      if ("error" in res && res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Marked ${STATUS_LABEL[next] || next}`);
        router.refresh();
      }
    });
  };

  const mailtoSubject = `Re: [${ticketRef(row.id)}] ${row.subject}`;
  const mailtoBody = `\n\n---\nOriginal request from ${row.submitter_name || row.submitter_email}:\n\n${row.message}\n`;
  const mailto = row.submitter_email
    ? `mailto:${row.submitter_email}?subject=${encodeURIComponent(mailtoSubject)}&body=${encodeURIComponent(mailtoBody)}`
    : null;

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <span>{ticketRef(row.id)}</span>
            <span aria-hidden>·</span>
            <span>{CATEGORY_LABEL[row.category] || row.category}</span>
          </div>
          <DialogTitle className="text-xl">{row.subject}</DialogTitle>
          <DialogDescription>
            Submitted {new Date(row.created_at).toLocaleString()} ·{" "}
            <span className="font-medium text-foreground">{formatTimeAgo(row.created_at)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
              From
            </div>
            <div className="font-medium">{row.submitter_name || "—"}</div>
            <div className="text-muted-foreground text-xs break-all">
              {row.submitter_email || "—"}
            </div>
          </div>
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
              Organization
            </div>
            {row.org_name ? (
              <Link
                href={`/admin/organizations/${row.org_id}`}
                className="font-medium hover:underline"
              >
                {row.org_name}
              </Link>
            ) : (
              <div className="font-medium text-muted-foreground">—</div>
            )}
            {row.org_plan && (
              <div className="text-muted-foreground text-xs capitalize">
                Plan: {row.org_plan}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
            Message
          </div>
          <div className="whitespace-pre-wrap rounded-md border bg-muted/20 px-4 py-3 text-sm leading-relaxed max-h-72 overflow-y-auto">
            {row.message}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
              Status
            </span>
            <Select value={statusValue} onValueChange={handleStatusChange} disabled={pending}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {row.resolved_at && (
              <span className="text-[11px] text-muted-foreground">
                Resolved {formatTimeAgo(row.resolved_at)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {mailto && (
              <Button asChild variant="default" size="sm">
                <a href={mailto}>
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  Reply by email
                </a>
              </Button>
            )}
            {row.org_id && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/organizations/${row.org_id}`}>
                  Open org
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
