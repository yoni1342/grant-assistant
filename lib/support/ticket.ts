// Ticket references are a human-friendly prefix of the support_request UUID:
//   id  = "359fd3fb-ea4d-4462-..."  ->  ref = "FND-359FD3FB"
// They appear in every support email subject so inbound replies can be threaded
// back onto the originating request.

export function shortTicketRef(uuid: string): string {
  return 'FND-' + uuid.replace(/-/g, '').slice(0, 8).toUpperCase()
}

/** Pull a ticket ref out of an email subject (or any text). */
export function parseTicketRef(text: string | null | undefined): string | null {
  if (!text) return null
  const m = text.match(/FND-([0-9a-f]{8})/i)
  return m ? 'FND-' + m[1].toUpperCase() : null
}

/**
 * A ticket ref pins the first 8 hex chars of the request UUID. Turn it into an
 * inclusive UUID range so we can look the request up with an indexed gte/lte
 * query (PostgREST `like` doesn't work on uuid columns).
 */
export function ticketRefToIdRange(ref: string): { gte: string; lte: string } | null {
  const m = ref.match(/FND-([0-9a-f]{8})/i)
  if (!m) return null
  const p = m[1].toLowerCase()
  return {
    gte: `${p}-0000-0000-0000-000000000000`,
    lte: `${p}-ffff-ffff-ffff-ffffffffffff`,
  }
}
