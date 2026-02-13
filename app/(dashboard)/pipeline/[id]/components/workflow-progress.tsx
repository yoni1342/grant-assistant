"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

interface WorkflowProgressProps {
  workflowId: string
  workflowName: string
  initialStatus: 'pending' | 'running' | 'completed' | 'failed'
}

export function WorkflowProgress({
  workflowId,
  workflowName,
  initialStatus,
}: WorkflowProgressProps) {
  const [status, setStatus] = useState<'pending' | 'running' | 'completed' | 'failed'>(initialStatus)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`workflow-${workflowId}`)
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workflow_executions',
          filter: `id=eq.${workflowId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as 'pending' | 'running' | 'completed' | 'failed'
          setStatus(newStatus)

          // Refresh page data when workflow completes
          if (newStatus === 'completed') {
            router.refresh()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workflowId, router])

  // Status badge variants
  if (status === 'running') {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        {workflowName}...
      </Badge>
    )
  }

  if (status === 'completed') {
    return (
      <Badge className="gap-1 text-green-600 bg-green-50 border-green-200">
        <CheckCircle2 className="h-3 w-3" />
        Complete
      </Badge>
    )
  }

  if (status === 'failed') {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    )
  }

  // pending
  return (
    <Badge variant="secondary">
      Queued
    </Badge>
  )
}
