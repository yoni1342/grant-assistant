// Per-deal mini-reveal GIF builder. Shared between local-pipeline.mjs
// (the dev preview pipeline) and the Next.js HTTP endpoint at
// /api/build-feature-gif (which the n8n sub-workflow calls).
//
// Each deal gets 3 sub-frames:
//   A) DEAL N OF M chip + product + original price gray (~0.4s)
//   B) + diagonal red pen-slash across original (~0.35s)
//   C) + new price slams in big + red % OFF badge — hold (~1.3s)
// All deals are concatenated in order, looping infinitely.

import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';

const W = 528;
const H = 600;
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
  if (!res.body) throw new Error(`empty body for ${urlStr}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
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

/**
 * Build the per-deal mini-reveal GIF.
 *
 * @param {object} opts
 * @param {Array}  opts.products    Selected deals (each: image, priceLabel, wasPriceLabel, discountPct, ...).
 * @param {string} opts.outPath     Where to write the resulting .gif.
 * @param {string} [opts.framesDir] Working directory for intermediate frames (default /tmp/gmd-frames-<rand>).
 * @returns {Promise<{ outPath: string, sizeBytes: number, frameCount: number }>}
 */
export async function buildFeatureGif({ products, outPath, framesDir }) {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('buildFeatureGif: products array required');
  }

  const dir = framesDir || `/tmp/gmd-frames-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(path.dirname(path.resolve(outPath)), { recursive: true });

  const dealRaws = [];
  for (let i = 0; i < products.length; i++) {
    const raw = `${dir}/raw-${i}`;
    try {
      await downloadImage(products[i].image, raw);
      dealRaws.push(raw);
    } catch (e) {
      console.warn(`[buildFeatureGif] deal ${i + 1} download failed: ${e.message}`);
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
    throw new Error('buildFeatureGif: no frames generated (all image downloads failed)');
  }

  const gifParts = ['convert'];
  for (let i = 0; i < framePaths.length; i++) {
    gifParts.push(`-delay ${allDelays[i]}`, `"${framePaths[i]}"`);
  }
  gifParts.push('-loop 0', '-layers optimize', `"${outPath}"`);
  execSync(gifParts.join(' '), { stdio: 'pipe' });

  const stat = await fs.stat(outPath);
  // Best-effort cleanup of frame dir
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});

  return { outPath, sizeBytes: stat.size, frameCount: framePaths.length };
}
