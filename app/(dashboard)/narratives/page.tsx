import { getNarratives } from './actions'
import { createClient, getUserOrgId } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NarrativesListClient } from './components/narratives-list-client'
import { NarrativeDialog } from './components/narrative-dialog'
import { NewNarrativeButton } from './components/new-narrative-button'

export default async function NarrativesPage() {
  const supabase = await createClient()
  const { orgId } = await getUserOrgId(supabase)
  if (!orgId) redirect('/login')

  const { data: narratives, error: narrativesError } = await getNarratives()

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6" data-tour="narratives-area">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">Narratives</h1>
          <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
            Reusable content blocks for grant proposals
          </p>
        </div>
        <NewNarrativeButton />
      </div>

      {narrativesError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            Error loading narratives: {narrativesError}
          </p>
        </div>
      )}

      <NarrativesListClient initialNarratives={narratives || []} />
    </div>
  )
}
