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

// Canvas dimensions — outer = yellow page; inner white card is offset
// down + left so 14px of yellow page peeks through on right + bottom,
// reproducing the "two stacked sheets of paper" sticker look from the
// HTML preview. Pill sits at top-right, partially overlapping card top
// edge with a slight rotation.
const W = 540, H = 642;
const CARD_X = 0, CARD_Y = 28, CARD_W = 526, CARD_H = 600; // top-left corner of white card
const Y_OFF = CARD_Y; // shift product/price/etc. down by the pill space

const PAGE = '#FFD93D';
const PAPER = '#FFFFFF';
const INK = '#0F1729';
const MUTED = '#6B7280';
const PURPLE = '#463ACB';
const RED = '#EF4444';

const sh = (s) => String(s).replace(/(["\\$`])/g, '\\$1');
const im = (s) => sh(s).replace(/%/g, '%%');

function downloadImage(urlStr, dest) {
  // Use wget via execSync — reliable inside n8n's JsTaskRunner sandbox where
  // global fetch can fail silently on outbound HTTPS for some hosts.
  // -q quiet · --tries=1 fail fast · --timeout=15s · -O writes to dest path.
  // JSON.stringify gives us shell-safe quoting around the URL.
  execSync(`wget -q -O ${JSON.stringify(dest)} --tries=1 --timeout=15 -U 'GetModeDeals-GIF-Builder/1.0' ${JSON.stringify(urlStr)}`, { stdio: 'pipe' });
  const stat = fs.statSync(dest);
  if (stat.size === 0) throw new Error(`empty file written for ${urlStr}`);
  return dest;
}

function buildOneFrame({ deal, dealNum, totalDeals, rawPath, subIdx, outPath }) {
  const dealLabel = `DEAL ${dealNum} OF ${totalDeals}`;
  const origPrice = deal.wasPriceLabel || '';
  const newPrice = deal.priceLabel || '';
  const discountText = deal.discountPct ? `${deal.discountPct}% OFF` : '';

  const productComp = `\\( "${rawPath}" -resize 360x360 -background '${PAPER}' -gravity center -extent 360x360 \\) -gravity north -geometry +0+${85 + Y_OFF} -composite`;

  // Each chip is rendered as its own transparent sub-image (exact chip size)
  // so we can use `gravity center` to centre the text geometrically inside
  // the chip, regardless of font metrics. Then composite onto the main
  // canvas at the chip's top-left coordinate.
  const purpleChipSub = `\\( -size 160x32 xc:none -fill '${PURPLE}' -draw "roundrectangle 0,0 159,31 6,6" -fill white -font DejaVu-Sans-Bold -pointsize 11 -gravity center -annotate +0+0 "${im(dealLabel)}" \\) -gravity northwest -geometry +184+${30 + Y_OFF} -composite`;

  // Tilted "Look what we found" pill, generated as a transparent sub-image
  // then rotated and composited onto the top-right of the canvas.
  const pillSub = `\\( -size 200x32 xc:none -fill '${INK}' -draw "roundrectangle 0,0 199,31 16,16" -fill white -font DejaVu-Sans-Bold -pointsize 11 -gravity center -annotate +0+0 "${im('Look what we found')}" -background none -rotate -4 \\) -gravity northeast -geometry +6+8 -composite`;

  const parts = [
    'convert',
    `-size ${W}x${H} xc:'${PAGE}'`,
    `-fill '${PAPER}' -draw "rectangle ${CARD_X},${CARD_Y} ${CARD_X + CARD_W},${CARD_Y + CARD_H}"`,
    purpleChipSub,
    productComp,
  ];

  if (origPrice) {
    parts.push(
      `-fill '${MUTED}' -stroke none -font DejaVu-Sans -pointsize 18 -gravity north -annotate +0+${460 + Y_OFF} "${im(origPrice)}"`,
    );
  }

  if (subIdx >= 2 && origPrice) {
    parts.push(
      `-fill none -stroke '${RED}' -strokewidth 5 -draw "stroke-linecap round line 218,${490 + Y_OFF} 310,${448 + Y_OFF}"`,
      `-stroke none`,
    );
  }

  if (subIdx >= 3) {
    if (newPrice) {
      parts.push(
        `-fill '${INK}' -font DejaVu-Sans-Bold -pointsize 42 -gravity north -annotate +0+${498 + Y_OFF} "${im(newPrice)}"`,
      );
    }
    if (discountText) {
      // Same sub-image trick for the red discount chip — exact-size
      // transparent canvas + gravity center for perfect text centering.
      const redChipSub = `\\( -size 102x30 xc:none -fill '${RED}' -draw "roundrectangle 0,0 101,29 5,5" -fill white -font DejaVu-Sans-Bold -pointsize 13 -gravity center -annotate +0+0 "${im(discountText)}" \\) -gravity northwest -geometry +213+${560 + Y_OFF} -composite`;
      parts.push(redChipSub);
    }
  }

  // Pill goes LAST so it sits on top of everything else.
  parts.push(pillSub);

  parts.push(`"${outPath}"`);
  execSync(parts.join(' '), { stdio: 'pipe' });
}

// === Main ===

const items = $input.all();
const products = items.map((it) => it.json);

if (products.length === 0) {
  throw new Error('Build GIF: no input items');
}

// v3: chip text geometrically centred via sub-image gravity:center
const fingerprint = 'v3;' + products
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
const downloadErrors = [];
for (let i = 0; i < products.length; i++) {
  const raw = `${dir}/raw-${i}`;
  try {
    downloadImage(products[i].image, raw);
    dealRaws.push(raw);
  } catch (e) {
    downloadErrors.push(`#${i + 1} (${products[i].image}): ${e.message}`);
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
  throw new Error(`Build GIF: no frames generated. Download errors:\n${downloadErrors.join('\n')}`);
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
