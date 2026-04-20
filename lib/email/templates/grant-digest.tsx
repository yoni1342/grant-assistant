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
import type { GrantDigestEmailParams, GrantDigestItem } from '../types'

const BRAND_BLUE = '#1A4FFF'
const INK = '#0A0A0A'
const SUB_INK = '#2A2A2A'
const MUTED = '#888888'
const SOFT = '#F5F5F0'
const BORDER = '#D8D8D4'
const GREEN = '#2E7D4F'
const AMBER = '#B97309'
const RED = '#C02A2A'

function formatDeadline(raw: string | null | undefined): {
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const now = new Date()
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const days = Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000))
  let relative: string
  let tone: 'ok' | 'warn' | 'late' | 'neutral'
  if (days < 0) {
    relative = `${Math.abs(days)}d past due`
    tone = 'late'
  } else if (days === 0) {
    relative = 'Due today'
    tone = 'warn'
  } else if (days === 1) {
    relative = 'Due tomorrow'
    tone = 'warn'
  } else if (days <= 14) {
    relative = `${days}d left`
    tone = 'warn'
  } else {
    relative = `${days}d left`
    tone = 'ok'
  }
  return { display, relative, tone }
}

function formatAmount(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = String(raw).trim()
  if (!trimmed) return null
  if (/[$€£,]/.test(trimmed)) return trimmed
  const num = Number(trimmed.replace(/[^0-9.-]/g, ''))
  if (!isNaN(num) && num > 0) {
    return `$${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  return trimmed
}

function scoreTone(score: number | null | undefined) {
  if (score == null) return { color: MUTED, label: '—' }
  if (score >= 80) return { color: GREEN, label: `${score}%` }
  if (score >= 50) return { color: AMBER, label: `${score}%` }
  return { color: RED, label: `${score}%` }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`
}

export default function GrantDigestEmail({
  fullName,
  organizationName,
  grants,
}: GrantDigestEmailParams) {
  const count = grants.length
  const pipelineUrl = 'https://fundory.ai/pipeline'
  const previewText = `${count} eligible grant${count === 1 ? '' : 's'} ready for review — ${grants[0]?.title ?? ''}`

  return (
    <EmailLayout preview={previewText}>
      <Text style={kicker}>
        DIGEST · {count} ELIGIBLE GRANT{count === 1 ? '' : 'S'} · PENDING YOUR REVIEW
      </Text>

      <Text style={h1}>
        {count} new grant{count === 1 ? '' : 's'} matched {organizationName}.
      </Text>

      <Text style={lede}>
        Hi {fullName} — screening finished for {count === 1 ? 'a new grant' : `${count} new grants`} that matched{' '}
        <strong style={strong}>{organizationName}</strong>. Each one is in your
        pipeline, waiting for your call.
      </Text>

      {/* Grant rows */}
      <Section style={list}>
        {grants.map((g, i) => (
          <GrantRow key={g.grantId} grant={g} isLast={i === grants.length - 1} />
        ))}
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: 'center' as const, margin: '8px 0 4px' }}>
        <Button href={pipelineUrl} style={ctaPrimary}>
          Open pipeline →
        </Button>
        <Text style={closingSmall}>
          Tight on time? Reply to this email and we&apos;ll help you prioritize —{' '}
          <EmailLink href="mailto:support@fundory.ai" style={inlineLink}>
            support@fundory.ai
          </EmailLink>
        </Text>
      </Section>

      <Hr style={divider} />

      <Text style={footnote}>
        You&apos;re getting one digest every 30 minutes when new grants clear
        screening. No new grants, no email.
      </Text>
    </EmailLayout>
  )
}

function GrantRow({ grant, isLast }: { grant: GrantDigestItem; isLast: boolean }) {
  const deadlineInfo = formatDeadline(grant.deadline)
  const formattedAmount = formatAmount(grant.amount)
  const tone = scoreTone(grant.screeningScore)
  const deadlineToneColor =
    deadlineInfo?.tone === 'late'
      ? RED
      : deadlineInfo?.tone === 'warn'
        ? AMBER
        : MUTED

  return (
    <Section
      style={{
        ...rowBox,
        borderBottom: isLast ? 'none' : `1px solid ${BORDER}`,
      }}
    >
      {/* Top row: funder + score pill */}
      <Row>
        <Column style={{ verticalAlign: 'top' as const, width: '75%' }}>
          {grant.funderName && (
            <Text style={rowFunder}>{grant.funderName.toUpperCase()}</Text>
          )}
        </Column>
        <Column
          style={{
            verticalAlign: 'top' as const,
            width: '25%',
            textAlign: 'right' as const,
          }}
        >
          <span
            style={{
              ...scorePill,
              color: tone.color,
              borderColor: tone.color,
            }}
          >
            {tone.label}
          </span>
        </Column>
      </Row>

      {/* Title */}
      <Text style={rowTitle}>
        <EmailLink
          href={`https://fundory.ai/pipeline/${grant.grantId}`}
          style={rowTitleLink}
        >
          {grant.title}
        </EmailLink>
      </Text>

      {/* Optional 1-line description */}
      {grant.description && (
        <Text style={rowDesc}>{truncate(grant.description, 180)}</Text>
      )}

      {/* Meta row */}
      <Row style={{ marginTop: '10px' }}>
        <Column style={metaCellLeft}>
          <Text style={metaLabel}>AMOUNT</Text>
          <Text style={metaValue}>{formattedAmount ?? '—'}</Text>
        </Column>
        <Column style={metaCellRight}>
          <Text style={metaLabel}>DEADLINE</Text>
          <Text style={metaValue}>
            {deadlineInfo ? deadlineInfo.display : '—'}
          </Text>
          {deadlineInfo?.relative && (
            <Text style={{ ...metaSub, color: deadlineToneColor }}>
              {deadlineInfo.relative}
            </Text>
          )}
        </Column>
      </Row>

      <Section style={{ marginTop: '10px' }}>
        <EmailLink
          href={`https://fundory.ai/pipeline/${grant.grantId}`}
          style={rowAction}
        >
          Review this grant →
        </EmailLink>
      </Section>
    </Section>
  )
}

