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
import { buildFeatureGif } from './build-gif.mjs';

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

  const eqMatch = searchSpace.match(/=\s*\$([0-9,]+(?:\.\d{2})?)/);
  const forMatch = searchSpace.match(/for\s+\$([0-9,]+(?:\.\d{2})?)/i);
  const titleDollar = title.match(/\$([0-9,]+(?:\.\d{2})?)/);
  const finalPriceStr = eqMatch?.[1] || forMatch?.[1] || titleDollar?.[1] || null;
  const finalPrice = finalPriceStr ? parseFloat(finalPriceStr.replace(/,/g, '')) : null;

  const firstDollar = content.match(/\$([0-9,]+(?:\.\d{2})?)/);
  const wasPriceStr =
    firstDollar && finalPriceStr && firstDollar[1] !== finalPriceStr ? firstDollar[1] : null;
  const wasPrice = wasPriceStr ? parseFloat(wasPriceStr.replace(/,/g, '')) : null;

  const pctMatch = content.match(/(\d{1,2})\s*%\s*off/i);
  let discountPct = pctMatch ? parseInt(pctMatch[1], 10) : null;
  if (discountPct == null && wasPrice && finalPrice && wasPrice > finalPrice) {
    discountPct = Math.round(((wasPrice - finalPrice) / wasPrice) * 100);
  }

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

// ---------- Validate / dedupe ----------
const valid = normalized.filter((p) => p.image && p.title);
console.log(`[validate] ${valid.length} of ${normalized.length} have image + title`);

const seen = new Set();
const deduped = [];
for (const p of valid) {
  if (seen.has(p.url)) continue;
  seen.add(p.url);
  deduped.push(p);
}
console.log(`[dedupe] ${deduped.length} unique by URL`);

// ---------- Score + Select ----------
const score = (p) => {
  let s = 0;
  if (p.discountPct != null) s += 50 + p.discountPct * 0.5;
  else if (p.finalPrice != null) s += 30;
  else s += 10;
  const ageHours = (Date.now() - new Date(p.date).getTime()) / 36e5;
  if (ageHours < 24) s += 10;
  return s;
};

const ranked = deduped
  .map((p) => ({ ...p, _score: score(p) }))
  .sort((a, b) => b._score - a._score || new Date(b.date) - new Date(a.date));

const distinctCats = new Set(ranked.map((p) => p.category ?? 'none'));
const enforceDiversity = distinctCats.size >= 3;
const perCatCap = Math.ceil(TARGET_COUNT / 2);
console.log(`[select] distinct cats: ${distinctCats.size}, diversity ${enforceDiversity ? `enforced (max ${perCatCap}/cat)` : 'skipped'}`);

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

if (selected.length < MIN_COUNT) {
  console.error(`[qa] FAIL — only ${selected.length} valid deals, minimum is ${MIN_COUNT}.`);
  process.exit(2);
}

// ---------- Feature GIF ----------
const HERO_OUT = process.env.HERO_OUT || '../public/feature.gif';

if (process.env.NO_GIF !== '1') {
  console.log(`[gif] building per-deal mini-reveals for ${selected.length} deals`);
  const result = await buildFeatureGif({ products: selected, outPath: HERO_OUT });
  console.log(`[gif] wrote ${path.resolve(result.outPath)} (${(result.sizeBytes / 1024).toFixed(0)} KB, ${result.frameCount} frames)`);
}

const FEATURE_GIF_URL = process.env.FEATURE_GIF_URL || '/feature.gif';

// ---------- Render ----------
const products = selected;

// Palette + type matched to getmodedeals.com:
//   navy #003366 + brand purple #463ACB, sale red #EF4444, slate text #0F1729
//   headlines Plus Jakarta Sans, body Inter (loaded via Google Fonts in <head>)
const C = {
  ink: '#0F1729',
  body: '#2C2D33',
  muted: '#6B7280',
  hint: '#9CA3AF',
  rule: '#E5E7EB',
  bg: '#FFFFFF',
  paper: '#FBFBFB',
  page: '#EBECEF',
  accent: '#463ACB',
  navy: '#003366',
  red: '#EF4444',
};

