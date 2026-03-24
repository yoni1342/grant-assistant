'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClipboardCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { triggerQualityReview } from '../../actions'

interface RewriteSuggestion {
  original: string
  improved: string
  reason: string
}

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
  recommendation?: string
  strengths?: string[]
  weaknesses?: string[]
  rewrites?: RewriteSuggestion[]
  quick_wins?: string[]
  story_suggestion?: string | null
  improved_opening?: string | null
  improved_closing?: string | null
}

interface QualityReviewProps {
  proposalId: string
  qualityScore: number | null
  qualityReview: QualityReviewData | null
  embedded?: boolean
}

export function QualityReview({ proposalId, qualityReview, embedded }: QualityReviewProps) {
  const [triggering, setTriggering] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    strengths: true,
    weaknesses: true,
    quickWins: true,
    rewrites: false,
    issues: false,
    story: false,
    opening: false,
    closing: false,
  })

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleTriggerReview = async () => {
    setTriggering(true)
    await triggerQualityReview(proposalId)
    setTriggering(false)
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 85) return 'bg-green-50 border-green-200'
    if (score >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
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

  const getRecommendationBadge = (score: number, recommendation?: string) => {
    if (score >= 85) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          {recommendation || 'READY TO SUBMIT'}
        </Badge>
      )
    }
    if (score >= 70) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          {recommendation || 'MINOR TWEAKS SUGGESTED'}
        </Badge>
      )
    }
    if (score >= 50) {
      return (
        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
          {recommendation || 'REVISION RECOMMENDED'}
        </Badge>
      )
    }
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        {recommendation || 'MAJOR REVISION NEEDED'}
      </Badge>
    )
  }

  const CollapsibleSection = ({ title, sectionKey, count, children }: {
    title: string
    sectionKey: string
    count?: number
    children: React.ReactNode
  }) => (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <span className="text-sm font-medium">
          {title} {count !== undefined && <span className="text-muted-foreground">({count})</span>}
        </span>
        {expandedSections[sectionKey] ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expandedSections[sectionKey] && (
        <div className="px-3 py-2 space-y-2">{children}</div>
      )}
    </div>
  )

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
        <div className="space-y-4">
          {/* Overall Score + Recommendation */}
          <div className={`text-center space-y-2 rounded-lg border p-4 ${getScoreBgColor(qualityReview.overall_score)}`}>
            <div className={`text-5xl font-bold ${getScoreColor(qualityReview.overall_score)}`}>
              {qualityReview.overall_score}
            </div>
            <p className="text-sm text-muted-foreground">Overall Quality Score</p>
            <div>{getRecommendationBadge(qualityReview.overall_score, qualityReview.recommendation)}</div>
          </div>

          {/* Ready to Submit Message */}
          {qualityReview.overall_score >= 85 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-1">
              <p className="text-sm font-medium text-green-800">Ready to Submit</p>
              <p className="text-xs text-green-700">
                This proposal meets our quality threshold. We recommend reviewing the suggestions below to further strengthen your submission before sending.
              </p>
            </div>
          )}

          {/* Below threshold message */}
          {qualityReview.overall_score < 85 && qualityReview.overall_score >= 70 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 space-y-1">
              <p className="text-sm font-medium text-yellow-800">Almost There</p>
              <p className="text-xs text-yellow-700">
                This proposal is close to submission-ready. Address the suggestions below to bring it above the 85% threshold.
              </p>
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

          {/* Strengths */}
          {qualityReview.strengths && qualityReview.strengths.length > 0 && (
            <CollapsibleSection title="Strengths" sectionKey="strengths" count={qualityReview.strengths.length}>
              <ul className="space-y-1">
                {qualityReview.strengths.map((s, idx) => (
                  <li key={idx} className="text-xs text-green-700 flex gap-2">
                    <span className="shrink-0">+</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          {/* Weaknesses / Areas to Improve */}
          {qualityReview.weaknesses && qualityReview.weaknesses.length > 0 && (
            <CollapsibleSection title="Areas to Improve" sectionKey="weaknesses" count={qualityReview.weaknesses.length}>
              <ul className="space-y-1">
                {qualityReview.weaknesses.map((w, idx) => (
                  <li key={idx} className="text-xs text-orange-700 flex gap-2">
                    <span className="shrink-0">-</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          {/* Quick Wins */}
          {qualityReview.quick_wins && qualityReview.quick_wins.length > 0 && (
            <CollapsibleSection title="Quick Wins" sectionKey="quickWins" count={qualityReview.quick_wins.length}>
              <ul className="space-y-1">
                {qualityReview.quick_wins.map((qw, idx) => (
                  <li key={idx} className="text-xs flex gap-2">
                    <input type="checkbox" className="mt-0.5 shrink-0" />
                    <span>{qw}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          {/* Suggested Rewrites */}
          {qualityReview.rewrites && qualityReview.rewrites.length > 0 && (
            <CollapsibleSection title="Suggested Rewrites" sectionKey="rewrites" count={qualityReview.rewrites.length}>
              <div className="space-y-3">
                {qualityReview.rewrites.map((r, idx) => (
                  <div key={idx} className="space-y-1 border-l-2 border-blue-300 pl-2">
                    <p className="text-xs">
                      <span className="font-medium text-red-600">Before:</span>{' '}
                      <span className="text-muted-foreground">&quot;{r.original}&quot;</span>
                    </p>
                    <p className="text-xs">
                      <span className="font-medium text-green-600">After:</span>{' '}
                      <span>&quot;{r.improved}&quot;</span>
                    </p>
                    <p className="text-xs text-muted-foreground italic">{r.reason}</p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Story Suggestion */}
          {qualityReview.story_suggestion && (
            <CollapsibleSection title="Story to Add" sectionKey="story">
              <p className="text-xs">{qualityReview.story_suggestion}</p>
            </CollapsibleSection>
          )}

          {/* Improved Opening */}
          {qualityReview.improved_opening && (
            <CollapsibleSection title="Improved Opening Paragraph" sectionKey="opening">
              <p className="text-xs italic">{qualityReview.improved_opening}</p>
            </CollapsibleSection>
          )}

          {/* Improved Closing */}
          {qualityReview.improved_closing && (
            <CollapsibleSection title="Improved Closing Paragraph" sectionKey="closing">
              <p className="text-xs italic">{qualityReview.improved_closing}</p>
            </CollapsibleSection>
          )}

          {/* Issues */}
          {qualityReview.issues && qualityReview.issues.length > 0 && (
            <CollapsibleSection title="Issues Found" sectionKey="issues" count={qualityReview.issues.length}>
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
            </CollapsibleSection>
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
