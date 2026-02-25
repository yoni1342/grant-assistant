'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Building2 } from 'lucide-react'
import { triggerFunderAnalysis } from '../../actions'

interface FunderData {
  id: string
  name: string
  ein: string | null
  strategy_brief: string | null
  giving_patterns: {
    focus_areas?: string[]
    avg_grant_size?: number
    total_giving?: number
    geographic_focus?: string[]
  } | null
  priorities: {
    current?: string[]
    emerging?: string[]
  } | null
  submission_preferences: {
    format?: string
    timeline?: string
    contact?: string
    tips?: string[]
  } | null
  propublica_data: {
    name?: string
    ein?: string
    revenue?: number
    assets?: number
    ntee_code?: string
    filings?: Array<{
      tax_period: string
      totrevenue: number
      totfuncexpns: number
    }>
  } | null
}

interface FunderAnalysisProps {
  grantId: string
  funderName: string | null
  funder: FunderData | null
}

export function FunderAnalysis({ grantId, funderName, funder }: FunderAnalysisProps) {
  const [analyzing, setAnalyzing] = useState(false)

  const handleAnalyzeFunder = async () => {
    if (!funderName) return

    setAnalyzing(true)
    await triggerFunderAnalysis(grantId, funderName)
    // Note: The parent component will update via Realtime subscription when n8n completes
    setAnalyzing(false)
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    })
  }

  // No funder name at all
  if (!funderName) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Funder Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No funder information available for this grant.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Have funder name but no analysis data yet
  if (!funder) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Funder Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4 space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <p className="font-medium">{funderName}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              No funder analysis yet.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyzeFunder}
              disabled={analyzing}
            >
              {analyzing ? 'Analyzing...' : 'Analyze Funder'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Have funder data - display it
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Funder Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Funder Header */}
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{funder.name}</h3>
            {funder.ein && (
              <p className="text-sm text-muted-foreground">EIN: {funder.ein}</p>
            )}
          </div>

          {/* Strategy Brief */}
          {funder.strategy_brief && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Strategy Brief</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {funder.strategy_brief}
                </p>
              </div>
            </>
          )}

          {/* Giving Patterns */}
          {funder.giving_patterns && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Giving Patterns</h4>
                <div className="space-y-2">
                  {funder.giving_patterns.focus_areas && funder.giving_patterns.focus_areas.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Focus Areas</p>
                      <div className="flex flex-wrap gap-1">
                        {funder.giving_patterns.focus_areas.map((area, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {funder.giving_patterns.avg_grant_size && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Avg Grant Size:</span>{' '}
                      <span className="font-medium">{formatCurrency(funder.giving_patterns.avg_grant_size)}</span>
                    </div>
                  )}
                  {funder.giving_patterns.total_giving && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Total Giving:</span>{' '}
                      <span className="font-medium">{formatCurrency(funder.giving_patterns.total_giving)}</span>
                    </div>
                  )}
                  {funder.giving_patterns.geographic_focus && funder.giving_patterns.geographic_focus.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Geographic Focus</p>
                      <div className="flex flex-wrap gap-1">
                        {funder.giving_patterns.geographic_focus.map((geo, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {geo}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Priorities */}
          {funder.priorities && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Priorities</h4>
                {funder.priorities.current && funder.priorities.current.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Current</p>
                    <ul className="list-disc list-inside text-sm space-y-0.5">
                      {funder.priorities.current.map((priority, idx) => (
                        <li key={idx}>{priority}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {funder.priorities.emerging && funder.priorities.emerging.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Emerging</p>
                    <ul className="list-disc list-inside text-sm space-y-0.5">
                      {funder.priorities.emerging.map((priority, idx) => (
                        <li key={idx}>{priority}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}

        {/* Submission Preferences */}
          {funder.submission_preferences && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Submission Preferences</h4>
                <div className="space-y-2 text-sm">
                  {funder.submission_preferences.format && (
                    <div>
                      <span className="text-muted-foreground">Format:</span>{' '}
                      {funder.submission_preferences.format}
                    </div>
                  )}
                  {funder.submission_preferences.timeline && (
                    <div>
                      <span className="text-muted-foreground">Timeline:</span>{' '}
                      {funder.submission_preferences.timeline}
                    </div>
                  )}
                  {funder.submission_preferences.contact && (
                    <div>
                      <span className="text-muted-foreground">Contact:</span>{' '}
                      {funder.submission_preferences.contact}
                    </div>
                  )}
                  {funder.submission_preferences.tips && funder.submission_preferences.tips.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Tips:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {funder.submission_preferences.tips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ProPublica 990 Data */}
      {funder.propublica_data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">ProPublica 990 Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funder.propublica_data.name && (
              <div className="text-sm">
                <span className="text-muted-foreground">Organization:</span>{' '}
                <span className="font-medium">{funder.propublica_data.name}</span>
              </div>
            )}
            {funder.propublica_data.revenue && (
              <div className="text-sm">
                <span className="text-muted-foreground">Revenue:</span>{' '}
                <span className="font-medium">{formatCurrency(funder.propublica_data.revenue)}</span>
              </div>
            )}
            {funder.propublica_data.assets && (
              <div className="text-sm">
                <span className="text-muted-foreground">Assets:</span>{' '}
                <span className="font-medium">{formatCurrency(funder.propublica_data.assets)}</span>
              </div>
            )}
            {funder.propublica_data.ntee_code && (
              <div className="text-sm">
                <span className="text-muted-foreground">NTEE Code:</span>{' '}
                <span className="font-medium">{funder.propublica_data.ntee_code}</span>
              </div>
            )}
            {funder.propublica_data.filings && funder.propublica_data.filings.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Filing History</p>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 font-medium">Tax Period</th>
                        <th className="text-right p-2 font-medium">Revenue</th>
                        <th className="text-right p-2 font-medium">Expenses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funder.propublica_data.filings.map((filing, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{filing.tax_period}</td>
                          <td className="text-right p-2">{formatCurrency(filing.totrevenue)}</td>
                          <td className="text-right p-2">{formatCurrency(filing.totfuncexpns)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
