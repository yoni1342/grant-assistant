'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClipboardCheck, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { triggerQualityReview } from '../../actions'
import { createClient } from '@/lib/supabase/client'

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
  // The review is fire-and-forget: triggerQualityReview returns immediately,
  // n8n updates the proposals row asynchronously. We subscribe to that row so
  // the new review appears without a page refresh.
  const [liveReview, setLiveReview] = useState<QualityReviewData | null>(qualityReview)
  const [waiting, setWaiting] = useState(false)
  const baselineUpdatedAtRef = useRef<string | null>(null)
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

  const effectiveReview = liveReview ?? qualityReview

  useEffect(() => {
    setLiveReview(qualityReview)
  }, [qualityReview])

  // Realtime subscription — updates `liveReview` when n8n writes the result
  // back to the proposals row. Also clears the waiting state so the button
  // returns to normal once the review lands.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`proposal-quality-${proposalId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'proposals', filter: `id=eq.${proposalId}` },
        (payload) => {
          const row = payload.new as { quality_review?: QualityReviewData | null; updated_at?: string }
          if (row?.quality_review) {
            setLiveReview(row.quality_review)
            // Stop the spinner only when the row genuinely updated AFTER we
            // started waiting (avoids race where we get an echo of the old row).
            if (
              !baselineUpdatedAtRef.current ||
              (row.updated_at && row.updated_at > baselineUpdatedAtRef.current)
            ) {
              setWaiting(false)
            }
          }
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [proposalId])

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleTriggerReview = async () => {
    setWaiting(true)
    // Capture the current updated_at so the realtime listener can detect a
    // genuine update (not an echo) and only then stop the spinner.
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('proposals')
        .select('updated_at')
        .eq('id', proposalId)
        .single()
      baselineUpdatedAtRef.current = data?.updated_at ?? null
    } catch {
      baselineUpdatedAtRef.current = null
    }
    const result = await triggerQualityReview(proposalId)
    if (result?.error) {
      setWaiting(false)
    }
    // Safety net — if n8n never writes the row back, drop the spinner after
    // 5 minutes so the user can retry instead of being stuck in "Running...".
    setTimeout(() => setWaiting(false), 5 * 60 * 1000)
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
          disabled={waiting}
        >
          {waiting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ClipboardCheck className="mr-2 h-4 w-4" />
          )}
          {waiting ? 'Running review…' : effectiveReview ? 'Re-run Review' : 'Run Review'}
        </Button>
      </div>
      {waiting && !effectiveReview ? (
        <div className="text-center py-8 text-muted-foreground space-y-2">
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          <p className="text-sm">Analyzing proposal — this usually takes 30-60 seconds. Results will appear here automatically.</p>
        </div>
      ) : !effectiveReview ? (
        <div className="text-center py-8 text-muted-foreground space-y-4">
          <p>No quality review yet.</p>
          <p className="text-sm">Click &quot;Run Review&quot; to analyze this proposal.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overall Score + Recommendation */}
          <div className={`text-center space-y-2 rounded-lg border p-4 ${getScoreBgColor(effectiveReview.overall_score)}`}>
            <div className={`text-5xl font-bold ${getScoreColor(effectiveReview.overall_score)}`}>
              {effectiveReview.overall_score}
            </div>
            <p className="text-sm text-muted-foreground">Overall Quality Score</p>
            <div>{getRecommendationBadge(effectiveReview.overall_score, effectiveReview.recommendation)}</div>
          </div>

          {/* Ready to Submit Message */}
          {effectiveReview.overall_score >= 85 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-1">
              <p className="text-sm font-medium text-green-800">Ready to Submit</p>
              <p className="text-xs text-green-700">
                This proposal meets our quality threshold. We recommend reviewing the suggestions below to further strengthen your submission before sending.
              </p>
            </div>
          )}

          {/* Below threshold message */}
          {effectiveReview.overall_score < 85 && effectiveReview.overall_score >= 70 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 space-y-1">
              <p className="text-sm font-medium text-yellow-800">Almost There</p>
              <p className="text-xs text-yellow-700">
                This proposal is close to submission-ready. Address the suggestions below to bring it above the 85% threshold.
              </p>
            </div>
          )}

          {/* Section Scores */}
          {effectiveReview.section_scores && effectiveReview.section_scores.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Section Scores</h4>
              <div className="grid grid-cols-2 gap-2">
                {effectiveReview.section_scores.map((section, idx) => (
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
          {effectiveReview.strengths && effectiveReview.strengths.length > 0 && (
            <CollapsibleSection title="Strengths" sectionKey="strengths" count={effectiveReview.strengths.length}>
              <ul className="space-y-1">
                {effectiveReview.strengths.map((s, idx) => (
                  <li key={idx} className="text-xs text-green-700 flex gap-2">
                    <span className="shrink-0">+</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          {/* Weaknesses / Areas to Improve */}
          {effectiveReview.weaknesses && effectiveReview.weaknesses.length > 0 && (
            <CollapsibleSection title="Areas to Improve" sectionKey="weaknesses" count={effectiveReview.weaknesses.length}>
              <ul className="space-y-1">
                {effectiveReview.weaknesses.map((w, idx) => (
                  <li key={idx} className="text-xs text-orange-700 flex gap-2">
                    <span className="shrink-0">-</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          {/* Quick Wins */}
          {effectiveReview.quick_wins && effectiveReview.quick_wins.length > 0 && (
            <CollapsibleSection title="Quick Wins" sectionKey="quickWins" count={effectiveReview.quick_wins.length}>
              <ul className="space-y-1">
                {effectiveReview.quick_wins.map((qw, idx) => (
                  <li key={idx} className="text-xs flex gap-2">
                    <input type="checkbox" className="mt-0.5 shrink-0" />
                    <span>{qw}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          {/* Suggested Rewrites */}
          {effectiveReview.rewrites && effectiveReview.rewrites.length > 0 && (
            <CollapsibleSection title="Suggested Rewrites" sectionKey="rewrites" count={effectiveReview.rewrites.length}>
              <div className="space-y-3">
                {effectiveReview.rewrites.map((r, idx) => (
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
          {effectiveReview.story_suggestion && (
            <CollapsibleSection title="Story to Add" sectionKey="story">
              <p className="text-xs">{effectiveReview.story_suggestion}</p>
            </CollapsibleSection>
          )}

          {/* Improved Opening */}
          {effectiveReview.improved_opening && (
            <CollapsibleSection title="Improved Opening Paragraph" sectionKey="opening">
              <p className="text-xs italic">{effectiveReview.improved_opening}</p>
            </CollapsibleSection>
          )}

          {/* Improved Closing */}
          {effectiveReview.improved_closing && (
            <CollapsibleSection title="Improved Closing Paragraph" sectionKey="closing">
              <p className="text-xs italic">{effectiveReview.improved_closing}</p>
            </CollapsibleSection>
          )}

          {/* Issues */}
          {effectiveReview.issues && effectiveReview.issues.length > 0 && (
            <CollapsibleSection title="Issues Found" sectionKey="issues" count={effectiveReview.issues.length}>
              <div className="space-y-3">
                {effectiveReview.issues.map((issue, idx) => (
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
