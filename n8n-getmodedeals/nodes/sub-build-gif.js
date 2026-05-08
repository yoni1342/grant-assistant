/* eslint-disable @typescript-eslint/no-require-imports */
// Paste this into the "Build GIF" Code node of the
// "GetModeDeals: Build Feature GIF" sub-workflow.
// Mode: Run Once for All Items · Language: JavaScript
//
// What it does
// ------------
// 1. Receives the selected deals (one per input item).
// 2. Hashes the deal fingerprint to produce a stable cache key.
// 3. If /tmp/gmd-gifs/<hash>.gif already exists, skip the rebuild.
// 4. Otherwise: download each product image with the global fetch(),
//    generate per-deal frames with ImageMagick (`convert`), and
//    assemble the final GIF on disk.
// 5. Stamps `featureGifUrl` (the public webhook URL served by the
//    "Serve Feature GIF" companion workflow) onto every output item
//    so the downstream Render Email node can embed it.
//
// Host requirements
// -----------------
// - ImageMagick installed in the n8n container (provides `convert`).
// - n8n env: NODE_FUNCTION_ALLOW_BUILTIN=child_process,fs,crypto
//   (built-in `fetch` is available on Node 18+, no external module needed).
// - /tmp writable inside the container (it always is).

const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

const WEBHOOK_BASE = 'https://n8n.tebita.com/webhook/feature-gif';
const CACHE_DIR = '/tmp/gmd-gifs';

const W = 528, H = 600;
const PAPER = '#FFFFFF';
const INK = '#0F1729';
const MUTED = '#6B7280';
const PURPLE = '#463ACB';
const RED = '#EF4444';

const sh = (s) => String(s).replace(/(["\\$`])/g, '\\$1');
const im = (s) => sh(s).replace(/%/g, '%%');

async function downloadImage(urlStr, dest) {
  const res = await fetch(urlStr, {
    headers: { 'User-Agent': 'GetModeDeals-GIF-Builder/1.0' },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${urlStr}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return dest;
}

function buildOneFrame({ deal, dealNum, totalDeals, rawPath, subIdx, outPath }) {
  const dealLabel = `DEAL ${dealNum} OF ${totalDeals}`;
  const origPrice = deal.wasPriceLabel || '';
  const newPrice = deal.priceLabel || '';
  const discountText = deal.discountPct ? `${deal.discountPct}% OFF` : '';

  const productComp = `\\( "${rawPath}" -resize 360x360 -background '${PAPER}' -gravity center -extent 360x360 \\) -gravity north -geometry +0+85 -composite`;

  const parts = [
    'convert',
    `-size ${W}x${H} xc:'${PAPER}'`,
    `-fill '${PURPLE}' -draw "roundrectangle 184,30 344,62 6,6"`,
    `-fill white -font Nimbus-Sans-Bold -pointsize 11 -gravity north -annotate +0+38 "${im(dealLabel)}"`,
    productComp,
  ];

  if (origPrice) {
    parts.push(
      `-fill '${MUTED}' -stroke none -font Nimbus-Sans-Regular -pointsize 18 -gravity north -annotate +0+460 "${im(origPrice)}"`,
    );
  }

  if (subIdx >= 2 && origPrice) {
    parts.push(
      `-fill none -stroke '${RED}' -strokewidth 5 -draw "stroke-linecap round line 218,490 310,448"`,
      `-stroke none`,
    );
  }

  if (subIdx >= 3) {
    if (newPrice) {
      parts.push(
        `-fill '${INK}' -font Nimbus-Sans-Bold -pointsize 42 -gravity north -annotate +0+498 "${im(newPrice)}"`,
      );
    }
    if (discountText) {
      parts.push(
        `-fill '${RED}' -draw "roundrectangle 213,560 315,590 5,5"`,
        `-fill white -font Nimbus-Sans-Bold -pointsize 13 -gravity north -annotate +0+566 "${im(discountText)}"`,
      );
    }
  }

  parts.push(`"${outPath}"`);
  execSync(parts.join(' '), { stdio: 'pipe' });
}

// === Main ===

const items = $input.all();
const products = items.map((it) => it.json);

if (products.length === 0) {
  throw new Error('Build GIF: no input items');
}

const fingerprint = products
  .map((p) => `${p.id || ''}|${p.image || ''}|${p.priceLabel || ''}|${p.wasPriceLabel || ''}|${p.discountPct || 0}`)
  .join(';');
const hash = crypto.createHash('md5').update(fingerprint).digest('hex').slice(0, 12);

fs.mkdirSync(CACHE_DIR, { recursive: true });
const outPath = `${CACHE_DIR}/${hash}.gif`;
const featureGifUrl = `${WEBHOOK_BASE}/${hash}`;

if (fs.existsSync(outPath)) {
  return items.map((it) => ({
    json: { ...it.json, featureGifUrl, _gifCached: true, _gifHash: hash },
  }));
}

const dir = `/tmp/gmd-frames-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
fs.mkdirSync(dir, { recursive: true });

const dealRaws = [];
for (let i = 0; i < products.length; i++) {
  const raw = `${dir}/raw-${i}`;
  try {
    await downloadImage(products[i].image, raw);
    dealRaws.push(raw);
  } catch (e) {
    console.warn(`[build-gif] deal ${i + 1} download failed: ${e.message}`);
    dealRaws.push(null);
  }
}

const subDelays = [40, 35, 130]; // centiseconds; ~2.05s per deal
const framePaths = [];
const allDelays = [];

for (let dealIdx = 0; dealIdx < products.length; dealIdx++) {
  const deal = products[dealIdx];
  const raw = dealRaws[dealIdx];
  if (!raw) continue;
  for (let subIdx = 1; subIdx <= 3; subIdx++) {
    const out = `${dir}/deal-${dealIdx}-${subIdx}.png`;
    buildOneFrame({
      deal,
      dealNum: dealIdx + 1,
      totalDeals: products.length,
      rawPath: raw,
      subIdx,
      outPath: out,
    });
    framePaths.push(out);
    allDelays.push(subDelays[subIdx - 1]);
  }
}

if (framePaths.length === 0) {
  throw new Error('Build GIF: no frames generated (all image downloads failed)');
}

const gifParts = ['convert'];
for (let i = 0; i < framePaths.length; i++) {
  gifParts.push(`-delay ${allDelays[i]}`, `"${framePaths[i]}"`);
}
gifParts.push('-loop 0', '-layers optimize', `"${outPath}"`);
execSync(gifParts.join(' '), { stdio: 'pipe' });

fs.rmSync(dir, { recursive: true, force: true });

const stat = fs.statSync(outPath);
console.log(`[build-gif] wrote ${outPath} (${(stat.size / 1024).toFixed(0)} KB, ${framePaths.length} frames)`);

return items.map((it) => ({
  json: {
    ...it.json,
    featureGifUrl,
    _gifCached: false,
    _gifHash: hash,
    _gifSize: stat.size,
    _gifFrames: framePaths.length,
  },
}));
