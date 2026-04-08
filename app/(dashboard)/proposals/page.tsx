import { ProposalsPageClient } from "./components/proposals-page-client"
import { getProposals } from "./actions"

export default async function ProposalsPage() {
  const { data: proposals } = await getProposals()

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6" data-tour="proposals-area">
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
