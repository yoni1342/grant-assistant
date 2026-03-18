import { Text, Section, Heading, Button } from '@react-email/components'
import EmailLayout from './layout'
import type { OrganizationRejectedEmailParams } from '../types'

export default function OrganizationRejectedEmail({
  fullName,
  organizationName,
  rejectionReason,
  rejectedAt,
}: OrganizationRejectedEmailParams) {
  const rejectedDate = new Date(rejectedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <EmailLayout>
      <Heading style={h1}>Update on Your Application</Heading>

      <Text style={paragraph}>Hi {fullName},</Text>

      <Text style={paragraph}>
        Thank you for your interest in Fundory. After reviewing your application for{' '}
        <strong>{organizationName}</strong>, we regret to inform you that we are unable to approve
        it at this time.
      </Text>

      {rejectionReason && (
        <Section style={reasonBox}>
          <Text style={reasonLabel}>Reason</Text>
          <Text style={reasonText}>{rejectionReason}</Text>
        </Section>
      )}

      <Heading as="h2" style={h2}>
        What are your next steps?
      </Heading>

      <Text style={paragraph}>
        If you believe this decision was made in error or if your circumstances have changed, you
        are welcome to contact our support team to discuss your application.
      </Text>

      <Section style={buttonContainer}>
        <Button href="mailto:support@fundory.ai" style={button}>
          Contact Support
        </Button>
      </Section>

      <Text style={paragraph}>
        We appreciate your understanding and wish you the best in your grant-seeking endeavors.
      </Text>

      <Text style={signature}>
        Sincerely,
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

const reasonBox = {
  backgroundColor: '#fef3f2',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '2px solid #fca5a5',
}

const reasonLabel = {
  fontSize: '14px',
  color: '#dc2626',
  margin: '0 0 8px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const reasonText = {
  fontSize: '16px',
  color: '#991b1b',
  margin: '0',
  lineHeight: '24px',
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

const signature = {
  fontSize: '16px',
  color: '#525f7f',
  lineHeight: '26px',
  margin: '32px 0 0',
}
