import { notFound } from 'next/navigation'
import { getAward } from '../actions'
import { AwardDetailClient } from './components/award-detail-client'

export default async function AwardDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const result = await getAward(params.id)

  if (!result.data) {
    notFound()
  }

  const { award, reports, grant } = result.data

  return (
    <AwardDetailClient
      award={award}
      reports={reports}
      grant={grant}
    />
  )
}
