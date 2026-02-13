"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ProposalTable, Proposal } from "./proposal-table"

interface ProposalsPageClientProps {
  initialProposals: Proposal[]
}

export function ProposalsPageClient({ initialProposals }: ProposalsPageClientProps) {
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals)

  // Realtime subscription for live updates
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('proposal-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'proposals' },
        (payload) => {
          // Add the new proposal to the top
          setProposals(prev => [payload.new as Proposal, ...prev])
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'proposals' },
        (payload) => {
          // Update the proposal in place
          setProposals(prev => prev.map(proposal =>
            proposal.id === payload.new.id ? (payload.new as Proposal) : proposal
          ))
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'proposals' },
        (payload) => {
          // Remove the deleted proposal
          setProposals(prev => prev.filter(proposal => proposal.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return <ProposalTable initialData={proposals} />
}
