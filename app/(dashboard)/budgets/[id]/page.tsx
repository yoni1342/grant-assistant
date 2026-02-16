import { notFound } from 'next/navigation'
import { getBudget } from '../actions'
import { BudgetDetailClient } from './components/budget-detail-client'

interface BudgetDetailPageProps {
  params: {
    id: string
  }
}

export default async function BudgetDetailPage({ params }: BudgetDetailPageProps) {
  const { data, error } = await getBudget(params.id)

  if (error || !data) {
    notFound()
  }

  return (
    <BudgetDetailClient
      budget={data.budget}
      lineItems={data.lineItems}
      grant={data.grant}
    />
  )
}
