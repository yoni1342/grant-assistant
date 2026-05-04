import { Heading, Section, Text } from '@react-email/components'
import EmailLayout from './layout'
import type { WelcomeEmailParams } from '../types'

export default function WelcomeEmail({ fullName, organizationName }: WelcomeEmailParams) {
  return (
    <EmailLayout preview={`${organizationName} is live on Fundory`}>
      <Text style={kicker}>▌ ACCOUNT ACTIVE</Text>

      <Heading style={h1}>You&apos;re in.</Heading>

      <Text style={paragraph}>Hi {fullName},</Text>

      <Text style={paragraph}>
        <strong>{organizationName}</strong> is live on Fundory. No waiting room — your
        dashboard is open and the grant intelligence engine is already indexing your
        opportunities.
      </Text>

      <Section style={statusBox}>
        <Text style={statusLabel}>Status</Text>
        <Text style={statusValue}>Active</Text>
      </Section>

      <Heading as="h2" style={h2}>What to do first</Heading>

      <Text style={paragraph}>
        Head to <strong>Discovery</strong> to see the grants that matched your profile, run an
        eligibility check on the ones that look promising, then drop them into your pipeline.
      </Text>

      <Text style={paragraph}>
        Need a hand? Email{' '}
        <a href="mailto:support@fundory.ai" style={link}>support@fundory.ai</a>{' '}
        and someone real will reply.
      </Text>

      <Text style={signature}>
        — The Fundory team
      </Text>
    </EmailLayout>
  )
}

const INK = '#0A0A0A'
const MUTED = '#888888'
const ACCENT = '#FF5A1F'
const BORDER = '#D8D8D4'
const CANVAS = '#F5F5F0'

const kicker = {
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '11px',
  letterSpacing: '0.32em',
  color: ACCENT,
  margin: '0 0 18px',
  textTransform: 'uppercase' as const,
}

const h1 = {
  fontFamily: '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  fontSize: '34px',
  fontWeight: 900,
  color: INK,
  letterSpacing: '-0.01em',
  margin: '0 0 22px',
  lineHeight: 1.05,
  textTransform: 'uppercase' as const,
}

const h2 = {
  fontFamily: '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  fontSize: '20px',
  fontWeight: 900,
  color: INK,
  letterSpacing: '0.01em',
  margin: '32px 0 14px',
  textTransform: 'uppercase' as const,
}

const paragraph = {
  fontSize: '15px',
  color: INK,
  lineHeight: '24px',
  margin: '14px 0',
}

const statusBox = {
  backgroundColor: CANVAS,
  border: `1px solid ${BORDER}`,
  borderLeft: `4px solid ${ACCENT}`,
  padding: '18px 20px',
  margin: '24px 0',
}

const statusLabel = {
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '10px',
  color: MUTED,
  letterSpacing: '0.32em',
  margin: '0 0 6px',
  textTransform: 'uppercase' as const,
}

const statusValue = {
  fontFamily: '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  fontSize: '22px',
  fontWeight: 900,
  color: INK,
  letterSpacing: '0.04em',
  margin: 0,
  textTransform: 'uppercase' as const,
}

const link = {
  color: ACCENT,
  textDecoration: 'none',
  fontWeight: 600,
}

const signature = {
  fontSize: '14px',
  color: MUTED,
  lineHeight: '22px',
  margin: '32px 0 0',
}
