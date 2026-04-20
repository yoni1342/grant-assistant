import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Font,
  Preview,
} from '@react-email/components'

interface EmailLayoutProps {
  children: React.ReactNode
  preview?: string
}

export default function EmailLayout({ children, preview }: EmailLayoutProps) {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Barlow"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: 'https://fonts.gstatic.com/s/barlow/v12/7cHpv4kjgoGqM7E_Cfs.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Barlow"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: 'https://fonts.gstatic.com/s/barlow/v12/7cHqv4kjgoGqM7E3w-oc4A.woff2',
            format: 'woff2',
          }}
          fontWeight={600}
          fontStyle="normal"
        />
        <Font
          fontFamily="Barlow Condensed"
          fallbackFontFamily="Arial"
          webFont={{
            url: 'https://fonts.gstatic.com/s/barlowcondensed/v12/HTxwL3I-JCGChYJ8VI-L6OO_au7B6xjLog.woff2',
            format: 'woff2',
          }}
          fontWeight={900}
          fontStyle="normal"
        />
        <Font
          fontFamily="Space Mono"
          fallbackFontFamily="monospace"
          webFont={{
            url: 'https://fonts.gstatic.com/s/spacemono/v13/i7dPIFZifjKcF5UAWdDRYE58RWq7.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      {preview && <Preview>{preview}</Preview>}
      <Body style={main}>
        <Container style={container}>
          {/* Header — editorial masthead */}
          <Section style={header}>
            <Text style={logoMono}>FUNDORY</Text>
            <Text style={logoKicker}>GRANT INTELLIGENCE</Text>
          </Section>

          <Hr style={hairline} />

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={hairline} />
          <Section style={footer}>
            <Text style={footerBrand}>FUNDORY</Text>
            <Text style={footerText}>
              <Link href="https://fundory.ai" style={footerLink}>
                fundory.ai
              </Link>
              {'  ·  '}
              <Link href="mailto:support@fundory.ai" style={footerLink}>
                support@fundory.ai
              </Link>
            </Text>
            <Text style={footerTextSmall}>
              Sent because your organization is active on Fundory. &copy;{' '}
              {new Date().getFullYear()} Fundory, Inc.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const BRAND_BLUE = '#1A4FFF'
const INK = '#0A0A0A'
const MUTED = '#888888'
const BORDER = '#D8D8D4'
const CANVAS = '#F5F5F0'

const main = {
  backgroundColor: CANVAS,
  fontFamily:
    'Barlow, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  margin: 0,
  padding: '24px 0',
}

const container = {
  backgroundColor: '#FFFFFF',
  border: `1px solid ${BORDER}`,
  borderRadius: '6px',
  margin: '0 auto',
  maxWidth: '640px',
  padding: 0,
}

const header = {
  padding: '28px 40px 20px',
  textAlign: 'left' as const,
}

const logoMono = {
  fontFamily:
    '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  fontSize: '26px',
  fontWeight: 900,
  color: INK,
  letterSpacing: '0.04em',
  margin: 0,
  lineHeight: '1',
  textTransform: 'uppercase' as const,
}

const logoKicker = {
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '10px',
  fontWeight: 400,
  color: MUTED,
  letterSpacing: '0.3em',
  margin: '6px 0 0',
  textTransform: 'uppercase' as const,
}

const hairline = {
  borderColor: BORDER,
  borderTop: `1px solid ${BORDER}`,
  margin: 0,
  height: '1px',
  width: '100%',
}

const content = {
  padding: '32px 40px',
}

const footer = {
  padding: '24px 40px 28px',
  textAlign: 'left' as const,
}

const footerBrand = {
  fontFamily: '"Barlow Condensed", Arial, sans-serif',
  fontSize: '18px',
  fontWeight: 900,
  color: INK,
  letterSpacing: '0.04em',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
}

const footerText = {
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '11px',
  color: MUTED,
  letterSpacing: '0.08em',
  lineHeight: '18px',
  margin: '4px 0',
  textTransform: 'uppercase' as const,
}

const footerTextSmall = {
  fontFamily: 'Barlow, Helvetica, Arial, sans-serif',
  fontSize: '12px',
  color: MUTED,
  lineHeight: '18px',
  margin: '14px 0 0',
}

const footerLink = {
  color: BRAND_BLUE,
  textDecoration: 'none',
}
