import { createClient } from "@/lib/supabase/server"
import { ProposalsPageClient } from "./components/proposals-page-client"
import { getProposals } from "./actions"

export default async function ProposalsPage() {
  const { data: proposals } = await getProposals()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Proposals</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          View and manage all your grant proposals.
        </p>
      </div>

      <ProposalsPageClient initialProposals={proposals} />
    </div>
  )
}