// ————————————————————————————————————————————————————————
// Styles
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
  fontFamily: '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  fontSize: '40px',
  lineHeight: '1.05',
  fontWeight: 900,
  color: INK,
  margin: '0 0 20px',
  letterSpacing: '-0.01em',
}

const lede = {
  fontFamily: 'Barlow, Helvetica, Arial, sans-serif',
  fontSize: '16px',
  lineHeight: '26px',
  color: SUB_INK,
  margin: '0 0 24px',
}

const strong = { color: INK, fontWeight: 600 }

const list = {
  backgroundColor: '#FFFFFF',
  border: `1px solid ${BORDER}`,
  borderRadius: '6px',
  padding: 0,
  margin: '0 0 28px',
}

const rowBox = {
  backgroundColor: SOFT,
  padding: '18px 20px',
}

const rowFunder = {
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '10px',
  color: MUTED,
  letterSpacing: '0.22em',
  margin: '0 0 4px',
  textTransform: 'uppercase' as const,
}

const rowTitle = {
  fontFamily: '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  fontSize: '22px',
  fontWeight: 900,
  color: INK,
  margin: '0 0 8px',
  lineHeight: '1.15',
  textTransform: 'uppercase' as const,
}

const rowTitleLink = {
  color: INK,
  textDecoration: 'none',
}

const rowDesc = {
  fontFamily: 'Barlow, Helvetica, Arial, sans-serif',
  fontSize: '14px',
  lineHeight: '21px',
  color: SUB_INK,
  margin: 0,
}

const scorePill = {
  display: 'inline-block',
  border: `1px solid ${BORDER}`,
  borderRadius: '99px',
  padding: '3px 10px',
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '11px',
  letterSpacing: '0.12em',
  fontWeight: 700,
  backgroundColor: '#FFFFFF',
}

const metaCellLeft = {
  width: '50%',
  verticalAlign: 'top' as const,
  paddingRight: '8px',
  borderRight: `1px solid ${BORDER}`,
}

const metaCellRight = {
  width: '50%',
  verticalAlign: 'top' as const,
  paddingLeft: '12px',
}

const metaLabel = {
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '9px',
  color: MUTED,
  letterSpacing: '0.22em',
  margin: '0 0 4px',
  textTransform: 'uppercase' as const,
}

const metaValue = {
  fontFamily: '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  fontSize: '18px',
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
  margin: '3px 0 0',
  textTransform: 'uppercase' as const,
}

const rowAction = {
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '11px',
  letterSpacing: '0.18em',
  color: BRAND_BLUE,
  textTransform: 'uppercase' as const,
  textDecoration: 'none',
  fontWeight: 700,
}

const ctaPrimary = {
  backgroundColor: INK,
  borderRadius: '4px',
  color: '#FFFFFF',
  fontFamily: '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  fontSize: '15px',
  fontWeight: 900,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  textDecoration: 'none',
  display: 'inline-block',
  padding: '14px 26px',
}

const closingSmall = {
  fontFamily: 'Barlow, Helvetica, Arial, sans-serif',
  fontSize: '13px',
  color: MUTED,
  margin: '16px 0 0',
  lineHeight: '20px',
}

const inlineLink = {
  color: BRAND_BLUE,
  textDecoration: 'none',
  fontWeight: 600,
}

const divider = {
  borderColor: BORDER,
  borderTop: `1px solid ${BORDER}`,
  margin: '24px 0 20px',
}

const footnote = {
  fontFamily: 'Barlow, Helvetica, Arial, sans-serif',
  fontSize: '12px',
  color: MUTED,
  lineHeight: '18px',
  margin: 0,
  textAlign: 'center' as const,
}
