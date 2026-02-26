'use client'

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ArrowLeft, ClipboardCheck, Building2 } from "lucide-react"
import Link from "next/link"
import { ProposalSections } from "./proposal-sections"
import { QualityReview } from "./quality-review"
import { FunderAnalysis } from "./funder-analysis"

interface ProposalDetailClientProps {
  proposal: any
  sections: any[]
  grant: any
  funder: any
}

export function ProposalDetailClient({
  proposal: initialProposal,
  sections: initialSections,
  grant,
  funder,
}: ProposalDetailClientProps) {
  const [proposal, setProposal] = useState(initialProposal)
  const [sections, setSections] = useState(initialSections)

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to proposal updates (for quality review results)
    const proposalChannel = supabase
      .channel(`proposal:${proposal.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'proposals',
          filter: `id=eq.${proposal.id}`,
        },
        (payload) => {
          setProposal(payload.new)
        }
      )
      .subscribe()

    // Subscribe to proposal sections (for new sections from n8n)
    const sectionsChannel = supabase
      .channel(`sections:${proposal.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposal_sections',
          filter: `proposal_id=eq.${proposal.id}`,
        },
        async () => {
          // Refetch sections when they change
          const { data } = await supabase
            .from('proposal_sections')
            .select('*')
            .eq('proposal_id', proposal.id)
            .order('sort_order', { ascending: true })

          if (data) {
            setSections(data)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(proposalChannel)
      supabase.removeChannel(sectionsChannel)
    }
  }, [proposal.id])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary'
      case 'generating':
        return 'default'
      case 'ready':
        return 'default'
      case 'submitted':
        return 'default'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/proposals">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Proposals
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">{proposal.title || 'Untitled Proposal'}</h1>
          <Badge variant={getStatusColor(proposal.status)}>
            {proposal.status || 'draft'}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-muted-foreground">
            For: {grant?.title || 'Unknown Grant'}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            {/* Quality Review Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Quality Review
                  {proposal.quality_score != null && (
                    <Badge variant={proposal.quality_score >= 80 ? 'default' : proposal.quality_score >= 60 ? 'secondary' : 'destructive'} className="ml-1 text-xs">
                      {proposal.quality_score}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Quality Review</DialogTitle>
                </DialogHeader>
                <QualityReview
                  proposalId={proposal.id}
                  qualityScore={proposal.quality_score}
                  qualityReview={proposal.quality_review}
                  embedded
                />
              </DialogContent>
            </Dialog>

            {/* Funder Analysis Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Funder Analysis
                  {funder && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      Available
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Funder Analysis</DialogTitle>
                </DialogHeader>
                <FunderAnalysis
                  grantId={grant?.id}
                  funderName={grant?.funder_name}
                  funder={funder}
                  embedded
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Sections */}
      <ProposalSections sections={sections} proposalId={proposal.id} />
    </div>
  )
}
