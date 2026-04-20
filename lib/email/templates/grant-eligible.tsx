import {
  Text,
  Link as EmailLink,
  Section,
  Row,
  Column,
  Button,
  Hr,
} from '@react-email/components'
import EmailLayout from './layout'
import type {
  GrantEligibleEmailParams,
  GrantEligibilityDimensions,
} from '../types'

const BRAND_BLUE = '#1A4FFF'
const INK = '#0A0A0A'
const SUB_INK = '#2A2A2A'
const MUTED = '#888888'
const SOFT = '#F5F5F0'
const BORDER = '#D8D8D4'
const BORDER_SOFT = '#ECECE8'
const GREEN = '#2E7D4F'
const AMBER = '#B97309'
const RED = '#C02A2A'

const DIMENSION_LABELS: Array<{
  key: keyof GrantEligibilityDimensions
  label: string
}> = [
  { key: 'mission_alignment', label: 'Mission Alignment' },
  { key: 'target_population', label: 'Target Population' },
  { key: 'service_fit', label: 'Service / Program Fit' },
  { key: 'geographic_alignment', label: 'Geographic Alignment' },
  { key: 'organizational_capacity', label: 'Org Capacity' },
]

function formatDeadline(raw: string | null): {
  display: string
  relative: string | null
  tone: 'ok' | 'warn' | 'late' | 'neutral'
} | null {
  if (!raw) return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) {
    return { display: raw, relative: null, tone: 'neutral' }
  }
  const display = d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDeadline = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const msPerDay = 24 * 60 * 60 * 1000
  const days = Math.round(
    (startOfDeadline.getTime() - startOfToday.getTime()) / msPerDay,
  )
  let relative: string
  let tone: 'ok' | 'warn' | 'late' | 'neutral'
  if (days < 0) {
    relative = `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} past due`
    tone = 'late'
  } else if (days === 0) {
    relative = 'Due today'
    tone = 'warn'
  } else if (days === 1) {
    relative = 'Due tomorrow'
    tone = 'warn'
  } else if (days <= 14) {
    relative = `${days} days remaining`
    tone = 'warn'
  } else {
    relative = `${days} days remaining`
    tone = 'ok'
  }
  return { display, relative, tone }
}

