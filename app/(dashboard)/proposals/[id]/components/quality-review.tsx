'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClipboardCheck } from 'lucide-react'
import { triggerQualityReview } from '../../actions'

interface QualityReviewData {
  overall_score: number
  section_scores?: Array<{ section: string; score: number; feedback: string }>
  issues: Array<{
    type: 'jargon' | 'passive_voice' | 'vagueness' | 'alignment' | 'completeness' | 'formatting'
    severity: 'low' | 'medium' | 'high'
    text: string
    suggestion: string
    section?: string
  }>
  summary?: string
}

interface QualityReviewProps {
  proposalId: string
  qualityScore: number | null
  qualityReview: QualityReviewData | null
  embedded?: boolean
}

export function QualityReview({ proposalId, qualityScore, qualityReview, embedded }: QualityReviewProps) {
  const [triggering, setTriggering] = useState(false)

  const handleTriggerReview = async () => {
    setTriggering(true)
    await triggerQualityReview(proposalId)
    // Note: The component will update via Realtime subscription when n8n completes
    setTriggering(false)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'border-red-500'
      case 'medium':
        return 'border-yellow-500'
      case 'low':
        return 'border-gray-300'
    }
  }

  const getSeverityBadgeVariant = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const formatIssueType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const content = (
    <>
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTriggerReview}
          disabled={triggering}
        >
          <ClipboardCheck className="mr-2 h-4 w-4" />
          {triggering ? 'Running...' : 'Run Review'}
        </Button>
      </div>
      {!qualityReview ? (
        <div className="text-center py-8 text-muted-foreground space-y-4">
          <p>No quality review yet.</p>
          <p className="text-sm">Click &quot;Run Review&quot; to analyze this proposal.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="text-center space-y-2">
            <div className={`text-5xl font-bold ${getScoreColor(qualityReview.overall_score)}`}>
              {qualityReview.overall_score}
            </div>
            <p className="text-sm text-muted-foreground">Overall Quality Score</p>
          </div>

          {/* Summary */}
          {qualityReview.summary && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Summary</h4>
              <p className="text-sm text-muted-foreground">{qualityReview.summary}</p>
            </div>
          )}

          {/* Section Scores */}
          {qualityReview.section_scores && qualityReview.section_scores.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Section Scores</h4>
              <div className="grid grid-cols-2 gap-2">
                {qualityReview.section_scores.map((section, idx) => (
                  <div
                    key={idx}
                    className="border rounded-md p-2 flex items-center justify-between"
                  >
                    <span className="text-xs font-medium truncate">{section.section}</span>
                    <span className={`text-sm font-bold ${getScoreColor(section.score)}`}>
                      {section.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issues */}
          {qualityReview.issues && qualityReview.issues.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Issues Found ({qualityReview.issues.length})</h4>
              <div className="space-y-3">
                {qualityReview.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`border-l-4 ${getSeverityColor(issue.severity)} bg-muted/30 rounded-md p-3 space-y-2`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {formatIssueType(issue.type)}
                      </Badge>
                      <Badge variant={getSeverityBadgeVariant(issue.severity)} className="text-xs">
                        {issue.severity}
                      </Badge>
                      {issue.section && (
                        <span className="text-xs text-muted-foreground">{issue.section}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs">
                        <span className="font-medium">Found:</span> {issue.text}
                      </p>
                      <p className="text-xs">
                        <span className="font-medium">Suggestion:</span> {issue.suggestion}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )

  if (embedded) {
    return <div className="space-y-4">{content}</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quality Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {content}
      </CardContent>
    </Card>
  )
}
