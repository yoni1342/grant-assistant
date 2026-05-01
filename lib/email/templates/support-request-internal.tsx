import { Text, Heading, Section, Link as EmailLink } from '@react-email/components'
import EmailLayout from './layout'
import type { SupportRequestInternalEmailParams } from '../types'

export default function SupportRequestInternalEmail({
  ticketRef,
  category,
  subject,
  message,
  submitterName,
  submitterEmail,
  organizationName,
  organizationPlan,
  adminUrl,
}: SupportRequestInternalEmailParams) {
  return (
    <EmailLayout preview={`[${ticketRef}] ${subject}`}>
      <Heading style={h1}>New support request</Heading>

      <Section style={ticketBox}>
        <Text style={ticketLabel}>Ticket · {category.toUpperCase()}</Text>
        <Text style={ticketValue}>{ticketRef}</Text>
        <Text style={ticketSubject}>{subject}</Text>
      </Section>

      <Heading as="h2" style={h2}>
        From
      </Heading>
      <Text style={meta}>
        <strong>{submitterName}</strong>
        <br />
        <EmailLink href={`mailto:${submitterEmail}`} style={link}>
          {submitterEmail}
        </EmailLink>
        {organizationName && (
          <>
            <br />
            {organizationName}
            {organizationPlan ? ` · ${organizationPlan}` : ''}
          </>
        )}
      </Text>

      <Heading as="h2" style={h2}>
        Message
      </Heading>
      <Text style={quote}>{message}</Text>

      {adminUrl && (
        <Section style={ctaSection}>
          <EmailLink href={adminUrl} style={ctaButton}>
            View in admin
          </EmailLink>
        </Section>
      )}

      <Text style={replyHint}>
        Reply directly to this email — it&apos;ll go to <strong>{submitterEmail}</strong>.
      </Text>
    </EmailLayout>
  )
}

const h1 = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 24px',
  lineHeight: '1.3',
}

const h2 = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#888',
  margin: '24px 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
}

const ticketBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  padding: '20px',
  margin: '0 0 16px',
  borderLeft: '4px solid #1A4FFF',
}

const ticketLabel = {
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '11px',
  color: '#888',
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  margin: '0 0 6px',
}

const ticketValue = {
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '14px',
  color: '#1a1a1a',
  margin: '0 0 10px',
}

const ticketSubject = {
  fontSize: '17px',
  fontWeight: '600',
  color: '#1a1a1a',
  margin: '0',
  lineHeight: '1.4',
}

const meta = {
  fontSize: '15px',
  color: '#525f7f',
  lineHeight: '24px',
  margin: '0',
}

const quote = {
  fontSize: '15px',
  color: '#1a1a1a',
  lineHeight: '24px',
  margin: '0 0 16px',
  whiteSpace: 'pre-wrap' as const,
  borderLeft: '3px solid #D8D8D4',
  paddingLeft: '16px',
}

const ctaSection = {
  margin: '24px 0',
}

const ctaButton = {
  backgroundColor: '#1A4FFF',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'inline-block',
  padding: '10px 22px',
}

const link = {
  color: '#1A4FFF',
  textDecoration: 'none',
}

const replyHint = {
  fontSize: '13px',
  color: '#888',
  lineHeight: '20px',
  margin: '32px 0 0',
  fontStyle: 'italic' as const,
}
