// Paste this into the "Render Email" Code node.
// Mode: Run Once for All Items · Language: JavaScript
//
// Editorial single-column layout, recolored + retyped to match
// getmodedeals.com — brand purple #463ACB CTAs, navy #003366 accents,
// sale red #EF4444 callouts, slate ink #0F1729 text, Plus Jakarta Sans
// headlines + Inter body via Google Fonts.
//
// The "GetModeDeals: Build Feature GIF" sub-workflow runs upstream and
// stamps each item with a `featureGifUrl` field. Falls back to a static
// committed asset for safety if the sub-workflow was skipped.

const FEATURE_GIF_FALLBACK = 'https://raw.githubusercontent.com/yoni1342/grant-assistant/getmodedeals-newsletter/public/feature.gif';

const products = $input.all().map(i => i.json);
const FEATURE_GIF_URL = products[0]?.featureGifUrl || FEATURE_GIF_FALLBACK;

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

// Neon-pastel pop palette — rotates per issue so each email has a different
// border + sticker-shadow color. Day-of-year drives the index so it's stable
// within a day but cycles automatically.
const NEON_PALETTE = [
  { bg: '#C6F432', ink: '#0F1729' }, // cyber lime
  { bg: '#FF6FA3', ink: '#FFFFFF' }, // hot pink
  { bg: '#3A8DFF', ink: '#FFFFFF' }, // electric blue
  { bg: '#FFD93D', ink: '#0F1729' }, // sunshine yellow
  { bg: '#B197FC', ink: '#0F1729' }, // lavender
];
const _yearStart = new Date(new Date().getFullYear(), 0, 0);
const dayOfYear = Math.floor((Date.now() - _yearStart.getTime()) / 86400000);
const accent = NEON_PALETTE[dayOfYear % NEON_PALETTE.length];
const tiltDeg = dayOfYear % 2 === 0 ? -2 : 2;
const labelTilt = dayOfYear % 2 === 0 ? 4 : -4;
const issueNum = String(dayOfYear).padStart(3, '0');
const MONO = "'JetBrains Mono','SF Mono',Menlo,Consolas,'Courier New',monospace";

const HEAD = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

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
<!--
  The yellow shadow page, white card, and "Look what we found" pill are
  all baked into the GIF itself (see sub-build-gif.js). This avoids the
  email-client CSS pitfalls (transform/position/box-shadow stripped by
  Gmail and Outlook) — every client just renders one image, identical
  to the dev preview.
-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:18px auto 26px auto;">
  <tr>
    <td style="line-height:0;font-size:0;">
      <a href="${escapeHtml(feature.url)}" style="display:block;line-height:0;text-decoration:none;">
        <img src="${escapeHtml(FEATURE_GIF_URL)}" alt="" width="460" style="width:460px;max-width:100%;height:auto;display:block;border:0;" />
      </a>
    </td>
  </tr>
</table>` : '';

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
      <!--
        Single 600-wide outer table containing every section as a row.
        Putting the cards as siblings inside the centred <td> made Gmail
        treat each card as a discrete trimmable block (the "..." +
        click-to-expand behaviour). One outer table reads as one email.
      -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

        <!-- Card 1: header + GIF -->
        <tr>
          <td style="background-color:${C.bg};border-radius:10px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
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
          </td>
        </tr>

        <!-- spacer -->
        <tr><td height="20" style="font-size:0;line-height:0;height:20px;">&nbsp;</td></tr>

        <!-- Card 2: hero details -->
        <tr>
          <td style="background-color:${C.bg};border-radius:10px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              ${heroDetails}
            </table>
          </td>
        </tr>

        <!-- spacer -->
        <tr><td height="20" style="font-size:0;line-height:0;height:20px;">&nbsp;</td></tr>

        <!-- Card 3: rest of the deals grid -->
        <tr>
          <td style="background-color:${C.bg};border-radius:10px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
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
          </td>
        </tr>

        <!-- Footer (no card chrome, sits on gray bg) -->
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

return [{ json: { subject, html, productCount: products.length, products } }];
