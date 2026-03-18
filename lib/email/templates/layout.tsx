import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
} from '@react-email/components'

interface EmailLayoutProps {
  children: React.ReactNode
}

export default function EmailLayout({ children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>Fundory</Text>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Fundory. All rights reserved.
            </Text>
            <Text style={footerText}>
              <Link href="https://fundory.ai" style={footerLink}>
                fundory.ai
              </Link>
              {' · '}
              <Link href="mailto:support@fundory.ai" style={footerLink}>
                Contact Support
              </Link>
            </Text>
            <Text style={footerTextSmall}>
              You're receiving this email because you registered an organization on Fundory.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const header = {
  padding: '32px 40px',
  textAlign: 'center' as const,
}

const logo = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#0066ff',
  margin: '0',
}

const content = {
  padding: '0 40px',
}

const divider = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
}

const footer = {
  padding: '0 40px',
}

const footerText = {
  fontSize: '14px',
  color: '#8898aa',
  lineHeight: '24px',
  margin: '8px 0',
  textAlign: 'center' as const,
}

const footerTextSmall = {
  fontSize: '12px',
  color: '#8898aa',
  lineHeight: '20px',
  margin: '16px 0 0',
  textAlign: 'center' as const,
}

const footerLink = {
  color: '#0066ff',
  textDecoration: 'none',
}
