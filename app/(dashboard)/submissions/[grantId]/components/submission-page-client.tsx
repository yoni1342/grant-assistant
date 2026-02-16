"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UrgencyBadge } from './urgency-badge'
import { Button } from '@/components/ui/button'
import { WorkflowProgress } from '@/app/(dashboard)/pipeline/[id]/components/workflow-progress'
import { generateChecklist } from '@/app/(dashboard)/submissions/actions'
import { Loader2 } from 'lucide-react'

interface SubmissionPageClientProps {
  grant: {
    id: string
    title: string
    deadline: string | null
    funder_name: string | null
    source_url: string | null
  }
  checklist: {
    id: string
    items: unknown
    completion_percentage: number | null
  } | null
  submissions: Array<{
    id: string
    confirmation_number: string | null
    submitted_at: string | null
    notes: string | null
    method: string | null
    status: string | null
  }>
}

export function SubmissionPageClient({ grant, checklist, submissions }: SubmissionPageClientProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [workflowId, setWorkflowId] = useState<string | null>(null)

  // Realtime subscriptions for checklist and submissions updates
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`grant-${grant.id}-submission`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submission_checklists',
          filter: `grant_id=eq.${grant.id}`,
        },
        () => {
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `grant_id=eq.${grant.id}`,
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [grant.id, router])

  const handleGenerateChecklist = async () => {
    setIsGenerating(true)
    const result = await generateChecklist(grant.id)

    if (result.error) {
      console.error('Error generating checklist:', result.error)
      setIsGenerating(false)
      return
    }

    if (result.workflowId) {
      setWorkflowId(result.workflowId)
    }
    setIsGenerating(false)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{grant.title}</h1>
            {grant.funder_name && (
              <p className="mt-1 text-sm text-muted-foreground">{grant.funder_name}</p>
            )}
          </div>
          {grant.deadline && (
            <UrgencyBadge deadline={grant.deadline} />
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Checklist and Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Checklist Section */}
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Submission Checklist</h2>

            {checklist ? (
              <div>
                {/* Checklist component will go here in Task 2 */}
                <p className="text-sm text-muted-foreground">Checklist component placeholder</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  No checklist generated yet. Generate a checklist to track submission requirements.
                </p>
                {workflowId ? (
                  <WorkflowProgress
                    workflowId={workflowId}
                    workflowName="Generating checklist"
                    initialStatus="running"
                  />
                ) : (
                  <Button onClick={handleGenerateChecklist} disabled={isGenerating}>
                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Checklist
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Actions Section */}
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Submit Grant</h2>
            <div className="space-y-4">
              {/* Auto-submit button component will go here in Task 2 */}
              <p className="text-sm text-muted-foreground">Auto-submit button placeholder</p>

              {/* Manual submission form component will go here in Task 2 */}
              <p className="text-sm text-muted-foreground">Manual submission form placeholder</p>
            </div>
          </div>
        </div>

        {/* Right column: Submission History */}
        <div className="lg:col-span-1">
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Submission History</h2>
            {/* Submission history component will go here in Task 2 */}
            <p className="text-sm text-muted-foreground">Submission history placeholder</p>
          </div>
        </div>
      </div>
    </div>
  )
}
