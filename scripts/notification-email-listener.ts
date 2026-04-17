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

const RECONNECT_DELAY_MS = 5_000
let channel: ReturnType<typeof supabase.channel> | null = null
let grantsChannel: ReturnType<typeof supabase.channel> | null = null

async function callWebhook(table: string, eventType: string, record: Record<string, unknown>) {
  try {
    const res = await fetch(`${APP_URL}/api/hooks/notification-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET,
      },
      body: JSON.stringify({ type: eventType, table, record }),
    })

    const data = await res.json()
    console.log(`[notification-email-listener] Response:`, data)
  } catch (err) {
    console.error(`[notification-email-listener] Failed to call webhook:`, err)
  }
}

async function handleNotification(payload: { new: Record<string, unknown> }) {
  const record = payload.new

  if (record.type !== 'screening_completed' && record.type !== 'proposal_generated') {
    return
  }

  console.log(`[notification-email-listener] ${record.type} notification received for grant ${record.grant_id}`)
  await callWebhook('notifications', 'INSERT', record)
}

async function handleGrantUpdate(payload: { new: Record<string, unknown>; old: Record<string, unknown> }) {
  const newGrant = payload.new
  const oldGrant = payload.old

  // Only fire when stage changes TO pending_approval
  if (newGrant.stage !== 'pending_approval' || oldGrant.stage === 'pending_approval') {
    return
  }

  console.log(`[notification-email-listener] Grant ${newGrant.id} moved to pending_approval (was ${oldGrant.stage})`)
  await callWebhook('grants', 'UPDATE', {
    ...newGrant,
    type: 'stage_changed_pending_approval',
    grant_id: newGrant.id,
  })
}

function subscribe() {
  // Clean up previous channels if any
  if (channel) {
    supabase.removeChannel(channel)
    channel = null
  }
  if (grantsChannel) {
    supabase.removeChannel(grantsChannel)
    grantsChannel = null
  }

  console.log('[notification-email-listener] Subscribing to realtime channels...')

  // Channel 1: notifications INSERT (screening_completed, proposal_generated)
  channel = supabase
    .channel('notification-email-trigger')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      handleNotification,
    )
    .subscribe((status) => {
      console.log(`[notification-email-listener] notifications channel: ${status}`)

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.log(`[notification-email-listener] notifications channel lost (${status}), reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`)
        setTimeout(subscribe, RECONNECT_DELAY_MS)
      }
    })

  // Channel 2: grants UPDATE (stage → pending_approval)
  grantsChannel = supabase
    .channel('grants-stage-trigger')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'grants',
      },
      handleGrantUpdate,
    )
    .subscribe((status) => {
      console.log(`[notification-email-listener] grants channel: ${status}`)

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.log(`[notification-email-listener] grants channel lost (${status}), reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`)
        setTimeout(subscribe, RECONNECT_DELAY_MS)
      }
    })
}

console.log('[notification-email-listener] Starting realtime listener...')
subscribe()

// Keep process alive
function shutdown() {
  console.log('[notification-email-listener] Shutting down...')
  if (channel) supabase.removeChannel(channel)
  if (grantsChannel) supabase.removeChannel(grantsChannel)
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
