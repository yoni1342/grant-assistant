"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { WorkflowProgress } from '@/app/(dashboard)/pipeline/[id]/components/workflow-progress'
import { triggerAutoSubmission } from '@/app/(dashboard)/submissions/actions'
import { Upload, Loader2 } from 'lucide-react'

interface AutoSubmitButtonProps {
  grantId: string
  portalUrl: string | null
}

export function AutoSubmitButton({ grantId, portalUrl }: AutoSubmitButtonProps) {
  const [isTriggering, setIsTriggering] = useState(false)
  const [workflowId, setWorkflowId] = useState<string | null>(null)

  const handleAutoSubmit = async () => {
    if (!portalUrl) return

    setIsTriggering(true)
    const result = await triggerAutoSubmission(grantId, portalUrl)

    if (result.error) {
      console.error('Error triggering auto-submission:', result.error)
      setIsTriggering(false)
      return
    }

    if (result.workflowId) {
      setWorkflowId(result.workflowId)
    }
    setIsTriggering(false)
  }

  const isDisabled = !portalUrl || isTriggering

  const button = (
    <Button
      onClick={handleAutoSubmit}
      disabled={isDisabled}
      variant="default"
    >
      {isTriggering ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Triggering...
        </>
      ) : (
        <>
          <Upload className="mr-2 h-4 w-4" />
          Auto-Submit
        </>
      )}
    </Button>
  )

  if (!portalUrl) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>No portal URL available for this grant</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="space-y-3">
      {button}
      {workflowId && (
        <WorkflowProgress
          workflowId={workflowId}
          workflowName="Auto-submitting"
          initialStatus="running"
        />
      )}
    </div>
  )
}
