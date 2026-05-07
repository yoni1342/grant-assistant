// Paste this into the "Top 8" node — but FIRST change its type from
// "Limit" to "Code". Easiest way: delete the Limit node, drop in a new
// Code node in its place, name it "Rank & Select Top 8", paste this in.
// Mode: Run Once for All Items · Language: JavaScript

const TARGET_COUNT = 8;
const MIN_COUNT = 4;

const products = $input.all().map(i => i.json);

// Dedupe by URL
const seen = new Set();
const deduped = [];
for (const p of products) {
  if (!p.url || seen.has(p.url)) continue;
  seen.add(p.url);
  deduped.push(p);
}

// Score: discount-weighted, with recency tiebreaker bonus
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

// Category diversity: cap per-category at ceil(N/2), but only when 3+ distinct cats present
const distinctCats = new Set(ranked.map((p) => p.category != null ? p.category : 'none'));
const enforceDiversity = distinctCats.size >= 3;
const perCatCap = Math.ceil(TARGET_COUNT / 2);
const perCat = new Map();
const selected = [];

for (const p of ranked) {
  const cat = p.category != null ? p.category : 'none';
  const used = perCat.get(cat) || 0;
  if (enforceDiversity && used >= perCatCap) continue;
  selected.push(p);
  perCat.set(cat, used + 1);
  if (selected.length >= TARGET_COUNT) break;
}

// QA gate: throw if minimum not met (Error Trigger workflow catches this)
if (selected.length < MIN_COUNT) {
  throw new Error(`QA gate failed: only ${selected.length} valid deals after selection, minimum ${MIN_COUNT}`);
}

return selected.map(p => ({ json: p }));
