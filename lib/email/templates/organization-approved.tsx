import { Text, Section, Heading, Button } from '@react-email/components'
import EmailLayout from './layout'
import type { OrganizationApprovedEmailParams } from '../types'

export default function OrganizationApprovedEmail({
  fullName,
  organizationName,
  approvedAt,
}: OrganizationApprovedEmailParams) {
  const approvedDate = new Date(approvedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <EmailLayout>
      <Heading style={h1}>🎉 Congratulations!</Heading>

      <Text style={paragraph}>Hi {fullName},</Text>

      <Text style={paragraph}>
        Great news! Your organization <strong>{organizationName}</strong> has been approved and is
        now active on Fundory.
      </Text>

      <Section style={approvalBox}>
        <Text style={approvalLabel}>Approved On</Text>
        <Text style={approvalDate}>{approvedDate}</Text>
      </Section>

      <Section style={buttonContainer}>
        <Button href="https://fundory.ai/dashboard" style={button}>
          Get Started
        </Button>
      </Section>

      <Heading as="h2" style={h2}>
        What you can do now
      </Heading>

      <Section style={featureList}>
        <Text style={featureItem}>
          <strong>Search for grants</strong> - Discover funding opportunities tailored to your
          organization
        </Text>
        <Text style={featureItem}>
          <strong>Track applications</strong> - Manage your grant application pipeline in one place
        </Text>
        <Text style={featureItem}>
          <strong>Get AI assistance</strong> - Use our AI tools to help with grant writing and
          research
        </Text>
      </Section>

      <Text style={paragraph}>
        If you need any help getting started, our support team is here for you at{' '}
        <a href="mailto:support@fundory.ai" style={link}>
          support@fundory.ai
        </a>
        .
      </Text>

      <Text style={signature}>
        Welcome aboard!
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

const approvalBox = {
  backgroundColor: '#e6f7ed',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
  border: '2px solid #10b981',
}

const approvalLabel = {
  fontSize: '14px',
  color: '#059669',
  margin: '0 0 8px',
  fontWeight: '500',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const approvalDate = {
  fontSize: '18px',
  color: '#047857',
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

const featureList = {
  margin: '16px 0',
}

const featureItem = {
  fontSize: '16px',
  color: '#525f7f',
  lineHeight: '26px',
  margin: '12px 0',
  paddingLeft: '16px',
  position: 'relative' as const,
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
