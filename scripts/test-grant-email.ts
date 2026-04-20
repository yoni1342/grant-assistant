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
    amount: '850000',
    deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    description:
      'HRSA invites rural health networks to strengthen integrated care delivery across underserved counties. Awards fund two years of clinical coordination, workforce retention, and tele-health expansion, with a priority on networks demonstrating measurable impact on chronic disease management.',
    screeningScore: 94,
    screeningNotes:
      'Texas Health Care is a strong match: rural-serving federally qualified clinics, existing tele-health infrastructure, and a track record with HRSA Network Planning awards. Mission, population, and geography align cleanly with the program.',
    dimensionScores: {
      mission_alignment: 19,
      target_population: 18,
      service_fit: 17,
      geographic_alignment: 20,
      organizational_capacity: 14,
    },
    concerns: [
      'No dedicated evaluation staff named in your profile — HRSA expects a documented evaluation plan.',
      'Latest audited financials are two years old; the FOA asks for the most recent fiscal year.',
    ],
    recommendations: [
      'Add a short evaluation narrative (logic model + 3 key indicators) to your narrative library.',
      'Upload the FY2025 audited financials before drafting the budget section.',
      'Reference the 2023 HRSA Network Planning award in your organizational capacity statement.',
    ],
    categories: ['Rural Health', 'Federal', 'Workforce', 'Tele-health'],
    sourceUrl: 'https://www.grants.gov/search-results-detail/1',
    missingNarratives: true,
    missingBudget: true,
  })

  console.log('Done — email sent successfully!')
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
