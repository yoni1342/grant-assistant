import { Text, Heading, Link as EmailLink, Section } from '@react-email/components'
import EmailLayout from './layout'
import type { GrantEligibleEmailParams } from '../types'

export default function GrantEligibleEmail({
  fullName,
  organizationName,
  grantId,
  grantTitle,
  funderName,
  amount,
  deadline,
  screeningScore,
  missingNarratives,
  missingBudget,
}: GrantEligibleEmailParams) {
  const hasMissingData = missingNarratives || missingBudget

  return (
    <EmailLayout>
      <Heading style={h1}>Eligible Grant Found!</Heading>

      <Text style={paragraph}>Hi {fullName},</Text>

      <Text style={paragraph}>
        Great news — we found a grant that matches <strong>{organizationName}</strong> and
        it passed our eligibility screening. It's now waiting for your review.
      </Text>

      <Section style={grantBox}>
        <Text style={grantTitleStyle}>{grantTitle}</Text>
        {funderName && <Text style={grantDetail}>Funder: {funderName}</Text>}
        {amount && <Text style={grantDetail}>Amount: {amount}</Text>}
        {deadline && <Text style={grantDetail}>Deadline: {deadline}</Text>}
        {screeningScore && (
          <Text style={grantDetail}>Screening Confidence: {screeningScore}%</Text>
        )}
      </Section>

      <Section style={ctaSection}>
        <EmailLink href={`https://fundory.ai/pipeline/${grantId}`} style={ctaButton}>
          Review Grant
        </EmailLink>
      </Section>

      {hasMissingData && (
        <>
          <Section style={tipBox}>
            <Text style={tipLabel}>Improve Your Results</Text>
            <Text style={tipText}>
              Your organization profile is missing some information that could improve
              screening accuracy and help generate better proposals:
            </Text>
            {missingNarratives && (
              <Text style={tipItem}>
                <span style={bullet}>•</span>{' '}
                <EmailLink href="https://fundory.ai/narratives" style={tipLink}>
                  Add narrative content
                </EmailLink>{' '}
                (mission, impact, methods)
              </Text>
            )}
            {missingBudget && (
              <Text style={tipItem}>
                <span style={bullet}>•</span>{' '}
                <EmailLink href="https://fundory.ai/documents" style={tipLink}>
                  Add budget information
                </EmailLink>
              </Text>
            )}
          </Section>
        </>
      )}

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
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  borderLeft: '4px solid #22c55e',
}

const grantTitleStyle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#14532d',
  margin: '0 0 8px',
}

const grantDetail = {
  fontSize: '14px',
  color: '#166534',
  lineHeight: '22px',
  margin: '2px 0',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const ctaButton = {
  backgroundColor: '#22c55e',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const tipBox = {
  backgroundColor: '#fffbeb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  borderLeft: '4px solid #f59e0b',
}

const tipLabel = {
  fontSize: '14px',
  color: '#92400e',
  margin: '0 0 8px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const tipText = {
  fontSize: '14px',
  color: '#78350f',
  lineHeight: '22px',
  margin: '0 0 8px',
}

const tipItem = {
  fontSize: '14px',
  color: '#78350f',
  lineHeight: '24px',
  margin: '4px 0',
}

const bullet = {
  color: '#f59e0b',
  marginRight: '8px',
}

const tipLink = {
  color: '#0066ff',
  textDecoration: 'none',
  fontWeight: '500',
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
