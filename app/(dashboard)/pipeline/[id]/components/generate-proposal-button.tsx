"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { triggerProposalGeneration } from "@/app/(dashboard)/proposals/actions";
import { WorkflowProgress } from "./workflow-progress";
import Link from "next/link";

interface GenerateProposalButtonProps {
  grantId: string;
  grantTitle: string;
  existingProposalId?: string;
}

export function GenerateProposalButton({
  grantId,
  grantTitle,
  existingProposalId,
}: GenerateProposalButtonProps) {
  const [loading, setLoading] = useState(false);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // async function handleGenerate() {
  //   setLoading(true)
  //   setError(null)

  //   const result = await triggerProposalGeneration(grantId)

  //   setLoading(false)

  //   if (result.error) {
  //     setError(result.error)
  //   } else if (result.workflowId) {
  //     setWorkflowId(result.workflowId)
  //   }
  // }
  const handleGenerate = async () => {
    console.log("hit");
    try {
      setLoading(true);

      const response = await fetch("/api/trigger-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantId,
          timestamp: new Date().toISOString(),
        }),
      });

      const result = await response.json();

      // ✅ Just log the raw response
      console.log("n8n workflow response:", result);
    } catch (err) {
      console.error("Error triggering workflow:", err);
    } finally {
      setLoading(false);
    }
  };
  // If proposal already exists, show view link with regenerate option
  if (existingProposalId) {
    return (
      <div className="flex items-center gap-3">
        <Link href={`/proposals/${existingProposalId}`}>
          <Button variant="default">View Proposal</Button>
        </Link>
        <Button
          variant="outline"
          onClick={handleGenerate}
          disabled={loading || !!workflowId}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Regenerate
            </>
          )}
        </Button>
        {workflowId && (
          <WorkflowProgress
            workflowId={workflowId}
            workflowName="Regenerating"
            initialStatus="running"
          />
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // No existing proposal - show generate button
  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleGenerate} disabled={loading || !!workflowId}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Starting...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Proposal
          </>
        )}
      </Button>
      {workflowId && (
        <WorkflowProgress
          workflowId={workflowId}
          workflowName="Generating Proposal"
          initialStatus="running"
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
