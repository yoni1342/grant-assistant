import { getStripeClient } from './client'

/**
 * Sums all active Stripe subscriptions at their real prices, normalizing
 * yearly/weekly/daily billing to a monthly equivalent. Returns dollars.
 */
export async function getLiveMrrFromStripe(): Promise<number> {
  const stripe = getStripeClient()
  let totalCents = 0

  for await (const sub of stripe.subscriptions.list({
    status: 'active',
    limit: 100,
    expand: ['data.discounts'],
  })) {
    let subCents = 0
    for (const item of sub.items.data) {
      const price = item.price
      if (!price.recurring || price.unit_amount == null) continue
      const qty = item.quantity ?? 1
      const gross = price.unit_amount * qty
      const { interval, interval_count } = price.recurring
      if (interval === 'month') subCents += gross / interval_count
      else if (interval === 'year') subCents += gross / (12 * interval_count)
      else if (interval === 'week') subCents += (gross * 52) / (12 * interval_count)
      else if (interval === 'day') subCents += (gross * 365) / (12 * interval_count)
    }

    for (const discount of sub.discounts ?? []) {
      if (typeof discount === 'string') continue
      const coupon = discount.source?.coupon
      if (!coupon || typeof coupon === 'string') continue
      if (coupon.percent_off) {
        subCents = subCents * (1 - coupon.percent_off / 100)
      } else if (coupon.amount_off) {
        subCents = Math.max(0, subCents - coupon.amount_off)
      }
    }

    totalCents += subCents
  }

  return Math.round(totalCents) / 100
}
