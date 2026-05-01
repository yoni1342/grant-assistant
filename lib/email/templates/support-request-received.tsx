import { Text, Heading, Section, Link as EmailLink } from '@react-email/components'
import EmailLayout from './layout'
import type { SupportRequestReceivedEmailParams } from '../types'

export default function SupportRequestReceivedEmail({
  fullName,
  ticketRef,
  subject,
  message,
}: SupportRequestReceivedEmailParams) {
  return (
    <EmailLayout preview={`We received your support request (${ticketRef})`}>
      <Heading style={h1}>We&apos;ve got your message</Heading>

      <Text style={paragraph}>Hi {fullName},</Text>

      <Text style={paragraph}>
        Thanks for reaching out. Our support team has received your request and will reply by
        email shortly. You can simply reply to this thread once we respond.
      </Text>

      <Section style={ticketBox}>
        <Text style={ticketLabel}>Ticket</Text>
        <Text style={ticketValue}>{ticketRef}</Text>
        <Text style={ticketSubject}>{subject}</Text>
      </Section>

      <Heading as="h2" style={h2}>
        Your message
      </Heading>
      <Text style={quote}>{message}</Text>

      <Text style={paragraph}>
        Need to add something? Just reply to this email — it&apos;ll attach to the same ticket.
      </Text>

      <Text style={signature}>
        — The Fundory Team
        <br />
        <EmailLink href="mailto:support@fundory.ai" style={link}>
          support@fundory.ai
        </EmailLink>
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
  fontSize: '16px',
  fontWeight: '600',
  color: '#1a1a1a',
  margin: '32px 0 12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

const paragraph = {
  fontSize: '16px',
  color: '#525f7f',
  lineHeight: '26px',
  margin: '16px 0',
}

const ticketBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
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

const quote = {
  fontSize: '15px',
  color: '#525f7f',
  lineHeight: '24px',
  margin: '0 0 16px',
  whiteSpace: 'pre-wrap' as const,
  borderLeft: '3px solid #D8D8D4',
  paddingLeft: '16px',
}

const link = {
  color: '#1A4FFF',
  textDecoration: 'none',
}

const signature = {
  fontSize: '15px',
  color: '#525f7f',
  lineHeight: '24px',
  margin: '32px 0 0',
}