const HEAD = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono','SF Mono',Menlo,Consolas,'Courier New',monospace";

const NEON_PALETTE = [
  { bg: '#C6F432', ink: '#0F1729' },
  { bg: '#FF6FA3', ink: '#FFFFFF' },
  { bg: '#3A8DFF', ink: '#FFFFFF' },
  { bg: '#FFD93D', ink: '#0F1729' },
  { bg: '#B197FC', ink: '#0F1729' },
];
const _yearStart = new Date(new Date().getFullYear(), 0, 0);
const dayOfYear = Math.floor((Date.now() - _yearStart.getTime()) / 86400000);
const accent = NEON_PALETTE[dayOfYear % NEON_PALETTE.length];
const tiltDeg = dayOfYear % 2 === 0 ? -2 : 2;
const labelTilt = dayOfYear % 2 === 0 ? 4 : -4;
const issueNum = String(dayOfYear).padStart(3, '0');

const escapeHtml = (s) => String(s || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const truncate = (s, max) => {
  if (!s) return '';
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 30 ? lastSpace : max).trimEnd()}…`;
};

const datePretty = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const dateCaps = datePretty.toUpperCase();
const subject = `Today's Biggest Price Drops — ${datePretty}`;
const maxDiscount = Math.max(0, ...products.map(p => p.discountPct || 0));

const priceBlock = (p, large = false) => {
  const priceFs = large ? '34px' : '22px';
  const wasFs = large ? '14px' : '12px';
  const badgeFs = large ? '15px' : '12px';
  const parts = [];
  if (p.priceLabel) parts.push(`<span style="font-family:${HEAD};font-size:${priceFs};color:${C.red};font-weight:800;letter-spacing:-0.8px;">${escapeHtml(p.priceLabel)}</span>`);
  if (p.wasPriceLabel) parts.push(`<span style="font-family:${SANS};font-size:${wasFs};color:${C.muted};text-decoration:line-through;margin-left:12px;letter-spacing:0.2px;font-weight:600;">${escapeHtml(p.wasPriceLabel)}</span>`);
  if (p.discountPct) parts.push(`<span style="display:inline-block;background-color:${C.red};color:#FFFFFF;font-family:${HEAD};font-size:${badgeFs};font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-left:10px;padding:5px 10px;vertical-align:3px;">-${p.discountPct}%</span>`);
  return parts.join('');
};

const feature = products[0];
const rest = products.slice(1);

const heroWindow = feature ? `
<div style="padding:24px 8px 30px 8px;text-align:center;font-size:0;line-height:0;mso-line-height-rule:exactly;">
  <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background-color:#FFFFFF;border:3px solid ${accent.bg};padding:15px;"><![endif]-->
  <div style="display:inline-block;position:relative;background-color:#FFFFFF;border:3px solid ${accent.bg};box-shadow:12px 12px 0 0 ${accent.bg};padding:15px;-webkit-transform:rotate(${tiltDeg}deg);transform:rotate(${tiltDeg}deg);">
    <a href="${escapeHtml(feature.url)}" style="display:block;line-height:0;text-decoration:none;">
      <img src="${escapeHtml(FEATURE_GIF_URL)}" alt="" width="450" style="width:450px;max-width:100%;height:auto;display:block;border:0;background-color:${C.paper};" />
    </a>
    <div style="position:absolute;top:-16px;right:-16px;background-color:${C.ink};color:#FFFFFF;font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:1.4px;padding:8px 16px;border-radius:999px;-webkit-transform:rotate(${labelTilt}deg);transform:rotate(${labelTilt}deg);white-space:nowrap;line-height:1.4;">Look what we found</div>
  </div>
  <!--[if mso]></td></tr></table><![endif]-->
</div>` : '';

