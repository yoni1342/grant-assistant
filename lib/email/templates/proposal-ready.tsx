import { Text, Heading, Link as EmailLink, Section } from '@react-email/components'
import EmailLayout from './layout'
import type { ProposalReadyEmailParams } from '../types'

export default function ProposalReadyEmail({
  fullName,
  organizationName,
  proposalId,
  grantTitle,
}: ProposalReadyEmailParams) {
  return (
    <EmailLayout>
      <Heading style={h1}>Your Proposal Draft is Ready!</Heading>

      <Text style={paragraph}>Hi {fullName},</Text>

      <Text style={paragraph}>
        Great news — the proposal draft for <strong>{organizationName}</strong> has been
        generated and is ready for your review.
      </Text>

      <Section style={grantBox}>
        <Text style={grantTitleStyle}>{grantTitle}</Text>
        <Text style={grantDetail}>Status: Draft ready for review</Text>
      </Section>

      <Section style={ctaSection}>
        <EmailLink href={`https://fundory.ai/proposals/${proposalId}`} style={ctaButton}>
          Review Proposal
        </EmailLink>
      </Section>

      <Text style={paragraph}>
        We recommend reviewing and customizing the draft before submission.
        The proposal was generated based on your organization&apos;s narratives and
        the grant requirements.
      </Text>

      <Text style={paragraph}>
        If you have any questions, reach out at{' '}
        <EmailLink href="mailto:support@fundory.ai" style={link}>
          support@fundory.ai
        </EmailLink>
        .
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

const paragraph = {
  fontSize: '16px',
  color: '#525f7f',
  lineHeight: '26px',
  margin: '16px 0',
}

const grantBox = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  borderLeft: '4px solid #3b82f6',
}

const grantTitleStyle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#1e3a5f',
  margin: '0 0 8px',
}

const grantDetail = {
  fontSize: '14px',
  color: '#1e40af',
  lineHeight: '22px',
  margin: '2px 0',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const ctaButton = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
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
