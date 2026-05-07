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
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import https from 'node:https';

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

// ---------- Hero slide (static PNG) ----------
// Downloads the top deal's image and composites a single 580x320 slide with
// merchant tag at top + product image + indigo price strip at bottom. Static
// PNG so it works in every email client (no Outlook GIF quirks) and can be
// hosted as a single image without daily-rebuild infra.
const HERO_OUT = process.env.HERO_OUT || './hero-slide.png';
const FRAMES_DIR = '/tmp/gmd-frames';
await fs.mkdir(FRAMES_DIR, { recursive: true });

const downloadImage = (urlStr, dest) =>
  new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    https
      .get(urlStr, { timeout: 15000 }, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode} for ${urlStr}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => file.close(() => resolve(dest)));
        file.on('error', reject);
      })
      .on('error', reject);
  });

const sh = (s) => String(s).replace(/(["\\$`])/g, '\\$1');

const top = selected[0];
const rawTop = `${FRAMES_DIR}/raw-hero`;
console.log(`[hero] building static slide for top deal: ${top.title.slice(0, 60)}`);
try {
  await downloadImage(top.image, rawTop);
  const caption = top.discountPct
    ? `${top.priceLabel}  ·  ${top.discountPct}% OFF`
    : (top.priceLabel || '');
  // 580x320 slide: white top area for product, indigo strip at bottom for price.
  const cmd = [
    'convert',
    `-size 580x320 xc:'#FFFFFF'`,
    `-fill '#1E1B4B' -draw "rectangle 0,260 580,320"`,
    `\\( "${rawTop}" -resize 180x180 \\) -gravity north -geometry +0+50 -composite`,
    `-fill '#DC2626' -gravity north -font DejaVu-Sans-Bold -pointsize 11 -annotate +0+22 "${sh((top.merchant || '').toUpperCase())}"`,
    `-fill '#FFFFFF' -gravity south -font DejaVu-Sans-Bold -pointsize 22 -annotate +0+22 "${sh(caption)}"`,
    `"${HERO_OUT}"`,
  ].join(' ');
  execSync(cmd, { stdio: 'pipe' });
  console.log(`[hero] wrote ${path.resolve(HERO_OUT)}`);
} catch (e) {
  console.error(`[hero] failed: ${e.message}`);
}

// ---------- Render ----------
const escapeHtml = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Brand tokens — matched to getmodedeals.com
const C = {
  promo: '#4F46E5',     // top indigo bar
  ink: '#0F172A',       // primary text
  body: '#374151',      // body text
  muted: '#6B7280',     // secondary text
  hint: '#9CA3AF',      // strikethrough / fine print
  red: '#DC2626',       // SALE / merchant accent
  border: '#E5E7EB',
  pageBg: '#F9FAFB',
  cardBg: '#FFFFFF',
  imgBg: '#F3F4F6',
};

// Truncate at word boundary to a target length so every title fills ~2 lines
const truncateTitle = (s, max = 68) => {
  if (!s) return '';
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 30 ? lastSpace : max).trimEnd()}…`;
};

const cell = (p) => {
  if (!p) return '<td width="50%" style="padding:8px;"></td>';
  const url = escapeHtml(p.url);
  const title = escapeHtml(truncateTitle(p.title));
  const image = escapeHtml(p.image);
  const merchant = p.merchant ? escapeHtml(p.merchant) : null;
  const priceLabel = p.priceLabel ? escapeHtml(p.priceLabel) : null;
  const wasPriceLabel = p.wasPriceLabel ? escapeHtml(p.wasPriceLabel) : null;
  const discountPct = p.discountPct;

  const merchantTag = merchant
    ? `<span style="font-size:10px;font-weight:700;color:${C.red};letter-spacing:1px;text-transform:uppercase;">${merchant}</span>`
    : '<span style="font-size:10px;color:transparent;">.</span>';

  // SALE ribbon — corner overlay on image (uses table-cell trick for email safety)
  const saleRibbon = discountPct
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left" style="margin:10px 0 0 10px;"><tr><td style="background-color:${C.red};color:#FFFFFF;font-size:11px;font-weight:800;padding:4px 10px;border-radius:99px;letter-spacing:0.5px;">SALE</td></tr></table>`
    : '';

  const wasLine = wasPriceLabel
    ? `<span style="font-size:12px;color:${C.hint};text-decoration:line-through;line-height:1;">${wasPriceLabel}</span>`
    : '<span style="font-size:12px;color:transparent;">.</span>';
  const priceLine = priceLabel
    ? `<span style="font-size:22px;font-weight:800;color:${C.ink};line-height:1;">${priceLabel}</span>${discountPct ? `<span style="display:inline-block;background-color:${C.red};color:#FFFFFF;font-size:11px;font-weight:800;padding:3px 8px;border-radius:4px;margin-left:8px;letter-spacing:0.4px;vertical-align:2px;">-${discountPct}%</span>` : ''}`
    : '<span style="font-size:22px;color:${C.muted};font-weight:600;">See deal</span>';

  return `
  <td width="50%" valign="top" style="padding:6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.cardBg};border:1px solid ${C.border};border-radius:10px;overflow:hidden;">
      <!-- Image area (fixed 180px) with SALE ribbon -->
      <tr>
        <td valign="top" height="180" style="height:180px;background-color:${C.imgBg};position:relative;padding:0;">
          ${saleRibbon}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" valign="middle" height="180" style="height:180px;">
              <a href="${url}" style="text-decoration:none;display:block;line-height:0;">
                <img src="${image}" alt="" width="180" style="max-width:90%;max-height:160px;height:auto;display:inline-block;border:0;" />
              </a>
            </td>
          </tr></table>
        </td>
      </tr>
      <!-- Merchant tag (fixed 28px) -->
      <tr><td height="28" style="height:28px;padding:14px 14px 0 14px;line-height:1;">${merchantTag}</td></tr>
      <!-- Title (fixed 2 lines = 38px regardless of content length — bulletproof equal heights) -->
      <tr>
        <td valign="top" height="38" style="height:38px;padding:6px 14px 0 14px;font-size:13px;line-height:1.35;color:${C.ink};overflow:hidden;">
          <a href="${url}" style="color:${C.ink};text-decoration:none;font-weight:500;display:block;">${title}</a>
        </td>
      </tr>
      <!-- Was-price (fixed 16px) -->
      <tr><td height="16" style="height:16px;padding:8px 14px 0 14px;line-height:1;">${wasLine}</td></tr>
      <!-- Current price + discount pill (fixed 30px) -->
      <tr><td height="30" style="height:30px;padding:4px 14px 0 14px;line-height:1;">${priceLine}</td></tr>
      <!-- Shop button (fixed 50px including padding) -->
      <tr>
        <td style="padding:14px 14px 14px 14px;">
          <a href="${url}" style="display:block;background-color:${C.red};color:#FFFFFF;text-align:center;text-decoration:none;padding:11px 12px;border-radius:6px;font-weight:700;font-size:13px;letter-spacing:0.3px;">Shop Deal &rarr;</a>
        </td>
      </tr>
    </table>
  </td>`;
};

const rows = [];
for (let i = 0; i < selected.length; i += 2) rows.push([selected[i], selected[i + 1]]);
const productRows = rows
  .map((pair) => `<tr>${cell(pair[0])}${cell(pair[1])}</tr>`)
  .join('\n<tr><td colspan="2" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>\n');

const datePretty = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});
const subject = `Today's Top Deals — ${datePretty}`;

