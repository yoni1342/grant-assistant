"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface GenerateProposalButtonProps {
  grantId: string;
  grantTitle: string;
  existingProposalId?: string;
}

type GenerationStatus = "generating" | "done" | "error";

// n8n's proposal workflow takes minutes; this is the wall-clock cap after
// which we stop waiting and tell the user to check Notifications. We do
// NOT cancel the run — it may still finish and post a notification.
const WATCH_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 10_000;

export function GenerateProposalButton({
  grantId,
  grantTitle,
  existingProposalId,
}: GenerateProposalButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [status, setStatus] = useState<GenerationStatus>("generating");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stillWorking, setStillWorking] = useState(false);
  const router = useRouter();
  const watchCleanupRef = useRef<(() => void) | null>(null);

  // Tear down any in-flight subscription/poll/timeout when the component
  // unmounts so we don't leak channels on navigation.
  useEffect(() => {
    return () => {
      watchCleanupRef.current?.();
    };
  }, []);

  const watchWorkflow = useCallback(
    (workflowId: string) => {
      watchCleanupRef.current?.();
      const supabase = createClient();
      let settled = false;

      const finish = (next: GenerationStatus, message?: string) => {
        if (settled) return;
        settled = true;
        watchCleanupRef.current?.();
        setStatus(next);
        if (next === "error") setErrorMessage(message ?? "Generation failed.");
        if (next === "done") {
          setTimeout(() => {
            setDialogOpen(false);
            router.refresh();
          }, 1500);
        }
      };

      const handleRow = (row: {
        status: string | null;
        error: string | null;
      } | null) => {
        if (!row) return;
        if (row.status === "completed") finish("done");
        else if (row.status === "failed")
          finish("error", row.error || "Generation failed.");
      };

      const checkOnce = async () => {
        const { data } = await supabase
          .from("workflow_executions")
          .select("status, error")
          .eq("id", workflowId)
          .maybeSingle();
        handleRow(data);
      };

      const channel = supabase
        .channel(`workflow-executions-${workflowId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "workflow_executions",
            filter: `id=eq.${workflowId}`,
          },
          (payload) => {
            handleRow(
              payload.new as { status: string | null; error: string | null },
            );
          },
        )
        .subscribe();

      // Poll fallback — the row may have flipped before the subscription
      // was live, and Realtime occasionally drops messages.
      const poll = setInterval(checkOnce, POLL_INTERVAL_MS);

      // Hard wall-clock cap. The n8n run may still finish; the user will
      // see a notification when it does.
      const timer = setTimeout(() => {
        if (settled) return;
        setStillWorking(true);
      }, WATCH_TIMEOUT_MS);

      watchCleanupRef.current = () => {
        clearInterval(poll);
        clearTimeout(timer);
        supabase.removeChannel(channel);
      };

      // Catch the case where the workflow finished before we subscribed.
      checkOnce();
    },
    [router],
  );

  const handleGenerate = useCallback(async () => {
    setErrorMessage(null);
    setStillWorking(false);
    setStatus("generating");
    setDialogOpen(true);

    try {
      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: "proposal-generation",
          grantId,
          timestamp: new Date().toISOString(),
        }),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        setStatus("error");
        setErrorMessage(result.error || "Workflow failed. Please try again.");
        return;
      }

      if (!result.workflow_id) {
        setStatus("error");
        setErrorMessage("Could not start the proposal workflow.");
        return;
      }

      watchWorkflow(result.workflow_id);
    } catch (err) {
      console.error("Error triggering workflow:", err);
      setStatus("error");
      setErrorMessage("Failed to connect. Please try again.");
    }
  }, [grantId, watchWorkflow]);

  const statusContent: Record<
    GenerationStatus,
    { icon: React.ReactNode; title: string; description: string }
  > = {
    generating: {
      icon: <Loader2 className="h-8 w-8 animate-spin text-purple-500" />,
      title: stillWorking ? "Still working..." : "Generating Proposal...",
      description: stillWorking
        ? "This is taking longer than usual. You can close this dialog — we'll send a notification when the proposal is ready."
        : `Creating a proposal for "${grantTitle}". This may take a few minutes.`,
    },
    done: {
      icon: <CheckCircle2 className="h-8 w-8 text-green-500" />,
      title: "Proposal Generated!",
      description: "Your proposal is ready.",
    },
    error: {
      icon: <XCircle className="h-8 w-8 text-red-500" />,
      title: "Generation Failed",
      description: errorMessage || "Something went wrong.",
    },
  };

  const current = statusContent[status];
  const showCloseButton = status === "error" || stillWorking;

  const handleCloseDialog = () => {
    setDialogOpen(false);
    if (status !== "done") {
      // Stop watching but leave n8n to finish; the notifications panel
      // is the source of truth once the dialog is closed.
      watchCleanupRef.current?.();
    }
  };

  const generationDialog = (
    <Dialog open={dialogOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-sm [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {current.icon}
            <DialogTitle>{current.title}</DialogTitle>
            <DialogDescription className="text-center">
              {current.description}
            </DialogDescription>
          </div>
        </DialogHeader>
        {showCloseButton && (
          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={handleCloseDialog}>
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );

  if (existingProposalId) {
    return (
      <>
        <div className="flex items-center gap-3">
          <Link href={`/proposals/${existingProposalId}`}>
            <Button variant="default">View Proposal</Button>
          </Link>
          <Button variant="outline" onClick={handleGenerate}>
            <Sparkles className="h-4 w-4 mr-2" />
            Regenerate
          </Button>
        </div>
        {generationDialog}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <Button onClick={handleGenerate}>
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Proposal
        </Button>
      </div>
      {generationDialog}
    </>
  );
}
