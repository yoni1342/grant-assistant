import type { PostType, SlideId } from "./ai";

// Weighted dice for daily post shape. Tweak the weights here to bias the mix
// — heavier carousels stay the default for the algorithm; single-slide posts
// are a rare break for variety.
const COUNT_WEIGHTS: Array<{ count: 1 | 4 | 5 | 6 | 7; weight: number }> = [
  { count: 1, weight: 8 },
  { count: 4, weight: 22 },
  { count: 5, weight: 25 },
  { count: 6, weight: 25 },
  { count: 7, weight: 20 },
];

const POST_TYPES: PostType[] = [
  "introduction",
  "pain-point",
  "feature-spotlight",
  "stat-highlight",
  "marketing",
  "industry-observation",
];

function pickWeighted<T>(items: Array<{ item: T; weight: number }>): T {
  const total = items.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const x of items) {
    if ((r -= x.weight) <= 0) return x.item;
  }
  return items[items.length - 1].item;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function rollPostPlan(): {
  slidePlan: SlideId[];
  postType: PostType;
} {
  const count = pickWeighted(
    COUNT_WEIGHTS.map(({ count, weight }) => ({ item: count, weight })),
  );

  const postType = POST_TYPES[Math.floor(Math.random() * POST_TYPES.length)];

  if (count === 1) return { slidePlan: ["solo"], postType };

  // The three feature slides are interchangeable narrative beats — pick a
  // random subset/order so 5- and 6-slide posts don't always feature the
  // same three in the same order.
  const features = shuffle<SlideId>(["aggregate", "validate", "compose"]);

  let slidePlan: SlideId[];
  if (count === 4) {
    // Cover → one feature → stats → CTA. Tight benefit-led shape.
    slidePlan = ["cover", features[0], "stats", "cta"];
  } else if (count === 5) {
    // Cover → reality → two features → CTA. Classic problem→solution arc.
    slidePlan = ["cover", "reality", features[0], features[1], "cta"];
  } else if (count === 6) {
    // Cover → reality → three features → CTA. Drop stats to keep the feature
    // arc breathable.
    slidePlan = ["cover", "reality", "aggregate", "validate", "compose", "cta"];
  } else {
    // Full carousel.
    slidePlan = [
      "cover",
      "reality",
      "stats",
      "aggregate",
      "validate",
      "compose",
      "cta",
    ];
  }
  return { slidePlan, postType };
}
