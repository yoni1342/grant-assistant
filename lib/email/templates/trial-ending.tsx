import { Text, Section, Heading, Button } from '@react-email/components'
import EmailLayout from './layout'
import type { TrialEndingEmailParams } from '../types'

export default function TrialEndingEmail({
  fullName,
  organizationName,
  planName,
  trialEndsAt,
}: TrialEndingEmailParams) {
  const endDate = new Date(trialEndsAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <EmailLayout>
      <Heading style={h1}>Your Trial is Ending Soon</Heading>

      <Text style={paragraph}>Hi {fullName},</Text>

      <Text style={paragraph}>
        Your 7-day free trial of the <strong>{planName}</strong> plan for{' '}
        <strong>{organizationName}</strong> is ending on <strong>{endDate}</strong>.
      </Text>

      <Section style={warningBox}>
        <Text style={warningLabel}>Trial Ends</Text>
        <Text style={warningDate}>{endDate}</Text>
      </Section>

      <Text style={paragraph}>
        To continue using all {planName} features without interruption, make sure you have a
        payment method on file. If no action is taken, your account will be downgraded to the
        free Starter plan.
      </Text>

      <Section style={buttonContainer}>
        <Button href="https://fundory.ai/billing" style={button}>
          Manage Billing
        </Button>
      </Section>

      <Text style={paragraph}>
        If you have any questions about your subscription, reach out to us at{' '}
        <a href="mailto:support@fundory.ai" style={link}>
          support@fundory.ai
        </a>
        .
      </Text>

      <Text style={signature}>
        Best,
        <br />
        The Fundory Team
      </Text>
    </EmailLayout>
  )
}

const h1 = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 24px',
  lineHeight: '1.3',
}

const paragraph = {
  fontSize: '16px',
  color: '#525f7f',
  lineHeight: '26px',
  margin: '16px 0',
}

const warningBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
  border: '2px solid #f59e0b',
}

const warningLabel = {
  fontSize: '14px',
  color: '#b45309',
  margin: '0 0 8px',
  fontWeight: '500',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const warningDate = {
  fontSize: '18px',
  color: '#92400e',
  margin: '0',
  fontWeight: '600',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#0066ff',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
}

const link = {
  color: '#0066ff',
  textDecoration: 'none',
}

const signature = {
  fontSize: '16px',
  color: '#525f7f',
  lineHeight: '26px',
  margin: '32px 0 0',
}
