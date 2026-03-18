import { Text, Section, Heading } from '@react-email/components'
import EmailLayout from './layout'
import type { WelcomeEmailParams } from '../types'

export default function WelcomeEmail({ fullName, organizationName }: WelcomeEmailParams) {
  return (
    <EmailLayout>
      <Heading style={h1}>Welcome to Fundory!</Heading>

      <Text style={paragraph}>Hi {fullName},</Text>

      <Text style={paragraph}>
        Thank you for registering <strong>{organizationName}</strong> on Fundory, your AI-powered
        grant assistant.
      </Text>

      <Section style={statusBox}>
        <Text style={statusLabel}>Application Status</Text>
        <Text style={statusValue}>Pending Review</Text>
      </Section>

      <Heading as="h2" style={h2}>
        What happens next?
      </Heading>

      <Text style={paragraph}>
        Our team is currently reviewing your organization's registration. This typically takes
        24-48 hours. Once approved, you'll receive another email with instructions on how to get
        started.
      </Text>

      <Text style={paragraph}>
        In the meantime, if you have any questions or need assistance, please don't hesitate to
        reach out to our support team at{' '}
        <a href="mailto:support@fundory.ai" style={link}>
          support@fundory.ai
        </a>
        .
      </Text>

      <Text style={paragraph}>
        We're excited to help you discover and manage grant opportunities!
      </Text>

      <Text style={signature}>
        Best regards,
        <br />
        The Fundory Team
      </Text>
    </EmailLayout>
  )
}

// Styles
const h1 = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 24px',
  lineHeight: '1.3',
}

const h2 = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#1a1a1a',
  margin: '32px 0 16px',
  lineHeight: '1.4',
}

const paragraph = {
  fontSize: '16px',
  color: '#525f7f',
  lineHeight: '26px',
  margin: '16px 0',
}

const statusBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const statusLabel = {
  fontSize: '14px',
  color: '#8898aa',
  margin: '0 0 8px',
  fontWeight: '500',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const statusValue = {
  fontSize: '18px',
  color: '#0066ff',
  margin: '0',
  fontWeight: '600',
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
