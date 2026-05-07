// Paste this into the "Render Email" Code node.
// Mode: Run Once for All Items · Language: JavaScript
//
// IMPORTANT: HERO_SLIDE_URL below must be a publicly-reachable image URL.
// The default points at the static hero-slide.png in the GitHub branch.
// To make it refresh daily with new deals, replace with a CDN URL whose
// content is rebuilt by your daily image-build job.

const HERO_SLIDE_URL = 'https://raw.githubusercontent.com/yoni1342/grant-assistant/getmodedeals-newsletter/n8n-getmodedeals/hero-slide.png';

const products = $input.all().map(i => i.json);

const C = {
  promo: '#4F46E5',
  ink: '#0F172A',
  body: '#374151',
  muted: '#6B7280',
  hint: '#9CA3AF',
  red: '#DC2626',
  border: '#E5E7EB',
  pageBg: '#F9FAFB',
  cardBg: '#FFFFFF',
  imgBg: '#F3F4F6',
};

const heroBg = '#1E1B4B';
const heroText = '#FFFFFF';
const heroSub = '#C7D2FE';
const heroKicker = '#A5B4FC';
const heroCta = '#FFFFFF';
const heroCtaText = '#1E1B4B';

const escapeHtml = (s) => String(s || '')
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
  const merchant = p.merchant ? escapeHtml(p.merchant) : null;
  const priceLabel = p.priceLabel ? escapeHtml(p.priceLabel) : null;
  const wasPriceLabel = p.wasPriceLabel ? escapeHtml(p.wasPriceLabel) : null;
  const discountPct = p.discountPct;

  const wasLine = wasPriceLabel
    ? `<span style="font-size:12px;color:${C.hint};text-decoration:line-through;display:block;line-height:1;margin-bottom:3px;">${wasPriceLabel}</span>`
    : '';
  const priceLine = priceLabel
    ? `<span style="font-size:20px;font-weight:800;color:${C.ink};line-height:1;">${priceLabel}</span>${discountPct ? `<span style="font-size:11px;font-weight:700;color:${C.red};margin-left:8px;letter-spacing:0.3px;">-${discountPct}%</span>` : ''}`
    : '';
  const priceBlock = priceLabel ? `${wasLine}${priceLine}` : '';
  const merchantTag = merchant
    ? `<span style="font-size:10px;font-weight:700;color:${C.red};letter-spacing:0.8px;text-transform:uppercase;">${merchant}</span>`
    : '';

  return `
  <td width="50%" valign="top" style="padding:6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" height="100%" style="height:100%;background-color:${C.cardBg};border:1px solid ${C.border};border-radius:8px;overflow:hidden;">
      <tr>
        <td align="center" valign="middle" height="180" style="height:180px;background-color:${C.imgBg};">
          <a href="${url}" style="text-decoration:none;display:block;line-height:0;">
            <img src="${image}" alt="" width="180" style="max-width:90%;max-height:160px;height:auto;display:inline-block;border:0;" />
          </a>
        </td>
      </tr>
      <tr><td style="padding:14px 14px 4px 14px;line-height:1;">${merchantTag}</td></tr>
      <tr>
        <td valign="top" style="padding:6px 14px 6px 14px;font-size:13px;line-height:1.35;color:${C.ink};min-height:36px;">
          <a href="${url}" style="color:${C.ink};text-decoration:none;font-weight:500;display:block;">${title}</a>
        </td>
      </tr>
      <tr><td height="100%" style="height:100%;line-height:1;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:6px 14px 16px 14px;">${priceBlock}</td></tr>
    </table>
  </td>`;
};

const rows = [];
for (let i = 0; i < products.length; i += 2) rows.push([products[i], products[i + 1]]);
const productRows = rows
  .map((pair) => `<tr>${cell(pair[0])}${cell(pair[1])}</tr>`)
  .join('\n<tr><td colspan="2" style="height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>\n');

const datePretty = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const subject = `Today's Top Deals — ${datePretty}`;

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="light"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:${C.pageBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.pageBg};">
  <tr><td align="center" style="padding:0;">
    <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background-color:${C.pageBg};">
      <tr>
        <td align="center" style="background-color:${C.promo};padding:11px 20px;font-size:12px;color:#FFFFFF;line-height:1.4;">
          Earn while you browse — every deal you redeem stacks Mode Points. Cash out anytime.
        </td>
      </tr>
      <tr>
        <td style="background-color:${C.cardBg};padding:18px 22px;border-bottom:1px solid ${C.border};">
          <a href="https://getmodedeals.com" style="text-decoration:none;color:${C.ink};">
            <span style="font-size:22px;font-weight:800;letter-spacing:-0.3px;">ModeDeals</span>
          </a>
          <span style="font-size:10px;color:${C.muted};margin-left:8px;letter-spacing:0.4px;">POWERED BY MODE MOBILE</span>
        </td>
      </tr>
      <tr>
        <td style="background-color:${heroBg};padding:32px 24px 28px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding-bottom:18px;">
                <span style="font-size:11px;color:${heroKicker};letter-spacing:1.6px;text-transform:uppercase;font-weight:700;">${escapeHtml(datePretty.toUpperCase())}</span>
                <h1 style="margin:8px 0 6px 0;font-size:30px;font-weight:800;color:${heroText};letter-spacing:-0.6px;line-height:1.1;">Today's Top Deals</h1>
                <p style="margin:0;font-size:14px;color:${heroSub};line-height:1.5;">${products.length} hand-picked finds, fresh from across the web</p>
              </td>
            </tr>
            <tr>
              <td align="center">
                <a href="https://getmodedeals.com" style="text-decoration:none;display:inline-block;line-height:0;">
                  <img src="${HERO_SLIDE_URL}" alt="Today's top deal" width="540" style="max-width:100%;height:auto;display:block;border:0;border-radius:8px;background-color:#FFFFFF;" />
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:20px;">
                <a href="https://getmodedeals.com" style="display:inline-block;background-color:${heroCta};color:${heroCtaText};padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;letter-spacing:0.2px;">Browse all deals &rarr;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 16px 8px 16px;background-color:${C.pageBg};">
          <h2 style="margin:0;font-size:18px;font-weight:800;color:${C.ink};letter-spacing:-0.2px;text-transform:uppercase;">Hand-picked deals</h2>
          <p style="margin:4px 0 0 0;font-size:12px;color:${C.muted};letter-spacing:0.3px;">Ranked by today's biggest discounts</p>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 10px 18px 10px;background-color:${C.pageBg};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${productRows}</table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:6px 16px 28px 16px;background-color:${C.pageBg};">
          <a href="https://getmodedeals.com" style="font-size:13px;color:${C.ink};text-decoration:none;font-weight:600;border-bottom:1px solid ${C.ink};padding-bottom:1px;">See all deals &rarr;</a>
        </td>
      </tr>
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
  </td></tr>
</table>
</body></html>`;

return [{ json: { subject, html, productCount: products.length, products } }];
