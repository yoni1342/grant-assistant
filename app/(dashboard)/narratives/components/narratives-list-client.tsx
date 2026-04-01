"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { NarrativeTable, Narrative } from "./narrative-table"

interface NarrativesListClientProps {
  initialNarratives: Narrative[]
}

export function NarrativesListClient({ initialNarratives }: NarrativesListClientProps) {
  const [narratives, setNarratives] = useState<Narrative[]>(initialNarratives)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('narratives-list-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'documents' },
        (payload) => {
          const doc = payload.new as Record<string, unknown>
          if (doc.category === 'narrative') {
            const meta = doc.metadata as Record<string, unknown> | null
            setNarratives(prev => [{
              id: doc.id as string,
              org_id: doc.org_id as string,
              title: (doc.title as string) || (doc.name as string) || 'Untitled',
              content: (doc.extracted_text as string) || '',
              category: (doc.ai_category as string) || null,
              tags: (meta?.tags as string[]) || null,
              created_at: doc.created_at as string | null,
              updated_at: doc.updated_at as string | null,
            }, ...prev])
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'documents' },
        (payload) => {
          const doc = payload.new as Record<string, unknown>
          if (doc.category === 'narrative') {
            const meta = doc.metadata as Record<string, unknown> | null
            setNarratives(prev =>
              prev.map(n => n.id === doc.id ? {
                id: doc.id as string,
                org_id: doc.org_id as string,
                title: (doc.title as string) || (doc.name as string) || 'Untitled',
                content: (doc.extracted_text as string) || '',
                category: (doc.ai_category as string) || null,
                tags: (meta?.tags as string[]) || null,
                created_at: doc.created_at as string | null,
                updated_at: doc.updated_at as string | null,
              } : n)
            )
          }
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'documents' },
        (payload) => {
          setNarratives(prev => prev.filter(n => n.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return <NarrativeTable initialData={narratives} />
}