// Deeper indigo for the hero (richer than the promo bar)
const heroBg = '#1E1B4B';
const heroText = '#FFFFFF';
const heroSub = '#C7D2FE';
const heroKicker = '#A5B4FC';
const heroCta = '#FFFFFF';
const heroCtaText = '#1E1B4B';

const heroSlidePath = path.basename(HERO_OUT);

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="light"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:${C.pageBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.pageBg};">
  <tr>
    <td align="center" style="padding:0;">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background-color:${C.pageBg};">
        <!-- Promo bar -->
        <tr>
          <td align="center" style="background-color:${C.promo};padding:11px 20px;font-size:12px;color:#FFFFFF;line-height:1.4;">
            Earn while you browse — every deal you redeem stacks Mode Points. Cash out anytime.
          </td>
        </tr>
        <!-- Brand header -->
        <tr>
          <td style="background-color:${C.cardBg};padding:18px 22px;border-bottom:1px solid ${C.border};">
            <a href="https://getmodedeals.com" style="text-decoration:none;color:${C.ink};">
              <span style="font-size:22px;font-weight:800;letter-spacing:-0.3px;">ModeDeals</span>
            </a>
            <span style="font-size:10px;color:${C.muted};margin-left:8px;letter-spacing:0.4px;">POWERED BY MODE MOBILE</span>
          </td>
        </tr>
        <!-- HERO BLOCK with gradient -->
        <tr>
          <td style="background-color:${heroBg};background-image:linear-gradient(135deg,#1E1B4B 0%,#312E81 50%,#4F46E5 100%);padding:36px 24px 32px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding-bottom:22px;">
                  <span style="display:inline-block;background-color:rgba(255,255,255,0.12);color:${heroKicker};font-size:10px;letter-spacing:1.8px;text-transform:uppercase;font-weight:700;padding:5px 12px;border-radius:99px;">🔥 ${escapeHtml(datePretty.toUpperCase())}</span>
                  <h1 style="margin:14px 0 8px 0;font-size:34px;font-weight:900;color:${heroText};letter-spacing:-0.7px;line-height:1.05;">Today's Top Deals</h1>
                  <p style="margin:0;font-size:14px;color:${heroSub};line-height:1.5;">${selected.length} hand-picked finds &middot; up to <strong style="color:#FFFFFF;">${Math.max(...selected.map(p => p.discountPct || 0))}% off</strong></p>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <a href="https://getmodedeals.com" style="text-decoration:none;display:inline-block;line-height:0;">
                    <img src="${heroSlidePath}" alt="Today's top deal" width="540" style="max-width:100%;height:auto;display:block;border:0;border-radius:10px;background-color:#FFFFFF;" />
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-top:22px;">
                  <a href="https://getmodedeals.com" style="display:inline-block;background-color:${heroCta};color:${heroCtaText};padding:13px 30px;text-decoration:none;border-radius:6px;font-weight:800;font-size:14px;letter-spacing:0.3px;">Browse all deals &rarr;</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Section divider -->
        <tr>
          <td style="padding:32px 16px 4px 16px;background-color:${C.pageBg};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <span style="display:inline-block;background-color:${C.red};color:#FFFFFF;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:5px 11px;border-radius:99px;">★ Hand-picked</span>
                  <h2 style="margin:10px 0 0 0;font-size:22px;font-weight:900;color:${C.ink};letter-spacing:-0.4px;">${selected.length} deals · ranked by biggest savings</h2>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Product grid -->
        <tr>
          <td style="padding:14px 10px 18px 10px;background-color:${C.pageBg};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${productRows}</table>
          </td>
        </tr>
        <!-- See all link -->
        <tr>
          <td align="center" style="padding:6px 16px 28px 16px;background-color:${C.pageBg};">
            <a href="https://getmodedeals.com" style="font-size:13px;color:${C.ink};text-decoration:none;font-weight:600;border-bottom:1px solid ${C.ink};padding-bottom:1px;">See all deals &rarr;</a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:${C.cardBg};padding:24px 22px;border-top:1px solid ${C.border};text-align:center;font-size:11px;color:${C.muted};line-height:1.6;">
            <div style="font-size:14px;font-weight:800;color:${C.ink};margin-bottom:6px;">ModeDeals</div>
            <div style="margin-bottom:14px;color:${C.body};font-size:12px;">Smart deal discovery, powered by Mode Mobile.</div>
            <div style="font-size:11px;color:${C.muted};line-height:1.6;max-width:420px;margin:0 auto 12px;">
              You're getting this because you subscribed at GetModeDeals.com. We send one email per day with the freshest deals across the web — no fluff, no spam. <a href="{{unsubscribe_url}}" style="color:${C.muted};text-decoration:underline;">Unsubscribe anytime</a>.
            </div>
            <div style="font-size:11px;color:${C.muted};">
              <a href="https://getmodedeals.com" style="color:${C.muted};text-decoration:underline;">Visit site</a>
              &nbsp;&middot;&nbsp;
              <a href="{{unsubscribe_url}}" style="color:${C.muted};text-decoration:underline;">Unsubscribe</a>
              &nbsp;&middot;&nbsp;
              <a href="https://getmodedeals.com/privacy" style="color:${C.muted};text-decoration:underline;">Privacy</a>
            </div>
            <div style="margin-top:12px;color:${C.hint};">&copy; ${new Date().getFullYear()} Mode Mobile. Affiliate links may earn us a commission.</div>
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
