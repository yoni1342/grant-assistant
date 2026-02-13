'use client'

import { useState } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown } from "lucide-react"
import { SectionEditor } from "./section-editor"
import { reorderSections } from "../../actions"

interface Section {
  id: string
  title: string
  content: string | null
  sort_order: number | null
}

interface ProposalSectionsProps {
  sections: Section[]
  onSectionsChange?: (sections: Section[]) => void
}

export function ProposalSections({ sections, onSectionsChange }: ProposalSectionsProps) {
  const [reordering, setReordering] = useState(false)

  // Sort sections by sort_order
  const sortedSections = [...sections].sort((a, b) => {
    const orderA = a.sort_order ?? 0
    const orderB = b.sort_order ?? 0
    return orderA - orderB
  })

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    if (reordering) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= sortedSections.length) return

    setReordering(true)

    // Swap sort_order values
    const newSections = [...sortedSections]
    const temp = newSections[index].sort_order
    newSections[index].sort_order = newSections[newIndex].sort_order
    newSections[newIndex].sort_order = temp

    // Update local state immediately
    if (onSectionsChange) {
      onSectionsChange(newSections)
    }

    // Call server action
    await reorderSections(
      newSections.map((s) => ({
        id: s.id,
        sort_order: s.sort_order ?? 0,
      }))
    )

    setReordering(false)
  }

  if (sortedSections.length === 0) {
    return (
      <div className="border rounded-md p-8 text-center text-muted-foreground">
        No sections yet. Proposal sections will appear here after generation completes.
      </div>
    )
  }

  // Get all section IDs for defaultValue (expand all by default)
  const allSectionIds = sortedSections.map((s) => `section-${s.id}`)

  return (
    <Accordion type="multiple" defaultValue={allSectionIds} className="space-y-4">
      {sortedSections.map((section, index) => (
        <AccordionItem
          key={section.id}
          value={`section-${section.id}`}
          className="border rounded-md px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <span className="font-medium">{section.title}</span>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={index === 0 || reordering}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReorder(index, 'up')
                  }}
                  className="h-8 w-8 p-0"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={index === sortedSections.length - 1 || reordering}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReorder(index, 'down')
                  }}
                  className="h-8 w-8 p-0"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <SectionEditor
              sectionId={section.id}
              initialContent={section.content || ''}
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
