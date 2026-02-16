import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getAnalytics, getSuccessRateByFunder } from './actions'
import { MetricsCards } from './components/metrics-cards'
import { AnalyticsCharts } from './components/analytics-charts'
import { PipelineBreakdown } from './components/pipeline-breakdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AnalyticsPage() {
  // Fetch analytics data server-side in parallel
  const [analyticsResult, funderDataResult, pipelineData] = await Promise.all([
    getAnalytics(),
    getSuccessRateByFunder(),
    getPipelineBreakdown(),
  ])

  if (analyticsResult.error) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Error loading analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {analyticsResult.error}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const analytics = analyticsResult.data!
  const funderData = funderDataResult.data || []

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Performance metrics and pipeline insights
        </p>
      </div>

      {/* Metrics Cards */}
      <MetricsCards
        winRate={analytics.winRate}
        pipelineValue={analytics.pipelineValue}
        totalSubmissions={analytics.totalSubmissions}
        totalAwards={analytics.totalAwards}
        totalAwardAmount={analytics.totalAwardAmount}
        avgTimeToSubmission={analytics.avgTimeToSubmission}
      />

      {/* Charts and Pipeline Breakdown in 2-column grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsCharts funderData={funderData} />
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
  const allStages = ['discovery', 'screening', 'drafting', 'submission', 'awarded', 'reporting', 'closed']
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
