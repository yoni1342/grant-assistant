import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getSubmissionChecklist, getSubmissions } from '@/app/(dashboard)/submissions/actions'
import { SubmissionPageClient } from './components/submission-page-client'

interface SubmissionDetailPageProps {
  params: Promise<{
    grantId: string
  }>
}

export default async function SubmissionDetailPage({ params }: SubmissionDetailPageProps) {
  const { grantId } = await params
  const supabase = await createClient()

  // Get authenticated user
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

  // Fetch grant data
  const { data: grant, error: grantError } = await supabase
    .from('grants')
    .select('id, title, deadline, funder_name, source_url')
    .eq('id', grantId)
    .eq('org_id', profile.org_id)
    .single()

  if (grantError || !grant) {
    notFound()
  }

  // Fetch submission checklist
  const checklistResult = await getSubmissionChecklist(grantId)
  const checklist = checklistResult.error ? null : checklistResult.data

  // Fetch submissions history
  const submissionsResult = await getSubmissions(grantId)
  const submissions = submissionsResult.error ? [] : submissionsResult.data

  return (
    <SubmissionPageClient
      grant={grant}
      checklist={checklist}
      submissions={submissions}
    />
  )
}
