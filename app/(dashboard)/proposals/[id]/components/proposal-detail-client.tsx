'use client'

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, Loader2, Pencil, Save, RotateCcw } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { ProposalSections, ProposalSectionsHandle } from "./proposal-sections"
import { useRef } from "react"

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ProposalDetailClientProps {
  proposal: any
  sections: any[]
  grant: any
  funder: any
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function ProposalDetailClient({
  proposal: initialProposal,
  sections: initialSections,
  grant,
  funder,
}: ProposalDetailClientProps) {
  const [proposal, setProposal] = useState(initialProposal)
  const [sections, setSections] = useState(initialSections)
  const sectionsRef = useRef<ProposalSectionsHandle>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [, forceRender] = useState(0)

  // Force re-render when edit state changes so we pick up isEditing/isSaving from the ref
  const triggerRender = useCallback(() => forceRender(n => n + 1), [])

  const handleExportPdf = useCallback(async () => {
    if (!sectionsRef.current) return
    setIsExporting(true)
    try {
      await sectionsRef.current.exportPdf()
      toast.success('PDF exported successfully')
    } catch {
      toast.error('Failed to export PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }, [])

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
            {/* Edit / Save / Reset */}
            {sectionsRef.current?.isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={sectionsRef.current?.isSaving}
                  onClick={() => { sectionsRef.current?.resetEdit(); triggerRender() }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={sectionsRef.current?.isSaving}
                  onClick={async () => { await sectionsRef.current?.saveEdit(); triggerRender() }}
                >
                  {sectionsRef.current?.isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {sectionsRef.current?.isSaving ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={sections.length === 0}
                onClick={() => { sectionsRef.current?.startEdit(); triggerRender() }}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}

            {/* Export PDF */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={isExporting || sections.length === 0}
              onClick={handleExportPdf}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Sections */}
      <ProposalSections ref={sectionsRef} sections={sections} proposalId={proposal.id} proposalTitle={proposal.title} />
    </div>
  )
}
