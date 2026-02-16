'use client'

import { Trophy, DollarSign, Clock, Award } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/analytics'

interface MetricsCardsProps {
  winRate: number
  pipelineValue: number
  totalSubmissions: number
  totalAwards: number
  totalAwardAmount: number
  avgTimeToSubmission: number
}

export function MetricsCards({
  winRate,
  pipelineValue,
  totalSubmissions,
  totalAwards,
  totalAwardAmount,
  avgTimeToSubmission,
}: MetricsCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      {/* Win Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="text-sm font-medium">Win Rate</div>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{winRate}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            Awards / Submissions ({totalAwards}/{totalSubmissions})
          </p>
        </CardContent>
      </Card>

      {/* Pipeline Value */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="text-sm font-medium">Pipeline Value</div>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(pipelineValue)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Active grants in pipeline
          </p>
        </CardContent>
      </Card>

      {/* Avg Time to Submit */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="text-sm font-medium">Avg Time to Submit</div>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgTimeToSubmission} days</div>
          <p className="text-xs text-muted-foreground mt-1">
            Discovery to submission
          </p>
        </CardContent>
      </Card>

      {/* Total Awarded */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="text-sm font-medium">Total Awarded</div>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalAwardAmount)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalAwards} grants awarded
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
