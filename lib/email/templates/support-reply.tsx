import { Text, Heading } from '@react-email/components'
import EmailLayout from './layout'
import type { SupportReplyEmailParams } from '../types'

export default function SupportReplyEmail({
  fullName,
  ticketRef,
  subject,
  replyText,
}: SupportReplyEmailParams) {
  return (
    <EmailLayout preview={`Re: ${subject}`}>
      <Heading style={h1}>Hi {fullName},</Heading>

      <Text style={body}>{replyText}</Text>

      <Text style={signoff}>— The Fundory Team</Text>

      <Text style={footerNote}>
        You can reply directly to this email and it will reach our support team.
        Reference: {ticketRef}.
      </Text>
    </EmailLayout>
  )
}

const h1 = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 20px',
  lineHeight: '1.3',
}

const body = {
  fontSize: '15px',
  color: '#1a1a1a',
  lineHeight: '24px',
  margin: '0 0 24px',
  whiteSpace: 'pre-wrap' as const,
}

const signoff = {
  fontSize: '15px',
  color: '#525f7f',
  lineHeight: '24px',
  margin: '0 0 32px',
}

const footerNote = {
  fontSize: '13px',
  color: '#888',
  lineHeight: '20px',
  margin: '0',
  fontStyle: 'italic' as const,
}
