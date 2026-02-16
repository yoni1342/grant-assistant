'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface PipelineBreakdownProps {
  stages: Array<{
    stage: string
    count: number
  }>
}

// Color mapping for each stage
const stageColors: Record<string, string> = {
  discovery: 'bg-blue-500',
  screening: 'bg-yellow-500',
  drafting: 'bg-purple-500',
  submission: 'bg-orange-500',
  awarded: 'bg-green-500',
  reporting: 'bg-teal-500',
  closed: 'bg-gray-500',
}

// Badge variant mapping
const stageBadgeColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  discovery: 'default',
  screening: 'secondary',
  drafting: 'secondary',
  submission: 'secondary',
  awarded: 'default',
  reporting: 'default',
  closed: 'outline',
}

export function PipelineBreakdown({ stages }: PipelineBreakdownProps) {
  // Calculate total for percentage
  const total = stages.reduce((sum, stage) => sum + stage.count, 0)

  // Filter out stages with zero count for display
  const activeStages = stages.filter(stage => stage.count > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No grants in pipeline yet
          </p>
        ) : (
          <div className="space-y-4">
            {stages.map(({ stage, count }) => {
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0
              const colorClass = stageColors[stage] || 'bg-gray-500'
              const badgeVariant = stageBadgeColors[stage] || 'outline'

              return (
                <div key={stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                      <span className="text-sm font-medium capitalize">
                        {stage}
                      </span>
                    </div>
                    <Badge variant={badgeVariant}>{count}</Badge>
                  </div>
                  <Progress
                    value={percentage}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {percentage}% of total
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
