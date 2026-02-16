'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

interface AnalyticsChartsProps {
  funderData: Array<{
    funderName: string
    awards: number
    submissions: number
    successRate: number
  }>
}

const chartConfig = {
  successRate: {
    label: 'Success Rate',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig

export function AnalyticsCharts({ funderData }: AnalyticsChartsProps) {
  // Calculate totals for summary
  const totalSubmissions = funderData.reduce((sum, f) => sum + f.submissions, 0)
  const funderCount = funderData.length

  // Handle empty state
  const isEmpty = funderData.length === 0 || totalSubmissions === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Success Rate by Funder</CardTitle>
        <CardDescription>
          Percentage of submissions that resulted in awards
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <p className="text-sm text-muted-foreground text-center">
              No submission data yet. Submit grants to see success rates.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
              <BarChart
                data={funderData}
                accessibilityLayer
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="funderName"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => {
                    // Truncate long funder names
                    return value.length > 12 ? `${value.slice(0, 12)}...` : value
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={(value) => `${value}%`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, props) => (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{value}% success rate</span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="successRate"
                  fill="var(--color-successRate)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>

            {/* Summary row */}
            <div className="text-center text-sm text-muted-foreground border-t pt-4">
              Based on {totalSubmissions} submissions across {funderCount} funders
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
