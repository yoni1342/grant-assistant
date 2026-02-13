import { getNarratives } from './actions'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { NarrativePageClient } from './components/narrative-page-client'

export default async function NarrativesPage() {
  const supabase = await createClient()

  // Fetch narratives
  const { data: narratives, error: narrativesError } = await getNarratives()

  // Fetch grants for AI customization dropdown
  const { data: grants } = await supabase
    .from('grants')
    .select('id, title')
    .order('title', { ascending: true })

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Narratives</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable content blocks for grant proposals
          </p>
        </div>
        <NarrativePageClient
          narratives={narratives || []}
          grants={grants || []}
        />
      </div>

      {narrativesError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
          <p className="text-sm text-red-800 dark:text-red-200">
            Error loading narratives: {narrativesError}
          </p>
        </div>
      )}
    </div>
  )
}
