#!/usr/bin/env node
// Local mirror of the n8n pipeline. Pulls real data from the GetModeDeals
// WP REST API, applies the same normalize/dedupe/select/render logic the
// n8n workflow uses, and writes a preview HTML you can open in a browser.
//
// Usage:
//   node local-pipeline.mjs              # writes ./sample-newsletter.html
//   COUNT=12 node local-pipeline.mjs    # override deal count
//   FETCH=50 node local-pipeline.mjs    # override how many to fetch from WP

import fs from 'node:fs/promises';
import path from 'node:path';

const FETCH_COUNT = Number(process.env.FETCH || 30);
const TARGET_COUNT = Number(process.env.COUNT || 8);
const MIN_COUNT = Number(process.env.MIN || 4);
const OUT = process.env.OUT || './sample-newsletter.html';

// ---------- Fetch ----------
const url = `https://getmodedeals.com/wp-json/wp/v2/product?per_page=${FETCH_COUNT}&status=publish&_embed=true&orderby=date&order=desc`;
console.log(`[fetch] ${url}`);
const res = await fetch(url, { headers: { 'User-Agent': 'GetModeDeals-Newsletter/1.0' } });
if (!res.ok) {
  console.error(`[fetch] HTTP ${res.status}`);
  process.exit(1);
}
const raw = await res.json();
console.log(`[fetch] got ${raw.length} products`);

