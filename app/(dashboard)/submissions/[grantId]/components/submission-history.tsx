"use client"

import { Badge } from '@/components/ui/badge'
import { Upload, FileCheck, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Submission {
  id: string
  confirmation_number: string | null
  submitted_at: string | null
  notes: string | null
  method: string | null
  status: string | null
}

interface SubmissionHistoryProps {
  submissions: Submission[]
}

export function SubmissionHistory({ submissions }: SubmissionHistoryProps) {
  if (!submissions || submissions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No submissions yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission, index) => {
        const isAuto = submission.method === 'auto'
        const isCompleted = submission.status === 'completed'
        const isPending = submission.status === 'pending'
        const isFailed = submission.status === 'failed'

        return (
          <div key={submission.id} className="relative">
            {/* Timeline line (not on last item) */}
            {index < submissions.length - 1 && (
              <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
            )}

            {/* Event card */}
            <div className="flex gap-3">
              {/* Icon */}
              <div className="relative flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background">
                  {isAuto ? (
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FileCheck className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-1 pb-4">
                <div className="flex items-start gap-2 flex-wrap">
                  <Badge variant={isAuto ? 'default' : 'secondary'} className="text-xs">
                    {isAuto ? 'Auto-Submitted' : 'Manual Submission'}
                  </Badge>
                  {isCompleted && (
                    <Badge variant="outline" className="text-xs text-green-600 bg-green-50 border-green-200">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Completed
                    </Badge>
                  )}
                  {isPending && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                  {isFailed && (
                    <Badge variant="destructive" className="text-xs">
                      <XCircle className="mr-1 h-3 w-3" />
                      Failed
                    </Badge>
                  )}
                </div>

                {submission.submitted_at && (
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })}
                  </p>
                )}

                {submission.confirmation_number && (
                  <p className="text-sm font-mono">
                    {submission.confirmation_number}
                  </p>
                )}

                {submission.notes && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {submission.notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
