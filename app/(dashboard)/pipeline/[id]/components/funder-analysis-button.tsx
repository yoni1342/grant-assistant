"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Search } from "lucide-react"
import { triggerFunderAnalysis } from "@/app/(dashboard)/proposals/actions"
import { WorkflowProgress } from "./workflow-progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface FunderAnalysisButtonProps {
  grantId: string
  funderName?: string
  ein?: string
}

export function FunderAnalysisButton({
  grantId,
  funderName,
  ein,
}: FunderAnalysisButtonProps) {
  const [loading, setLoading] = useState(false)
  const [workflowId, setWorkflowId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const disabled = !funderName || loading || !!workflowId

  async function handleAnalyze() {
    if (!funderName) return

    setLoading(true)
    setError(null)

    const result = await triggerFunderAnalysis(grantId, funderName, ein)

    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else if (result.workflowId) {
      setWorkflowId(result.workflowId)
    }
  }

  const button = (
    <Button
      variant="outline"
      onClick={handleAnalyze}
      disabled={disabled}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Starting...
        </>
      ) : (
        <>
          <Search className="h-4 w-4 mr-2" />
          Analyze Funder
        </>
      )}
    </Button>
  )

  return (
    <div className="flex items-center gap-3">
      {!funderName ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {button}
            </TooltipTrigger>
            <TooltipContent>
              <p>Add a funder name first</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}
      {workflowId && (
        <WorkflowProgress
          workflowId={workflowId}
          workflowName="Analyzing Funder"
          initialStatus="running"
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
