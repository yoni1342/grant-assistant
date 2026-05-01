/**
 * Investigation script — focused: do CFNJ and grantinterface.com sources
 * have any TRUE duplicates (same normalized title + same URL)? If not,
 * we can safely exempt those sources from URL-based dedup.
 *
 * Run: npx tsx scripts/investigate-source-duplicates.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

function normalizeTitle(t: string): string {
  return t
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const all: Array<{
    id: string;
    title: string;
    source: string;
    source_id: string | null;
    source_url: string | null;
  }> = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("central_grants")
      .select("id, title, source, source_id, source_url")
      .order("first_seen_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as typeof all));
    if (data.length < PAGE) break;
  }

  console.log(`Total central_grants rows: ${all.length}`);
  console.log("");

  // Helper: simplify "source" so JSON-blob scanner sources collapse to "scanner".
  function classifySource(s: string): string {
    if (!s) return "(empty)";
    if (s.startsWith("{") && s.includes('"type":"scanner"')) return "scanner-blob";
    return s;
  }

  const bySource = new Map<string, typeof all>();
  for (const r of all) {
    const key = classifySource(r.source);
    const list = bySource.get(key) ?? [];
    list.push(r);
    bySource.set(key, list);
  }

  console.log("=== Per-source URL/title concentration ===");
  console.log(
    "source".padEnd(28),
    "rows".padStart(6),
    "URLs".padStart(6),
    "nullURL".padStart(8),
    "maxURLgrp".padStart(10),
    "trueDupsBy(URL+title)".padStart(22)
  );

  const sourceStats: Array<{
    source: string;
    rows: number;
    urls: number;
    nullUrls: number;
    maxUrlGroup: number;
    maxUrlExample: string;
    trueDups: number;
    trueDupExamples: string[];
  }> = [];

  for (const [source, rows] of bySource) {
    const byUrl = new Map<string, typeof rows>();
    let nullUrls = 0;
    for (const r of rows) {
      if (!r.source_url) {
        nullUrls++;
        continue;
      }
      const list = byUrl.get(r.source_url) ?? [];
      list.push(r);
      byUrl.set(r.source_url, list);
    }
    let maxUrlGroup = 0;
    let maxUrlExample = "";
    let trueDups = 0;
    const trueDupExamples: string[] = [];
    for (const [url, group] of byUrl) {
      if (group.length > maxUrlGroup) {
        maxUrlGroup = group.length;
        maxUrlExample = url;
      }
      const byTitle = new Map<string, number>();
      for (const g of group) {
        const t = normalizeTitle(g.title);
        byTitle.set(t, (byTitle.get(t) ?? 0) + 1);
      }
      for (const [t, c] of byTitle) {
        if (c > 1) {
          trueDups += c - 1;
          if (trueDupExamples.length < 3) {
            trueDupExamples.push(`"${t.slice(0, 60)}" x${c} @ ${url.slice(0, 60)}`);
          }
        }
      }
    }
    sourceStats.push({
      source,
      rows: rows.length,
      urls: byUrl.size,
      nullUrls,
      maxUrlGroup,
      maxUrlExample,
      trueDups,
      trueDupExamples,
    });
  }

  sourceStats.sort((a, b) => b.maxUrlGroup - a.maxUrlGroup);
  for (const s of sourceStats) {
    console.log(
      s.source.padEnd(28).slice(0, 28),
      String(s.rows).padStart(6),
      String(s.urls).padStart(6),
      String(s.nullUrls).padStart(8),
      String(s.maxUrlGroup).padStart(10),
      String(s.trueDups).padStart(22)
    );
  }
  console.log("");

  // Show in-source true-duplicate examples for the suspicious sources.
  console.log("=== In-source TRUE duplicates (same source + same URL + same title) ===");
  for (const s of sourceStats) {
    if (s.trueDups === 0) continue;
    console.log(`\n${s.source}: ${s.trueDups} true in-source dupes`);
    s.trueDupExamples.forEach((e) => console.log(`  ${e}`));
  }

  // Now look at the "generic landing page" sources specifically.
  console.log("");
  console.log("=== CFNJ + grantinterface.com landing-page URLs ===");
  const landingPageUrls = [
    "https://www.cfnj.org/grants",
    "https://www.grantinterface.com/Home/Logon?urlkey=cfnjgrants",
  ];
  for (const url of landingPageUrls) {
    const rows = all.filter((r) => r.source_url === url);
    console.log(`\n${url}  (${rows.length} rows)`);
    const titles = new Map<string, number>();
    for (const r of rows) {
      const t = normalizeTitle(r.title);
      titles.set(t, (titles.get(t) ?? 0) + 1);
    }
    let dupTitles = 0;
    for (const [t, c] of titles) {
      if (c > 1) {
        dupTitles += c - 1;
        console.log(`  DUPE TITLE x${c}: "${t.slice(0, 80)}"`);
      }
    }
    console.log(`  → ${titles.size} distinct titles, ${dupTitles} duplicate-title rows`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
