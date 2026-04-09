/**
 * Filters out grants that were already expired when fetched.
 * A grant is "fetched expired" if its deadline is before its created_at timestamp,
 * meaning it was past due before it ever entered the pipeline.
 *
 * Grants that expire AFTER being added (deadline >= created_at) are legitimate
 * pipeline items — the close-expired-grants cron moves them to "closed".
 */
export function excludeFetchedExpired<T extends { deadline?: string | null; created_at?: string | null }>(
  grants: T[]
): T[] {
  return grants.filter((g) => {
    if (!g.deadline || !g.created_at) return true;
    const dl = new Date(g.deadline);
    if (isNaN(dl.getTime())) return true;
    return dl >= new Date(g.created_at);
  });
}

/**
 * Parses a grant amount string (e.g. "$500,000", "3000000", "$1,200.50") into a number.
 * Returns 0 for null, undefined, or unparseable values.
 */
export function parseGrantAmount(amount: string | number | null | undefined): number {
  if (amount == null) return 0;
  if (typeof amount === "number") return amount;
  const cleaned = amount.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
