import { SESClient } from '@aws-sdk/client-ses'

let sesClient: SESClient | null = null

/**
 * Get singleton SES client instance
 * Uses environment variables for configuration
 */
export function getSESClient(): SESClient {
  if (!sesClient) {
    const region = process.env.AWS_SES_REGION || 'us-east-1'
    const hasAccessKey = !!process.env.AWS_ACCESS_KEY_ID
    const hasSecretKey = !!process.env.AWS_SECRET_ACCESS_KEY

    console.log('[SES Client] Initializing:', {
      region,
      hasAccessKey,
      hasSecretKey,
      accessKeyPrefix: hasAccessKey ? process.env.AWS_ACCESS_KEY_ID?.substring(0, 8) + '...' : 'none',
    })

    sesClient = new SESClient({
      region,
    })
  }

  return sesClient
}
