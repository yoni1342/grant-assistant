import { Text, Heading, Link as EmailLink, Section } from '@react-email/components'
import EmailLayout from './layout'
import type { CompleteProfileEmailParams } from '../types'

export default function CompleteProfileEmail({
  fullName,
  organizationName,
  missingNarratives,
  missingBudget,
  daysSinceRegistration,
}: CompleteProfileEmailParams) {
  const isFirstReminder = daysSinceRegistration <= 4
  const isFinalReminder = daysSinceRegistration >= 12

  return (
    <EmailLayout>
      <Heading style={h1}>
        {isFinalReminder
          ? 'Final Reminder: Complete Your Profile'
          : isFirstReminder
            ? 'Complete Your Profile for Better Results'
            : "You're Missing Out on Better Grant Matches"}
      </Heading>

      <Text style={paragraph}>Hi {fullName},</Text>

      {isFirstReminder ? (
        <Text style={paragraph}>
          Thanks for registering <strong>{organizationName}</strong> on Fundory!
          To get the most accurate grant recommendations and AI-generated proposals,
          we need a bit more information about your organization.
        </Text>
      ) : isFinalReminder ? (
        <Text style={paragraph}>
          This is our last reminder — we won't send another one. Adding your
          organization's details to <strong>{organizationName}</strong> will
          significantly improve the quality of your grant matches and proposals.
        </Text>
      ) : (
        <Text style={paragraph}>
          We noticed <strong>{organizationName}</strong> is still missing some
          key information. Organizations with complete profiles get much better
          grant recommendations and higher-quality AI proposals.
        </Text>
      )}

      <Section style={missingBox}>
        <Text style={missingLabel}>What's missing</Text>
        {missingNarratives && (
          <Text style={missingItem}>
            <span style={bullet}>•</span> Narrative content (mission, impact, methods)
          </Text>
        )}
        {missingBudget && (
          <Text style={missingItem}>
            <span style={bullet}>•</span> Budget information
          </Text>
        )}
      </Section>

      <Heading as="h2" style={h2}>
        How to add this information
      </Heading>

      <Text style={paragraph}>
        You can add your organization's details in two ways:
      </Text>

      <Text style={listItem}>
        <strong>1. Upload documents</strong> — Upload your existing narrative
        documents, budgets, or annual reports in the{' '}
        <EmailLink href="https://fundory.ai/documents" style={link}>
          Documents
        </EmailLink>{' '}
        tab.
      </Text>

      <Text style={listItem}>
        <strong>2. Enter text directly</strong> — Add narrative content manually
        in the{' '}
        <EmailLink href="https://fundory.ai/narratives" style={link}>
          Narratives
        </EmailLink>{' '}
        tab, or update your budget in{' '}
        <EmailLink href="https://fundory.ai/settings" style={link}>
          Settings
        </EmailLink>
        .
      </Text>

      <Section style={ctaSection}>
        <EmailLink href="https://fundory.ai/narratives" style={ctaButton}>
          Complete Your Profile
        </EmailLink>
      </Section>

      <Text style={paragraph}>
        If you need help or have questions, reach out to us at{' '}
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

const missingBox = {
  backgroundColor: '#fff8f0',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  borderLeft: '4px solid #f59e0b',
}

const missingLabel = {
  fontSize: '14px',
  color: '#92400e',
  margin: '0 0 12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const missingItem = {
  fontSize: '15px',
  color: '#78350f',
  lineHeight: '24px',
  margin: '4px 0',
}

const bullet = {
  color: '#f59e0b',
  marginRight: '8px',
}

const listItem = {
  fontSize: '16px',
  color: '#525f7f',
  lineHeight: '26px',
  margin: '12px 0',
}

const link = {
  color: '#0066ff',
  textDecoration: 'none',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const ctaButton = {
  backgroundColor: '#0066ff',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const signature = {
  fontSize: '16px',
  color: '#525f7f',
  lineHeight: '26px',
  margin: '32px 0 0',
}
