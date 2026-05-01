"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, LifeBuoy, Mail } from "lucide-react";

const CATEGORIES = [
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

const STATUS_LABEL: Record<string, string> = {
  open: "Awaiting reply",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

function formatTicketRef(id: string): string {
  return "FND-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

const SUBJECT_MAX = 200;
const MESSAGE_MAX = 5000;

interface RecentRequest {
  id: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  message: string;
}

interface SupportClientProps {
  submitterName: string;
  submitterEmail: string;
  hasOrg: boolean;
  recentRequests: RecentRequest[];
}

export function SupportClient({
  submitterName,
  submitterEmail,
  recentRequests,
}: SupportClientProps) {
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastTicket, setLastTicket] = useState<string | null>(null);
  const [openRequest, setOpenRequest] = useState<RecentRequest | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Add a subject and message");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/support-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          category,
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        throw new Error(data.error || "Could not send your request");
      }
      toast.success(`Sent — ticket ${data.ticketRef}`);
      setLastTicket(data.ticketRef);
      setSubject("");
      setMessage("");
      setCategory("general");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not send your request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-10">
      <div className="mb-8 flex items-start gap-4">
        <div className="rounded-lg border bg-muted/30 p-3">
          <LifeBuoy className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Help & support</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Send our team a message — we&apos;ll reply by email, usually within one business day.
          </p>
        </div>
      </div>

      {lastTicket && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Your request was sent.</p>
            <p className="mt-0.5 text-emerald-800/80 dark:text-emerald-100/80">
              Ticket <span className="font-mono">{lastTicket}</span> — confirmation on its way to{" "}
              <span className="font-medium">{submitterEmail || "your inbox"}</span>.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Send us a message</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">From</Label>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <div>{submitterName || "—"}</div>
                  <div className="text-muted-foreground">{submitterEmail || "—"}</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, SUBJECT_MAX))}
                placeholder="One line summary"
                disabled={submitting}
                required
              />
              <div className="text-right text-xs text-muted-foreground">
                {subject.length}/{SUBJECT_MAX}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
                placeholder="What's going on? Include any details that'd help us help you faster — error messages, what you were trying to do, the grant or proposal involved, etc."
                rows={8}
                disabled={submitting}
                required
              />
              <div className="text-right text-xs text-muted-foreground">
                {message.length}/{MESSAGE_MAX}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="submit" disabled={submitting || !subject.trim() || !message.trim()}>
                {submitting ? "Sending…" : "Send message"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {recentRequests.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Your recent requests
          </h2>
          <div className="divide-y rounded-lg border">
            {recentRequests.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setOpenRequest(r)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.subject}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()} ·{" "}
                    {CATEGORY_LABEL[r.category] || r.category}
                  </div>
                </div>
                <span className="shrink-0 rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!openRequest} onOpenChange={(o) => !o && setOpenRequest(null)}>
        <DialogContent className="max-w-2xl">
          {openRequest && (
            <>
              <DialogHeader>
                <div className="mb-1 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  <span>{formatTicketRef(openRequest.id)}</span>
                  <span aria-hidden>·</span>
                  <span>{CATEGORY_LABEL[openRequest.category] || openRequest.category}</span>
                </div>
                <DialogTitle className="text-xl">{openRequest.subject}</DialogTitle>
                <DialogDescription>
                  Submitted {new Date(openRequest.created_at).toLocaleString()} ·{" "}
                  <span className="font-medium text-foreground">
                    {STATUS_LABEL[openRequest.status] || openRequest.status}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Your message
                </div>
                <div className="whitespace-pre-wrap rounded-md border bg-muted/30 px-4 py-3 text-sm leading-relaxed">
                  {openRequest.message}
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  Replies from our team come by email. Need to add something? Just reply to the
                  confirmation email — it&apos;ll attach to this ticket.
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => setOpenRequest(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
