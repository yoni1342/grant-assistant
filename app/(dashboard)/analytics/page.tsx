import { createClient } from '@/lib/supabase/server'
import { PipelineBreakdown } from './components/pipeline-breakdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AnalyticsPage() {
  const pipelineData = await getPipelineBreakdown()

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Pipeline insights
        </p>
      </div>

      {/* Pipeline Breakdown */}
      <div className="max-w-lg">
        <PipelineBreakdown stages={pipelineData} />
      </div>
    </div>
  )
}

async function getPipelineBreakdown() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  // Get user's org_id from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return []
  }

  // Fetch all grants for org
  const { data: grants, error } = await supabase
    .from('grants')
    .select('stage')
    .eq('org_id', profile.org_id)

  if (error || !grants) {
    return []
  }

  // Group by stage client-side
  const stageCounts = new Map<string, number>()

  // Initialize all stages with 0
  const allStages = ['discovery', 'screening', 'drafting', 'closed']
  allStages.forEach(stage => stageCounts.set(stage, 0))

  // Count actual grants per stage
  grants.forEach(grant => {
    if (grant.stage) {
      const current = stageCounts.get(grant.stage) || 0
      stageCounts.set(grant.stage, current + 1)
    }
  })

  // Convert to array format
  return Array.from(stageCounts.entries()).map(([stage, count]) => ({
    stage,
    count,
  }))
}
