import { getAwards } from './actions'
import { AwardsPageClient } from './components/awards-page-client'

export default async function AwardsPage() {
  const { data: awards } = await getAwards()

  return <AwardsPageClient initialAwards={awards} />
}
