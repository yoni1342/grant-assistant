// Normalize a grant's source_url so that the same opportunity scraped by
// different sources (Grants.gov, Grantivia, scanner, etc.) collapses to a
// single canonical URL. Lowercases host, drops the trailing slash, drops
// the fragment. Query strings are preserved because some sources need them.
//
// Returns null for empty / unparseable input — callers should fall back to
// (source, source_id) dedup in that case.
export function normalizeSourceUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    u.hash = "";
    u.host = u.host.toLowerCase();
    let href = u.toString();
    if (href.endsWith("/") && u.pathname !== "/") {
      href = href.slice(0, -1);
    }
    return href;
  } catch {
    return null;
  }
}

// Normalize a grant title so trivial differences (HTML entities, casing,
// stray whitespace) don't prevent two scrapes of the same grant from
// matching. Used as half of the (source_url, title_norm) dedupe key.
export function normalizeTitle(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Some scrapers (notably the "scanner" workflow) accidentally send
// `source` as a JSON blob like `{"url":"...","analyzedAt":"..."}` instead
// of a plain string. Each scrape run gets a unique `analyzedAt`, so the
// dedupe index is bypassed and rows pile up. Collapse those to "Scanner"
// so all scanner-blob runs share one source value.
export function normalizeSource(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (trimmed.startsWith("{") && trimmed.includes('"type":"scanner"')) {
    return "Scanner";
  }
  return trimmed;
}