const heroDetails = feature ? `
<tr>
  <td style="padding:36px 36px 0 36px;">
    <span style="display:inline-block;background-color:${C.red};color:#FFFFFF;font-family:${HEAD};font-size:13px;letter-spacing:1.4px;text-transform:uppercase;font-weight:800;padding:5px 12px;">★ Deal of the day</span>${feature.merchant ? `<span style="font-family:${SANS};font-size:11px;color:${C.muted};letter-spacing:1.6px;text-transform:uppercase;margin-left:14px;font-weight:700;">${escapeHtml(feature.merchant)}</span>` : ''}
  </td>
</tr>
<tr>
  <td style="padding:14px 36px 0 36px;">
    <a href="${escapeHtml(feature.url)}" style="text-decoration:none;color:${C.ink};">
      <h2 style="margin:0;font-family:${HEAD};font-size:28px;line-height:1.25;color:${C.ink};font-weight:800;letter-spacing:-0.6px;">${escapeHtml(truncate(feature.title, 110))}</h2>
    </a>
  </td>
</tr>
<tr>
  <td style="padding:20px 36px 36px 36px;">
    ${priceBlock(feature, true)}
  </td>
</tr>` : '';

const card = (p) => p ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding-bottom:14px;">
      <a href="${escapeHtml(p.url)}" style="display:block;text-decoration:none;line-height:0;">
        <img src="${escapeHtml(p.image)}" alt="" width="244" style="width:100%;max-width:244px;height:auto;display:block;border:0;background-color:${C.paper};border-radius:6px;" />
      </a>
    </td>
  </tr>
  ${p.merchant ? `<tr><td style="padding-bottom:8px;"><div style="font-family:${SANS};font-size:10px;color:${C.hint};letter-spacing:1.8px;text-transform:uppercase;font-weight:700;">${escapeHtml(p.merchant)}</div></td></tr>` : ''}
  <tr>
    <td style="padding-bottom:10px;">
      <a href="${escapeHtml(p.url)}" style="text-decoration:none;color:${C.ink};">
        <div style="font-family:${HEAD};font-size:15px;line-height:1.35;color:${C.ink};font-weight:700;letter-spacing:-0.2px;">${escapeHtml(truncate(p.title, 70))}</div>
      </a>
    </td>
  </tr>
  <tr>
    <td>${priceBlock(p, false)}</td>
  </tr>
</table>` : '';

const pairs = [];
for (let i = 0; i < rest.length; i += 2) pairs.push([rest[i], rest[i + 1] || null]);

const restList = pairs.map((pair) => `
<tr>
  <td style="padding:32px 36px 0 36px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td valign="top" width="244" style="width:244px;padding-right:20px;">${card(pair[0])}</td>
        <td valign="top" width="244" style="width:244px;padding-left:20px;">${card(pair[1])}</td>
      </tr>
    </table>
  </td>
