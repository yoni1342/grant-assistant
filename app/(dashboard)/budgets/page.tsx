import { createClient } from '@/lib/supabase/server'
import { getBudgets } from './actions'
import { BudgetPageClient } from './components/budget-page-client'

export default async function BudgetsPage() {
  const { data: budgets } = await getBudgets()

  return <BudgetPageClient initialBudgets={budgets} />
}
