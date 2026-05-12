import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// What the renderer needs to vary slide 1 (cover) and slide 7 (CTA) for the
// day's post, plus the IG caption that ships with it. The brand-pillar slides
// (Reality / Stats / Aggregate / Validate / Compose) stay constant.
const DailyContentSchema = z.object({
  theme: z
    .string()
    .describe(
      "A 3-6 word internal label for today's angle (e.g. 'eligibility blind spots', 'time lost to fragmented search')",
    ),
  slide1: z.object({
    eyebrow: z
      .string()
      .describe(
        "Short kicker above the headline, uppercase, max 6 words. Example: 'On the cost of guesswork'",
      ),
    headlineTop: z
      .string()
      .describe(
        "Top line of the giant cover headline. 1-2 words. Sets up the headline rhythm. Example: 'Stop'",
      ),
    headlineMid: z
      .string()
      .describe(
        "Middle line of the cover headline. 1-2 words. Example: 'chasing'",
      ),
    headlineBot: z
      .string()
      .describe(
        "Bottom line, rendered in outlined display type. 1-2 words ending in a period. Example: 'grants.'",
      ),
    subheadline: z
      .string()
      .describe(
        "Smaller headline below, two-tone with an accent word. 3-5 words ending in a period. Example: 'Start winning them.'",
      ),
    briefing: z
      .string()
      .describe(
        "1-2 sentence paragraph at the bottom of slide 1 reinforcing the angle. Max 220 chars.",
      ),
  }),
  slide7: z.object({
    eyebrow: z
      .string()
      .describe(
        "Short kicker above the CTA headline, uppercase. Example: 'Now in early access'",
      ),
    headlineTop: z.string().describe("Top line of CTA headline. 1-2 words."),
    headlineMid: z.string().describe("Middle line. 2-3 words."),
    headlineAccent: z
      .string()
      .describe("Accent word rendered in brand orange. 1-2 words."),
    headlineBot: z
      .string()
      .describe(
        "Last line, outlined display type. 1-2 words ending in a period.",
      ),
  }),
  caption: z
    .string()
    .describe(
      "Instagram caption (2-4 short paragraphs, ~600-1200 chars total). No hashtags. Opens with a hook line, ends with a soft CTA pointing readers to the link in bio.",
    ),
  hashtags: z
    .string()
    .describe(
      "8-12 hashtags as a single space-separated string (no commas). Mix big and niche. Example: '#grants #nonprofit #grantwriting ...'",
    ),
});

export type DailyContent = z.infer<typeof DailyContentSchema>;

const SYSTEM_PROMPT = `You write daily Instagram cover/CTA copy for Fundory — a grant intelligence platform for non-profits and grant-writing agencies. Voice: editorial, confident, slightly tactical. No emojis in headlines. Headlines are short and impactful, set in giant uppercase display type.

Brand pillars you can lean on for daily themes:
- Time wasted on fragmented grant search
- Eligibility blind spots ("read the RFP, assume you qualify, lose three weeks")
- Generic templates that lose to funder-specific narratives
- Pipeline chaos (deadlines in inboxes, spreadsheets)
- The 6-dimension eligibility score
- 10K+ indexed grants across 15+ sources
- Funder-rubric-aligned proposal writing
- Specific personas: small non-profits, grant writers, multi-org agencies

Each day, pick ONE focused angle and write copy around it. The cover (slide 1) and CTA (slide 7) should feel like the same conversation. Vary your phrasing, sentence structure, and chosen angle across days — repetition is the enemy of an editorial voice.`;

// Note on prompt caching: deliberately omitted. This function runs once per
// day, well past the 5-minute cache TTL, so a cache_control breakpoint would
// pay the write premium with zero reads.
export async function generateDailyContent(date: Date): Promise<DailyContent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const client = new Anthropic({ apiKey });
  const isoDate = date.toISOString().slice(0, 10);

  const response = await client.messages.parse({
    model: "claude-opus-4-7",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: zodOutputFormat(DailyContentSchema),
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Write today's Instagram post copy. Date: ${isoDate}. Pick a fresh angle that hasn't been overdone. Keep cover and CTA in dialogue with each other.`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Anthropic returned no parsed output");
  }
  return response.parsed_output;
}