</tr>`).join('\n');

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="light"><title>${escapeHtml(subject)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:${C.page};font-family:${SANS};color:${C.ink};-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.page};">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <!-- ===== CARD 1: HEADER + GIF ===== -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:${C.bg};border-radius:10px;overflow:hidden;">
        <tr>
          <td align="center" style="padding:36px 36px 0 36px;">
            <div style="font-family:${SANS};font-size:11px;color:${C.navy};letter-spacing:2.8px;text-transform:uppercase;font-weight:700;">${escapeHtml(dateCaps)}</div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:18px 36px 0 36px;">
            <a href="https://getmodedeals.com" style="text-decoration:none;color:${C.ink};">
              <div style="font-family:${HEAD};font-size:42px;font-weight:800;letter-spacing:-1.6px;color:${C.ink};line-height:1;">Mode Deals<span style="color:${C.accent};">.</span></div>
            </a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:16px 36px 0 36px;">
            <div style="font-family:${HEAD};font-size:20px;color:${C.ink};line-height:1.25;font-weight:800;letter-spacing:-0.3px;text-transform:uppercase;">Today's biggest price drops!</div>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 36px 0 36px;">
            <div style="background-color:${C.red};color:#FFFFFF;font-family:${HEAD};font-size:15px;font-weight:800;letter-spacing:1.2px;text-align:center;padding:14px 16px;text-transform:uppercase;line-height:1.3;">
              ${products.length} deals · up to ${maxDiscount}% off · grab them fast!
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 12px 32px;">
            ${heroWindow}
          </td>
        </tr>
      </table>

      <!-- spacer -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;"><tr><td height="20" style="font-size:0;line-height:0;height:20px;">&nbsp;</td></tr></table>

      <!-- ===== CARD 2: HERO DETAILS ===== -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:${C.bg};border-radius:10px;overflow:hidden;">
        ${heroDetails}
      </table>

      <!-- spacer -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;"><tr><td height="20" style="font-size:0;line-height:0;height:20px;">&nbsp;</td></tr></table>

      <!-- ===== CARD 3: REST GRID ===== -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:${C.bg};border-radius:10px;overflow:hidden;">
        <tr>
          <td style="padding:36px 36px 0 36px;">
            <div style="background-color:${C.red};height:4px;width:48px;font-size:0;line-height:0;">&nbsp;</div>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 36px 0 36px;">
            <div style="font-family:${HEAD};font-size:22px;color:${C.ink};font-weight:800;letter-spacing:-0.4px;text-transform:uppercase;line-height:1.2;">More deals — don't miss!</div>
          </td>
        </tr>
        ${restList}
        <tr>
          <td align="center" style="padding:40px 36px 40px 36px;">
            <a href="https://getmodedeals.com" style="display:inline-block;font-family:${HEAD};font-size:15px;color:#FFFFFF;letter-spacing:1.4px;line-height:20px;text-transform:uppercase;font-weight:800;text-decoration:none;background-color:${C.accent};padding:14px 36px 15px 36px;border-radius:4px;">Shop all deals now →</a>
          </td>
        </tr>
      </table>

      <!-- ===== FOOTER (no card, sits on gray bg) ===== -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <tr>
          <td align="center" style="padding:32px 36px 8px 36px;">
            <div style="font-family:${HEAD};font-size:18px;font-weight:800;color:${C.ink};margin-bottom:6px;letter-spacing:-0.5px;">Mode Deals<span style="color:${C.accent};">.</span></div>
            <div style="font-family:${SANS};font-size:10px;color:${C.muted};letter-spacing:2px;text-transform:uppercase;margin-bottom:20px;font-weight:700;">Daily deals · powered by Mode Mobile</div>
            <div style="font-family:${SANS};font-size:11px;color:${C.muted};line-height:1.7;max-width:380px;margin:0 auto 14px;">
              You're receiving this because you subscribed at getmodedeals.com. One email per day, no fluff.
            </div>
            <div style="font-family:${SANS};font-size:11px;color:${C.muted};letter-spacing:0.5px;">
              <a href="{{unsubscribe_url}}" style="color:${C.muted};text-decoration:underline;">Unsubscribe</a>
              <span style="margin:0 8px;color:${C.hint};">·</span>
              <a href="https://getmodedeals.com/privacy" style="color:${C.muted};text-decoration:underline;">Privacy</a>
              <span style="margin:0 8px;color:${C.hint};">·</span>
              <a href="https://getmodedeals.com" style="color:${C.muted};text-decoration:underline;">View on web</a>
            </div>
            <div style="font-family:${SANS};font-size:10px;color:${C.hint};margin-top:14px;">© ${new Date().getFullYear()} Mode Mobile · Affiliate links may earn us a commission.</div>
          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>
</body></html>`;

await fs.writeFile(OUT, html, 'utf8');
const abs = path.resolve(OUT);
console.log(`\n[render] wrote ${abs}`);

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
