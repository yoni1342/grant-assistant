import { Heading, Section, Text } from '@react-email/components'
import EmailLayout from './layout'
import type { SignupOtpEmailParams } from '../types'

export default function SignupOtpEmail({
  fullName,
  code,
  expiresInMinutes,
}: SignupOtpEmailParams) {
  return (
    <EmailLayout preview={`Your Fundory verification code is ${code}`}>
      <Text style={kicker}>▌ EMAIL VERIFICATION</Text>

      <Heading style={h1}>One step before you&apos;re in.</Heading>

      <Text style={paragraph}>Hi {fullName},</Text>

      <Text style={paragraph}>
        To finish setting up your Fundory account we need to confirm this is your email
        address. Enter the code below in the verification screen — it&apos;s good for the next{' '}
        {expiresInMinutes} minutes.
      </Text>

      <Section style={codeBox}>
        <Text style={codeLabel}>Verification code</Text>
        <Text style={codeValue}>{code}</Text>
      </Section>

      <Text style={smallParagraph}>
        Didn&apos;t request this? You can ignore this email — without the code, your account
        won&apos;t be created.
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

const paragraph = {
  fontSize: '15px',
  color: INK,
  lineHeight: '24px',
  margin: '14px 0',
}

const smallParagraph = {
  fontSize: '13px',
  color: MUTED,
  lineHeight: '20px',
  margin: '24px 0 0',
}

const codeBox = {
  backgroundColor: CANVAS,
  border: `1px solid ${BORDER}`,
  borderRadius: '6px',
  padding: '24px 20px',
  margin: '28px 0',
  textAlign: 'center' as const,
}

const codeLabel = {
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '10px',
  color: MUTED,
  letterSpacing: '0.32em',
  margin: '0 0 14px',
  textTransform: 'uppercase' as const,
}

const codeValue = {
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '40px',
  fontWeight: 700,
  color: INK,
  letterSpacing: '0.32em',
  margin: 0,
  lineHeight: 1,
}

const signature = {
  fontSize: '14px',
  color: MUTED,
  lineHeight: '22px',
  margin: '32px 0 0',
}