// ---------- Normalize ----------
const stripHtml = (s) =>
  String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&hellip;/g, '...')
    .replace(/&#8211;/g, '-')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8243;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const normalize = (item) => {
  const title = stripHtml(item.title?.rendered);
  const content = stripHtml(item.content?.rendered);
  const excerpt = stripHtml(item.excerpt?.rendered);
  const searchSpace = `${content} ${title}`;

  // Final price: prefer "= $X" (final after coupons), then "for $X", then any $X in title.
  const eqMatch = searchSpace.match(/=\s*\$([0-9,]+(?:\.\d{2})?)/);
  const forMatch = searchSpace.match(/for\s+\$([0-9,]+(?:\.\d{2})?)/i);
  const titleDollar = title.match(/\$([0-9,]+(?:\.\d{2})?)/);
  const finalPriceStr = eqMatch?.[1] || forMatch?.[1] || titleDollar?.[1] || null;
  const finalPrice = finalPriceStr ? parseFloat(finalPriceStr.replace(/,/g, '')) : null;

  // "Was" price: first $-price in the prose, only if different from the final.
  const firstDollar = content.match(/\$([0-9,]+(?:\.\d{2})?)/);
  const wasPriceStr =
    firstDollar && finalPriceStr && firstDollar[1] !== finalPriceStr ? firstDollar[1] : null;
  const wasPrice = wasPriceStr ? parseFloat(wasPriceStr.replace(/,/g, '')) : null;

  // Discount %: prefer explicit "X% off" in prose, else compute from was/final.
  const pctMatch = content.match(/(\d{1,2})\s*%\s*off/i);
  let discountPct = pctMatch ? parseInt(pctMatch[1], 10) : null;
  if (discountPct == null && wasPrice && finalPrice && wasPrice > finalPrice) {
    discountPct = Math.round(((wasPrice - finalPrice) / wasPrice) * 100);
  }

  // Merchant: "X Via Amazon" → X; otherwise default to "Amazon" if present, else null.
  const viaMatch = content.match(/^([A-Za-z0-9 .&'-]{2,40})\s+Via\s+Amazon/);
  const merchant = viaMatch?.[1]?.trim() || (/\bAmazon\b/i.test(content) ? 'Amazon' : null);

  const image = item._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;
  const blurb = excerpt.length > 140 ? excerpt.slice(0, 137) + '...' : excerpt;
  const category = item.product_cat?.[0] ?? null;

  return {
    id: item.id,
    title,
    url: item.link,
    image,
    finalPrice,
    wasPrice,
    discountPct,
    priceLabel: finalPrice != null ? `$${finalPrice.toFixed(2)}` : null,
    wasPriceLabel: wasPrice != null ? `$${wasPrice.toFixed(2)}` : null,
    merchant,
    blurb,
    category,
    date: item.date,
  };
};

const normalized = raw.map(normalize);

// ---------- Validate ----------
const valid = normalized.filter((p) => p.image && p.title);
console.log(`[validate] ${valid.length} of ${normalized.length} have image + title`);

// ---------- Dedupe by URL ----------
const seen = new Set();
const deduped = [];
for (const p of valid) {
  if (seen.has(p.url)) continue;
  seen.add(p.url);
  deduped.push(p);
}
console.log(`[dedupe] ${deduped.length} unique by URL`);

// ---------- Score + Select ----------
// MVP rule-based scoring. Higher is better.
const score = (p) => {
  let s = 0;
  if (p.discountPct != null) s += 50 + p.discountPct * 0.5; // 35% off → 50 + 17.5 = 67.5
  else if (p.finalPrice != null) s += 30;
  else s += 10;
  // Recency bonus: 10 points if posted in last 24h
  const ageHours = (Date.now() - new Date(p.date).getTime()) / 36e5;
  if (ageHours < 24) s += 10;
  return s;
};

const ranked = deduped
  .map((p) => ({ ...p, _score: score(p) }))
  .sort((a, b) => b._score - a._score || new Date(b.date) - new Date(a.date));

// Category diversity: at most ceil(TARGET/2) from any single category — but only
// if multiple categories are actually represented in the candidate pool. With
// current data everything is cat 20, so the cap would empty the email.
const distinctCats = new Set(ranked.map((p) => p.category ?? 'none'));
const enforceDiversity = distinctCats.size >= 3;
const perCatCap = Math.ceil(TARGET_COUNT / 2);
console.log(`[select] distinct cats in pool: ${distinctCats.size}, diversity cap ${enforceDiversity ? `enforced (max ${perCatCap}/cat)` : 'skipped'}`);

const perCat = new Map();
const selected = [];
for (const p of ranked) {
  const cat = p.category ?? 'none';
  const used = perCat.get(cat) || 0;
  if (enforceDiversity && used >= perCatCap) continue;
  selected.push(p);
  perCat.set(cat, used + 1);
  if (selected.length >= TARGET_COUNT) break;
}
console.log(`[select] picked ${selected.length} (target ${TARGET_COUNT}, min ${MIN_COUNT})`);

// ---------- QA gate ----------
if (selected.length < MIN_COUNT) {
  console.error(
    `[qa] FAIL — only ${selected.length} valid deals, minimum is ${MIN_COUNT}. Would alert Slack and skip send.`
  );
  process.exit(2);
}

// ---------- Render ----------
const escapeHtml = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const cell = (p) => {
  if (!p) return '<td width="50%" style="padding:8px;"></td>';
  const url = escapeHtml(p.url);
  const title = escapeHtml(p.title);
  const image = escapeHtml(p.image);
  const merchantLine = p.merchant
    ? `<tr><td style="padding:0 14px 4px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#888;">${escapeHtml(p.merchant)}</td></tr>`
    : '';
  const priceBlock = p.priceLabel
    ? `<tr><td style="padding:0 14px 8px 14px;font-size:18px;color:#d62828;font-weight:bold;">${escapeHtml(p.priceLabel)}${p.wasPriceLabel ? ` <span style="font-size:13px;color:#888;text-decoration:line-through;font-weight:normal;">${escapeHtml(p.wasPriceLabel)}</span>` : ''}${p.discountPct ? ` <span style="font-size:12px;color:#2a7a2a;font-weight:bold;">${p.discountPct}% OFF</span>` : ''}</td></tr>`
    : '';
  return `
  <td width="50%" valign="top" style="padding:8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fafafa;border:1px solid #e5e5e5;border-radius:4px;">
      <tr>
        <td align="center" style="padding:12px;">
          <a href="${url}" style="text-decoration:none;">
            <img src="${image}" alt="" width="220" style="max-width:100%;height:auto;display:block;border:0;" />
          </a>
        </td>
      </tr>
      ${merchantLine}
      <tr>
        <td style="padding:0 14px 8px 14px;font-size:14px;line-height:1.4;color:#1a1a1a;">
          <a href="${url}" style="color:#1a1a1a;text-decoration:none;font-weight:bold;">${title}</a>
        </td>
      </tr>
      ${priceBlock}
      <tr>
        <td align="center" style="padding:6px 14px 14px 14px;">
          <a href="${url}" style="display:inline-block;background-color:#1a1a1a;color:#ffffff;padding:8px 18px;text-decoration:none;border-radius:3px;font-size:13px;font-weight:bold;">Shop Now</a>
        </td>
      </tr>
    </table>
  </td>`;
};

const rows = [];
for (let i = 0; i < selected.length; i += 2) rows.push([selected[i], selected[i + 1]]);
const productRows = rows.map((pair) => `<tr>${cell(pair[0])}${cell(pair[1])}</tr>`).join('\n');

const datePretty = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});
const subject = `Today's Top Deals — ${datePretty}`;
const intro = `Here are today's hand-picked deals from across the web. We've got ${selected.length} fresh finds for you.`;

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#333;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:4px;overflow:hidden;">
<tr><td align="center" style="background-color:#1a1a1a;padding:20px;"><a href="https://getmodedeals.com" style="text-decoration:none;color:#ffffff;font-size:24px;font-weight:bold;letter-spacing:1px;">GETMODEDEALS</a><div style="color:#cccccc;font-size:12px;margin-top:4px;">${escapeHtml(datePretty)}</div></td></tr>
<tr><td style="padding:24px 24px 8px 24px;"><h1 style="margin:0 0 12px 0;font-size:22px;color:#1a1a1a;">Today's Top Deals</h1><p style="margin:0;font-size:15px;line-height:1.5;color:#444;">${escapeHtml(intro)}</p></td></tr>
<tr><td style="padding:16px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${productRows}</table></td></tr>
<tr><td align="center" style="padding:16px 24px 24px 24px;"><a href="https://getmodedeals.com" style="display:inline-block;background-color:#d62828;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:4px;font-weight:bold;font-size:14px;">See All Deals</a></td></tr>
<tr><td style="background-color:#f4f4f4;padding:20px 24px;font-size:12px;color:#888;line-height:1.5;text-align:center;">You're receiving this because you subscribed at GetModeDeals.com.<br><a href="{{unsubscribe_url}}" style="color:#888;">Unsubscribe</a> &nbsp;|&nbsp; <a href="https://getmodedeals.com" style="color:#888;">Visit site</a><br><span style="color:#aaa;">GetModeDeals &middot; Affiliate links may earn us a commission.</span></td></tr>
</table></td></tr></table></body></html>`;

await fs.writeFile(OUT, html, 'utf8');
const abs = path.resolve(OUT);
console.log(`\n[render] wrote ${abs}`);

// Also write a compact JSON of the selection for review.
const jsonOut = OUT.replace(/\.html$/, '.json');
await fs.writeFile(
  jsonOut,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      subject,
      counts: { fetched: raw.length, valid: valid.length, deduped: deduped.length, selected: selected.length },
      selected: selected.map((p) => ({
        id: p.id,
        title: p.title,
        url: p.url,
        merchant: p.merchant,
        priceLabel: p.priceLabel,
        wasPriceLabel: p.wasPriceLabel,
        discountPct: p.discountPct,
        score: p._score,
      })),
    },
    null,
    2
  ),
  'utf8'
);
console.log(`[render] wrote ${path.resolve(jsonOut)}`);
console.log('\nOpen the HTML in a browser to preview the email.');
