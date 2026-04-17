/**
 * One-off test: send a grant-eligible email to Texas Health Care
 * for the "Rural Health Network Advancement Program" grant (score 94, pending_approval).
 *
 * Run: npx tsx scripts/test-grant-email.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { sendGrantEligibleEmail } from '../lib/email/service'

async function main() {
  console.log('Sending grant eligible email to Texas Health Care...')

  await sendGrantEligibleEmail({
    toEmail: 'abenezertileye2003@gmail.com',
    fullName: 'Abenezer Tileye Feyissa',
    organizationName: 'Texas Health Care',
    grantId: '14fd5cba-689b-4c62-80f9-f4cd60cb961d',
    grantTitle: 'Rural Health Network Advancement Program',
    funderName: 'Health Resources and Services Administration',
    amount: null,
    deadline: null,
    screeningScore: 94,
    missingNarratives: true,
    missingBudget: true,
  })

  console.log('Done — email sent successfully!')
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