function formatAmount(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  // If it's already formatted with currency symbol / commas, keep it.
  if (/[$€£,]/.test(trimmed)) return trimmed
  // Pure numeric → format as USD.
  const num = Number(trimmed.replace(/[^0-9.-]/g, ''))
  if (!isNaN(num) && num > 0) {
    return `$${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  return trimmed
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`
}

function scoreTone(score: number | null) {
  if (score == null) return { label: 'UNSCORED', color: MUTED, bg: SOFT }
  if (score >= 80) return { label: 'STRONG MATCH', color: GREEN, bg: '#E8F2EC' }
  if (score >= 50) return { label: 'MODERATE MATCH', color: AMBER, bg: '#FBF1DE' }
  return { label: 'WEAK MATCH', color: RED, bg: '#F7E4E4' }
}

function dimensionColor(value: number): string {
  if (value >= 16) return GREEN
  if (value >= 11) return AMBER
  if (value >= 6) return '#D97706'
  return RED
}

export default function GrantEligibleEmail({
  fullName,
  organizationName,
  grantId,
  grantTitle,
  funderName,
  amount,
  deadline,
  description,
  screeningScore,
  screeningNotes,
  dimensionScores,
  concerns,
  recommendations,
  categories,
  sourceUrl,
  missingNarratives,
  missingBudget,
}: GrantEligibleEmailParams) {
  const deadlineInfo = formatDeadline(deadline)
  const formattedAmount = formatAmount(amount)
  const tone = scoreTone(screeningScore)
  const hasMissingData = missingNarratives || missingBudget
  const hasDimensions =
    !!dimensionScores &&
    DIMENSION_LABELS.some(
      ({ key }) => typeof dimensionScores?.[key] === 'number',
    )
  const hasConcerns = (concerns?.length ?? 0) > 0
  const hasRecommendations = (recommendations?.length ?? 0) > 0
  const cleanCategories =
    categories?.filter((c) => !!c && typeof c === 'string').slice(0, 8) ?? []

  const pipelineUrl = `https://fundory.ai/pipeline/${grantId}`
  const previewText = `${grantTitle} · ${
    funderName ?? 'New funder'
  }${screeningScore != null ? ` · ${screeningScore}% match` : ''}`

  return (
    <EmailLayout preview={previewText}>
      {/* Section label */}
      <Text style={kicker}>
        {screeningScore != null ? `${tone.label}` : 'ELIGIBLE GRANT'}
        {'  ·  '}
        PENDING YOUR REVIEW
      </Text>

      {/* Headline */}
      <Text style={h1}>Eligible grant ready for your review.</Text>

      <Text style={lede}>
        Hi {fullName} — we found a grant that matches{' '}
        <strong style={strong}>{organizationName}</strong> and it cleared the
        screening. Everything you need to decide is below.
      </Text>

      {/* Grant hero card */}
      <Section style={heroCard}>
        {funderName && (
          <Text style={heroFunder}>{funderName.toUpperCase()}</Text>
        )}
        <Text style={heroTitle}>{grantTitle}</Text>

        {/* Meta row: amount · deadline · score */}
        <Section style={metaGrid}>
          <Row>
            <Column style={metaCell}>
              <Text style={metaLabel}>AMOUNT</Text>
              <Text style={metaValue}>{formattedAmount ?? '—'}</Text>
            </Column>
            <Column style={metaCellMid}>
              <Text style={metaLabel}>DEADLINE</Text>
              <Text style={metaValue}>
                {deadlineInfo ? deadlineInfo.display : '—'}
              </Text>
              {deadlineInfo?.relative && (
                <Text
                  style={{
                    ...metaSub,
                    color:
                      deadlineInfo.tone === 'late'
                        ? RED
                        : deadlineInfo.tone === 'warn'
                          ? AMBER
                          : MUTED,
                  }}
                >
                  {deadlineInfo.relative}
                </Text>
              )}
            </Column>
            <Column style={metaCellRight}>
              <Text style={metaLabel}>MATCH SCORE</Text>
              <Text
                style={{
                  ...metaValue,
                  color: tone.color,
                }}
              >
                {screeningScore != null ? `${screeningScore}%` : '—'}
              </Text>
              {screeningScore != null && (
                <Text style={{ ...metaSub, color: tone.color }}>
                  {tone.label}
                </Text>
              )}
            </Column>
          </Row>
        </Section>

        {cleanCategories.length > 0 && (
          <Section style={{ marginTop: '16px' }}>
            {cleanCategories.map((cat, i) => (
              <span key={i} style={tag}>
                {cat}
              </span>
            ))}
          </Section>
        )}

        {/* Primary CTA */}
        <Section style={{ marginTop: '20px' }}>
          <Button href={pipelineUrl} style={ctaPrimary}>
            Review &amp; approve →
          </Button>
          {sourceUrl && (
            <EmailLink href={sourceUrl} style={ctaSecondary}>
              View funder announcement
            </EmailLink>
          )}
        </Section>
      </Section>

      {/* Description */}
      {description && (
        <Section style={block}>
          <Text style={sectionLabel}>ABOUT THIS OPPORTUNITY</Text>
          <Text style={body}>{truncate(description, 520)}</Text>
        </Section>
      )}

      {/* Screening summary */}
      {screeningNotes && (
        <Section style={block}>
          <Text style={sectionLabel}>SCREENING SUMMARY</Text>
          <Section style={noteBox}>
            <Text style={noteText}>{truncate(screeningNotes, 600)}</Text>
          </Section>
        </Section>
      )}

      {/* Dimension breakdown */}
      {hasDimensions && (
        <Section style={block}>
          <Text style={sectionLabel}>ELIGIBILITY BREAKDOWN</Text>
          {DIMENSION_LABELS.map(({ key, label }) => {
            const value = dimensionScores?.[key]
            if (typeof value !== 'number') return null
            const pct = Math.max(0, Math.min(100, (value / 20) * 100))
            const color = dimensionColor(value)
            return (
              <Section key={key} style={{ margin: '10px 0 0' }}>
                <Row>
                  <Column style={{ width: '60%' }}>
                    <Text style={dimLabel}>{label}</Text>
                  </Column>
                  <Column style={{ width: '40%', textAlign: 'right' }}>
                    <Text style={{ ...dimValue, color }}>{value} / 20</Text>
                  </Column>
                </Row>
                {/* Bar track */}
                <table
                  role="presentation"
                  cellPadding={0}
                  cellSpacing={0}
                  width="100%"
                  style={{
                    borderCollapse: 'collapse',
                    marginTop: '4px',
                    height: '6px',
                    backgroundColor: BORDER_SOFT,
                    borderRadius: '3px',
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          width: `${pct}%`,
                          height: '6px',
                          backgroundColor: color,
                          borderRadius: '3px',
                          fontSize: 0,
                          lineHeight: 0,
                        }}
                      >
                        &nbsp;
                      </td>
                      <td
                        style={{
                          width: `${100 - pct}%`,
                          fontSize: 0,
                          lineHeight: 0,
                        }}
                      >
                        &nbsp;
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>
            )
          })}
        </Section>
      )}

      {/* Concerns + Recommendations — side by side on desktop */}
      {(hasConcerns || hasRecommendations) && (
        <Section style={block}>
          <Row>
            {hasConcerns && (
              <Column
                style={{
                  width: hasRecommendations ? '50%' : '100%',
                  paddingRight: hasRecommendations ? '8px' : 0,
                  verticalAlign: 'top',
                }}
              >
                <Text style={sectionLabel}>CONCERNS</Text>
                <Section style={listBoxAmber}>
                  {concerns!.map((c, i) => (
                    <Text key={i} style={listItem}>
                      <span style={{ ...bullet, color: AMBER }}>—</span>
                      {c}
                    </Text>
                  ))}
                </Section>
              </Column>
            )}
            {hasRecommendations && (
              <Column
                style={{
                  width: hasConcerns ? '50%' : '100%',
                  paddingLeft: hasConcerns ? '8px' : 0,
                  verticalAlign: 'top',
                }}
              >
                <Text style={sectionLabel}>RECOMMENDATIONS</Text>
                <Section style={listBoxBlue}>
                  {recommendations!.map((r, i) => (
                    <Text key={i} style={listItem}>
                      <span style={{ ...bullet, color: BRAND_BLUE }}>—</span>
                      {r}
                    </Text>
                  ))}
                </Section>
              </Column>
            )}
          </Row>
        </Section>
      )}

      {/* Missing data callout */}
      {hasMissingData && (
        <Section style={block}>
          <Text style={sectionLabel}>BEFORE YOU SUBMIT</Text>
          <Section style={missingBox}>
            <Text style={missingHeading}>
              Your profile is missing information we use to draft proposals.
            </Text>
            {missingNarratives && (
              <Text style={missingItem}>
                <span style={{ ...bullet, color: INK }}>—</span>
                <EmailLink
                  href="https://fundory.ai/narratives"
                  style={inlineLink}
                >
                  Add narrative content
                </EmailLink>{' '}
                (mission, impact, methods) so drafts read in your voice.
              </Text>
            )}
            {missingBudget && (
              <Text style={missingItem}>
                <span style={{ ...bullet, color: INK }}>—</span>
                <EmailLink
                  href="https://fundory.ai/documents"
                  style={inlineLink}
                >
                  Upload a budget document
                </EmailLink>{' '}
                so generated proposals include realistic numbers.
              </Text>
            )}
          </Section>
        </Section>
      )}

      <Hr style={divider} />

      {/* Final CTA */}
      <Section style={{ textAlign: 'center' as const, margin: '8px 0 4px' }}>
        <Text style={closingLead}>
          Ready to move forward? Open the grant in your pipeline.
        </Text>
        <Button href={pipelineUrl} style={ctaPrimary}>
          Review &amp; approve →
        </Button>
        <Text style={closingSmall}>
          Or reply to this email and we&apos;ll help you decide —{' '}
          <EmailLink href="mailto:support@fundory.ai" style={inlineLink}>
            support@fundory.ai
          </EmailLink>
        </Text>
      </Section>
    </EmailLayout>
  )
}

// ————————————————————————————————————————————————————————
// Styles — editorial / monochrome to mirror the Fundory app.
// ————————————————————————————————————————————————————————

const kicker = {
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '10px',
  fontWeight: 400,
  color: MUTED,
  letterSpacing: '0.3em',
  textTransform: 'uppercase' as const,
  margin: '0 0 12px',
}

const h1 = {
  fontFamily:
    '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  fontSize: '40px',
  lineHeight: '1.05',
  fontWeight: 900,
  color: INK,
  margin: '0 0 20px',
  letterSpacing: '-0.01em',
  textTransform: 'none' as const,
}

const lede = {
  fontFamily: 'Barlow, Helvetica, Arial, sans-serif',
  fontSize: '16px',
  lineHeight: '26px',
  color: SUB_INK,
  margin: '0 0 28px',
}

const strong = {
  color: INK,
  fontWeight: 600,
}

const heroCard = {
  backgroundColor: SOFT,
  border: `1px solid ${BORDER}`,
  borderRadius: '6px',
  padding: '24px',
  margin: '0 0 28px',
}

const heroFunder = {
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '11px',
  color: MUTED,
  letterSpacing: '0.22em',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
}

const heroTitle = {
  fontFamily:
    '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  fontSize: '26px',
  lineHeight: '1.15',
  fontWeight: 900,
  color: INK,
  margin: '0 0 20px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.005em',
}

const metaGrid = {
  borderTop: `1px solid ${BORDER}`,
  paddingTop: '16px',
  marginTop: '4px',
}

const metaCell = {
  width: '33%',
  verticalAlign: 'top' as const,
  paddingRight: '8px',
}

const metaCellMid = {
  width: '34%',
  verticalAlign: 'top' as const,
  padding: '0 8px',
  borderLeft: `1px solid ${BORDER}`,
  borderRight: `1px solid ${BORDER}`,
}

const metaCellRight = {
  width: '33%',
  verticalAlign: 'top' as const,
  paddingLeft: '8px',
}

const metaLabel = {
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '10px',
  color: MUTED,
  letterSpacing: '0.22em',
  margin: '0 0 6px',
  textTransform: 'uppercase' as const,
}

const metaValue = {
  fontFamily:
    '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  fontSize: '22px',
  fontWeight: 900,
  color: INK,
  margin: 0,
  lineHeight: '1.1',
  textTransform: 'uppercase' as const,
}

const metaSub = {
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '10px',
  letterSpacing: '0.12em',
  margin: '4px 0 0',
  textTransform: 'uppercase' as const,
}

const tag = {
  display: 'inline-block',
  backgroundColor: '#FFFFFF',
  border: `1px solid ${BORDER}`,
  borderRadius: '3px',
  color: SUB_INK,
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '10px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  padding: '4px 8px',
  marginRight: '6px',
  marginTop: '6px',
}

const ctaPrimary = {
  backgroundColor: INK,
  borderRadius: '4px',
  color: '#FFFFFF',
  fontFamily:
    '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  fontSize: '15px',
  fontWeight: 900,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  textDecoration: 'none',
  display: 'inline-block',
  padding: '14px 26px',
  marginRight: '12px',
}

const ctaSecondary = {
  color: BRAND_BLUE,
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '11px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  textDecoration: 'none',
  display: 'inline-block',
  padding: '12px 0',
}

const block = {
  margin: '0 0 28px',
}

const sectionLabel = {
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '10px',
  color: MUTED,
  letterSpacing: '0.3em',
  textTransform: 'uppercase' as const,
  margin: '0 0 10px',
}

const body = {
  fontFamily: 'Barlow, Helvetica, Arial, sans-serif',
  fontSize: '15px',
  lineHeight: '24px',
  color: SUB_INK,
  margin: 0,
}

const noteBox = {
  backgroundColor: '#FFFFFF',
  border: `1px solid ${BORDER}`,
  borderLeft: `3px solid ${INK}`,
  borderRadius: '3px',
  padding: '14px 16px',
}

const noteText = {
  fontFamily: 'Barlow, Helvetica, Arial, sans-serif',
  fontSize: '14px',
  lineHeight: '22px',
  color: SUB_INK,
  margin: 0,
  fontStyle: 'italic' as const,
}

const dimLabel = {
  fontFamily: 'Barlow, Helvetica, Arial, sans-serif',
  fontSize: '13px',
  color: SUB_INK,
  margin: 0,
  fontWeight: 500,
}

const dimValue = {
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '12px',
  fontWeight: 700,
  margin: 0,
  letterSpacing: '0.04em',
}

const listBoxAmber = {
  backgroundColor: '#FBF6EA',
  border: `1px solid ${BORDER_SOFT}`,
  borderLeft: `3px solid ${AMBER}`,
  borderRadius: '3px',
  padding: '12px 14px',
}

const listBoxBlue = {
  backgroundColor: '#EEF1FF',
  border: `1px solid ${BORDER_SOFT}`,
  borderLeft: `3px solid ${BRAND_BLUE}`,
  borderRadius: '3px',
  padding: '12px 14px',
}

const listItem = {
  fontFamily: 'Barlow, Helvetica, Arial, sans-serif',
  fontSize: '13px',
  lineHeight: '20px',
  color: SUB_INK,
  margin: '4px 0',
}

const bullet = {
  display: 'inline-block',
  width: '14px',
  marginRight: '4px',
  fontWeight: 700,
}

const missingBox = {
  backgroundColor: '#FFFFFF',
  border: `1px solid ${BORDER}`,
  borderRadius: '6px',
  padding: '16px 18px',
}

const missingHeading = {
  fontFamily:
    '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  fontSize: '18px',
  fontWeight: 900,
  color: INK,
  margin: '0 0 10px',
  lineHeight: '1.2',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.01em',
}

const missingItem = {
  fontFamily: 'Barlow, Helvetica, Arial, sans-serif',
  fontSize: '14px',
  lineHeight: '22px',
  color: SUB_INK,
  margin: '6px 0',
}

const inlineLink = {
  color: BRAND_BLUE,
  textDecoration: 'none',
  fontWeight: 600,
}

const divider = {
  borderColor: BORDER,
  borderTop: `1px solid ${BORDER}`,
  margin: '28px 0 24px',
}

const closingLead = {
  fontFamily: 'Barlow, Helvetica, Arial, sans-serif',
  fontSize: '15px',
  color: SUB_INK,
  margin: '0 0 14px',
  lineHeight: '22px',
}

const closingSmall = {
  fontFamily: 'Barlow, Helvetica, Arial, sans-serif',
  fontSize: '13px',
  color: MUTED,
  margin: '16px 0 0',
  lineHeight: '20px',
}
