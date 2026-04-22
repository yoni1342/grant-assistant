import { createClient } from '@/lib/supabase/server'
import { NewAwardClient } from './new-award-client'

export default async function NewAwardPage() {
  const supabase = await createClient()

  // Fetch grants for grant selector
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Not authenticated</div>
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return <div>User profile or organization not found</div>
  }

  const { data: grants } = await supabase
    .from('grants_full')
    .select('id, title')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })

  const normalizedGrants = (grants || [])
    .filter((g): g is { id: string; title: string } => !!g.id && !!g.title)

  return (
    <NewAwardClient
      grants={normalizedGrants}
    />
  )
}
