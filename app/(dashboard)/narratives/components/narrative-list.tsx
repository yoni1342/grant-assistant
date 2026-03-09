'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/supabase/database.types'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil, Trash2, Sparkles, Search } from 'lucide-react'
import { deleteNarrative } from '../actions'
import { formatDistanceToNow } from 'date-fns'

type Narrative = Tables<'narratives'>

type Grant = {
  id: string
  title: string
}

interface NarrativeListProps {
  initialData: Narrative[]
  grants: Grant[]
  onEditClick: (narrative: Narrative) => void
  onAICustomizeClick: (narrative: Narrative) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  mission: 'Mission',
  impact: 'Impact',
  methods: 'Methods',
  evaluation: 'Evaluation',
  sustainability: 'Sustainability',
  capacity: 'Capacity',
  budget_narrative: 'Budget Narrative',
  other: 'Other',
}

const CATEGORY_COLORS: Record<string, string> = {
  mission: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  impact: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  methods: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  evaluation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  sustainability: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  capacity: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  budget_narrative: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
}

export function NarrativeList({ initialData, grants, onEditClick, onAICustomizeClick }: NarrativeListProps) {
  const [narratives, setNarratives] = useState<Narrative[]>(initialData)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('narratives-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'narratives' },
        (payload) => {
          setNarratives((prev) => [payload.new as Narrative, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'narratives' },
        (payload) => {
          setNarratives((prev) =>
            prev.map((n) => (n.id === payload.new.id ? (payload.new as Narrative) : n))
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'narratives' },
        (payload) => {
          setNarratives((prev) => prev.filter((n) => n.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return

    const result = await deleteNarrative(id)
    if (result.error) {
      alert(`Failed to delete: ${result.error}`)
    }
  }

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const filteredNarratives = narratives.filter((narrative) => {
    const matchesSearch = narrative.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || narrative.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  if (narratives.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No narratives yet. Create your first narrative block to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search narratives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cards */}
      {filteredNarratives.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No narratives match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredNarratives.map((narrative) => {
            const plainText = stripHtml(narrative.content)
            const preview = plainText.slice(0, 150)
            const hasMore = plainText.length > 150

            return (
              <Card key={narrative.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-snug line-clamp-1 flex-1">
                      {narrative.title}
                    </h3>
                    {narrative.category && (
                      <Badge
                        variant="secondary"
                        className={`shrink-0 ${CATEGORY_COLORS[narrative.category]}`}
                      >
                        {CATEGORY_LABELS[narrative.category]}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 pb-2">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {preview}
                    {hasMore && '...'}
                  </p>

                  {narrative.tags && narrative.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {narrative.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="border-t pt-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(
                      new Date(narrative.updated_at || narrative.created_at || ''),
                      { addSuffix: true }
                    )}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onEditClick(narrative)}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onAICustomizeClick(narrative)}
                      title="AI Customize"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                      onClick={() => handleDelete(narrative.id, narrative.title)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
