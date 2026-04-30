import { Text, Section, Heading, Button } from '@react-email/components'
import EmailLayout from './layout'
import type { InviteMemberEmailParams } from '../types'

export default function InviteMemberEmail({
  fullName,
  inviterName,
  organizationName,
  inviteUrl,
  role,
}: InviteMemberEmailParams) {
  const greetingName = fullName?.trim() ? fullName : 'there'
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)

  return (
    <EmailLayout>
      <Heading style={h1}>You&apos;re invited to join {organizationName}</Heading>

      <Text style={paragraph}>Hi {greetingName},</Text>

      <Text style={paragraph}>
        <strong>{inviterName}</strong> invited you to collaborate with{' '}
        <strong>{organizationName}</strong> on Fundory — your team&apos;s AI-powered grant
        assistant.
      </Text>

      <Section style={statusBox}>
        <Text style={statusLabel}>Your role</Text>
        <Text style={statusValue}>{roleLabel}</Text>
      </Section>

      <Section style={ctaSection}>
        <Button href={inviteUrl} style={ctaButton}>
          Accept invitation
        </Button>
      </Section>

      <Text style={paragraph}>
        Or paste this link into your browser:
      </Text>
      <Text style={linkUrl}>{inviteUrl}</Text>

      <Heading as="h2" style={h2}>
        What you&apos;ll be able to do
      </Heading>

      <Text style={paragraph}>
        Once you accept, you&apos;ll be able to discover funding opportunities, work on
        proposals, and manage your organization&apos;s narrative library together with the rest
        of the team.
      </Text>

      <Text style={paragraph}>
        If you weren&apos;t expecting this invitation, you can safely ignore this email — the
        link will eventually expire.
      </Text>

      <Text style={paragraph}>
        Questions? Reach us at{' '}
        <a href="mailto:support@fundory.ai" style={link}>
          support@fundory.ai
        </a>
        .
      </Text>

      <Text style={signature}>
        Welcome aboard,
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

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const ctaButton = {
  backgroundColor: '#0066ff',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 28px',
  textDecoration: 'none',
}

const linkUrl = {
  fontSize: '13px',
  color: '#0066ff',
  wordBreak: 'break-all' as const,
  backgroundColor: '#f6f9fc',
  border: '1px solid #e6ebf1',
  borderRadius: '6px',
  padding: '12px',
  margin: '8px 0 24px',
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
