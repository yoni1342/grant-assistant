/**
 * Realtime listener that sends grant eligible emails instantly
 * when a screening_completed notification is inserted.
 *
 * Run with: npx tsx scripts/notification-email-listener.ts
 * Or via PM2: pm2 start ecosystem.config.js --only notification-email-listener
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fundory.ai'
const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || ''

console.log('[notification-email-listener] Starting realtime listener...')

const channel = supabase
  .channel('notification-email-trigger')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
    },
    async (payload) => {
      const record = payload.new

      if (record.type !== 'screening_completed' && record.type !== 'proposal_generated') {
        return
      }

      console.log(`[notification-email-listener] ${record.type} notification received for grant ${record.grant_id}`)

      try {
        const res = await fetch(`${APP_URL}/api/hooks/notification-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-secret': WEBHOOK_SECRET,
          },
          body: JSON.stringify({
            type: 'INSERT',
            table: 'notifications',
            record,
          }),
        })

        const data = await res.json()
        console.log(`[notification-email-listener] Response:`, data)
      } catch (err) {
        console.error(`[notification-email-listener] Failed to call webhook:`, err)
      }
    }
  )
  .subscribe((status) => {
    console.log(`[notification-email-listener] Subscription status: ${status}`)
  })

// Keep process alive
process.on('SIGINT', () => {
  console.log('[notification-email-listener] Shutting down...')
  supabase.removeChannel(channel)
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('[notification-email-listener] Shutting down...')
  supabase.removeChannel(channel)
  process.exit(0)
})
