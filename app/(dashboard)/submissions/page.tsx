import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { calculateUrgency, getUrgencyBadgeVariant, getUrgencyLabel } from '@/lib/utils/urgency'
import { format } from 'date-fns'

export default async function SubmissionsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Not authenticated</p>
      </div>
    )
  }

  // Get user's org_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">User profile not found</p>
      </div>
    )
  }

  // Fetch all grants for the user's org, ordered by deadline ascending (soonest first)
  const { data: grants, error } = await supabase
    .from('grants')
    .select(`
      id,
      title,
      deadline,
      funder_name,
      source_url,
      submission_checklists (
        id,
        items,
        completion_percentage
      ),
      submissions (
        id,
        status,
        method
      )
    `)
    .eq('org_id', profile.org_id)
    .order('deadline', { ascending: true, nullsFirst: false })

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">Error loading grants: {error.message}</p>
      </div>
    )
  }

  // Empty state
  if (!grants || grants.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Submissions</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Track submission progress and deadlines for all grants in your pipeline.
        </p>
        <div className="mt-8 text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">No grants in your pipeline. Add grants to start tracking submissions.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Submissions</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Track submission progress and deadlines for all grants in your pipeline.
      </p>

      <div className="mt-6 border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Grant Title</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Deadline</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Urgency</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Checklist</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {grants.map((grant) => {
              // Calculate urgency from deadline
              const urgencyLevel = grant.deadline ? calculateUrgency(new Date(grant.deadline)) : null
              const urgencyVariant = urgencyLevel ? getUrgencyBadgeVariant(urgencyLevel) : 'outline'
              const urgencyLabel = urgencyLevel ? getUrgencyLabel(urgencyLevel) : 'No deadline'

              // Get checklist data
              const checklist = grant.submission_checklists?.[0]
              const checklistItems = checklist?.items as Array<{ label: string, completed: boolean }> | undefined
              const totalItems = checklistItems?.length || 0
              const completedItems = checklistItems?.filter(item => item.completed).length || 0
              const checklistText = checklist
                ? `${completedItems}/${totalItems} items`
                : 'No checklist'

              // Get submission status
              const submittedSubmissions = grant.submissions?.filter(s => s.status === 'completed')
              const submissionStatus = submittedSubmissions && submittedSubmissions.length > 0
                ? 'Submitted'
                : 'Not submitted'
              const submissionVariant = submittedSubmissions && submittedSubmissions.length > 0
                ? 'default'
                : 'outline'

              return (
                <tr key={grant.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/submissions/${grant.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {grant.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {grant.deadline ? format(new Date(grant.deadline), 'MMM d, yyyy') : 'No deadline'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={urgencyVariant}
                      className={urgencyLevel === 'urgent' ? 'bg-yellow-500 text-white hover:bg-yellow-600' : ''}
                    >
                      {urgencyLabel}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {checklistText}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={submissionVariant}>
                      {submissionStatus}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
