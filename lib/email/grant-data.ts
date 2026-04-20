import type { GrantEligibilityDimensions } from './types'

type GrantLike = {
  description?: string | null
  eligibility?: unknown
  screening_notes?: string | null
  concerns?: string[] | null
  recommendations?: unknown
  categories?: unknown
  source_url?: string | null
}

/**
 * Extract the extended fields the grant-eligible email wants from a raw grant row.
 * Normalizes the JSON columns (eligibility, recommendations, categories) into the
 * typed shapes the template expects.
 */
export function extractGrantEligibleFields(grant: GrantLike): {
  description: string | null
  screeningNotes: string | null
  dimensionScores: GrantEligibilityDimensions | null
  concerns: string[] | null
  recommendations: string[] | null
  categories: string[] | null
  sourceUrl: string | null
} {
  const eligibility = parseJson(grant.eligibility) as
    | { dimension_scores?: Record<string, number | null | undefined> }
    | null

  const dimensionScores = eligibility?.dimension_scores
    ? {
        mission_alignment: numOrNull(eligibility.dimension_scores.mission_alignment),
        target_population: numOrNull(eligibility.dimension_scores.target_population),
        service_fit: numOrNull(eligibility.dimension_scores.service_fit),
        geographic_alignment: numOrNull(
          eligibility.dimension_scores.geographic_alignment,
        ),
        organizational_capacity: numOrNull(
          eligibility.dimension_scores.organizational_capacity,
        ),
      }
    : null

  const recommendationsRaw = parseJson(grant.recommendations)
  const recommendations = Array.isArray(recommendationsRaw)
    ? recommendationsRaw
        .map((r) => (typeof r === 'string' ? r : (r as { text?: string })?.text))
        .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
    : null

  const categoriesRaw = parseJson(grant.categories)
  const categories = Array.isArray(categoriesRaw)
    ? categoriesRaw
        .map((c) =>
          typeof c === 'string' ? c : (c as { name?: string })?.name,
        )
        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    : null

  return {
    description: grant.description?.trim() || null,
    screeningNotes: grant.screening_notes?.trim() || null,
    dimensionScores,
    concerns: (grant.concerns ?? null)?.filter((c) => !!c && c.trim()) || null,
    recommendations: recommendations && recommendations.length ? recommendations : null,
    categories: categories && categories.length ? categories : null,
    sourceUrl: grant.source_url ?? null,
  }
}

function parseJson(raw: unknown): unknown {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  return raw
}

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}
