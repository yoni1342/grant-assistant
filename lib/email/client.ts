import { SESClient } from '@aws-sdk/client-ses'

let sesClient: SESClient | null = null

/**
 * Get singleton SES client instance
 * Uses environment variables for configuration
 */
export function getSESClient(): SESClient {
  if (!sesClient) {
    const region = process.env.AWS_SES_REGION || 'us-east-1'

    // In production (ECS), credentials come from the task role
    // In development, use explicit credentials from environment
    sesClient = new SESClient({
      region,
      // Credentials are automatically loaded from:
      // 1. ECS task role (in production)
      // 2. AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY env vars (in development)
      // 3. AWS credentials file (~/.aws/credentials)
    })
  }

  return sesClient
}
