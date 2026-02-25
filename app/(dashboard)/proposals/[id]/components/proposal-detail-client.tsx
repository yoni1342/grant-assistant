'use client'

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Proposal content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{proposal.title || 'Untitled Proposal'}</h1>
              <Badge variant={getStatusColor(proposal.status)}>
                {proposal.status || 'draft'}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              For: {grant?.title || 'Unknown Grant'}
            </p>
          </div>

          {/* Sections */}
          <ProposalSections sections={sections} />
        </div>

        {/* Right column: Quality review and funder analysis */}
        <div className="space-y-6">
          <QualityReview
            proposalId={proposal.id}
            qualityScore={proposal.quality_score}
            qualityReview={proposal.quality_review}
          />
          <FunderAnalysis
            grantId={grant?.id}
            funderName={grant?.funder_name}
            funder={funder}
          />
        </div>
      </div>
    </div>
  )
}
