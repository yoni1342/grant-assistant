import { notFound } from "next/navigation"
import { getNarrative } from "../actions"
import { NarrativeDetailClient } from "./components/narrative-detail-client"

export default async function NarrativeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: narrative, error } = await getNarrative(id)

  if (error || !narrative) {
    notFound()
  }

  return <NarrativeDetailClient narrative={narrative} />
}
