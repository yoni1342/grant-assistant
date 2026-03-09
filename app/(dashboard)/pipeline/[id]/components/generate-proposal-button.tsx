"use client";

import { useState, useCallback } from "react";
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

interface GenerateProposalButtonProps {
  grantId: string;
  grantTitle: string;
  existingProposalId?: string;
}

type GenerationStatus = "generating" | "done" | "error";

export function GenerateProposalButton({
  grantId,
  grantTitle,
  existingProposalId,
}: GenerateProposalButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [status, setStatus] = useState<GenerationStatus>("generating");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = useCallback(async () => {
    setErrorMessage(null);
    setStatus("generating");
    setDialogOpen(true);

    try {
      const response = await fetch("/api/trigger-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantId,
          timestamp: new Date().toISOString(),
        }),
      });

      const result = await response.json();
      console.log("n8n workflow response:", result);

      if (!response.ok || result.success === false) {
        setStatus("error");
        setErrorMessage(result.error || "Workflow failed. Please try again.");
        return;
      }

      setStatus("done");
      setTimeout(() => {
        setDialogOpen(false);
        router.refresh();
      }, 2000);
    } catch (err) {
      console.error("Error triggering workflow:", err);
      setStatus("error");
      setErrorMessage("Failed to connect. Please try again.");
    }
  }, [grantId, router]);

  const statusContent: Record<
    GenerationStatus,
    { icon: React.ReactNode; title: string; description: string }
  > = {
    generating: {
      icon: <Loader2 className="h-8 w-8 animate-spin text-purple-500" />,
      title: "Generating Proposal...",
      description: `Creating a proposal for "${grantTitle}". This may take a minute.`,
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
        {status === "error" && (
          <DialogFooter className="sm:justify-center">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
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
