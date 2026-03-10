import { ProposalsPageClient } from "./components/proposals-page-client"
import { getProposals } from "./actions"

export default async function ProposalsPage() {
  const { data: proposals } = await getProposals()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">Proposals</h1>
        <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
          View and manage all your grant proposals
        </p>
      </div>

      <ProposalsPageClient initialProposals={proposals} />
    </div>
  )
}
