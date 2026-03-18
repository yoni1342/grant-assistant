import { getNarratives } from './actions'
import { createClient, getUserOrgId } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NarrativePageClient } from './components/narrative-page-client'

export default async function NarrativesPage() {
  const supabase = await createClient()
  const { orgId } = await getUserOrgId(supabase)
  if (!orgId) redirect('/login')

  // Fetch narratives
  const { data: narratives, error: narrativesError } = await getNarratives()

  return (
    <div className="p-6 space-y-6">
      {narrativesError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            Error loading narratives: {narrativesError}
          </p>
        </div>
      )}

      <NarrativePageClient
        narratives={narratives || []}
        grants={[]}
      />
    </div>
  )
}
