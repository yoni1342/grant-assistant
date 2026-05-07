// Paste this into the "Normalize" Code node.
// Mode: Run Once for Each Item · Language: JavaScript

const item = $input.item.json;

const stripHtml = (s) => String(s || '')
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

const title = stripHtml(item.title && item.title.rendered);
const content = stripHtml(item.content && item.content.rendered);
const excerpt = stripHtml(item.excerpt && item.excerpt.rendered);
const searchSpace = `${content} ${title}`;

const eqMatch = searchSpace.match(/=\s*\$([0-9,]+(?:\.\d{2})?)/);
const forMatch = searchSpace.match(/for\s+\$([0-9,]+(?:\.\d{2})?)/i);
const titleDollar = title.match(/\$([0-9,]+(?:\.\d{2})?)/);
const finalPriceStr = (eqMatch && eqMatch[1]) || (forMatch && forMatch[1]) || (titleDollar && titleDollar[1]) || null;
const finalPrice = finalPriceStr ? parseFloat(finalPriceStr.replace(/,/g, '')) : null;

const firstDollar = content.match(/\$([0-9,]+(?:\.\d{2})?)/);
const wasPriceStr = (firstDollar && finalPriceStr && firstDollar[1] !== finalPriceStr) ? firstDollar[1] : null;
const wasPrice = wasPriceStr ? parseFloat(wasPriceStr.replace(/,/g, '')) : null;

const pctMatch = content.match(/(\d{1,2})\s*%\s*off/i);
let discountPct = pctMatch ? parseInt(pctMatch[1], 10) : null;
if (discountPct == null && wasPrice && finalPrice && wasPrice > finalPrice) {
  discountPct = Math.round(((wasPrice - finalPrice) / wasPrice) * 100);
}

const viaMatch = content.match(/^([A-Za-z0-9 .&'-]{2,40})\s+Via\s+Amazon/);
const merchant = (viaMatch && viaMatch[1].trim()) || (/\bAmazon\b/i.test(content) ? 'Amazon' : null);

const featured = item._embedded && item._embedded['wp:featuredmedia'] && item._embedded['wp:featuredmedia'][0];
const image = featured && featured.source_url ? featured.source_url : null;

const blurb = excerpt.length > 140 ? excerpt.slice(0, 137) + '...' : excerpt;
const category = (item.product_cat && item.product_cat[0]) != null ? item.product_cat[0] : null;

return {
  json: {
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
    date: item.date
  }
};
