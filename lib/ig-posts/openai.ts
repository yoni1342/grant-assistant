import OpenAI from "openai";

// What the renderer needs to vary slide 1 (cover) and slide 7 (CTA) for the
// day's post, plus the IG caption that ships with it. The brand-pillar slides
// (Reality / Stats / Aggregate / Validate / Compose) stay constant.
export type DailyContent = {
  theme: string;
  slide1: {
    eyebrow: string;
    headlineTop: string;
    headlineMid: string;
    headlineBot: string;
    subheadline: string;
    briefing: string;
  };
  slide7: {
    eyebrow: string;
    headlineTop: string;
    headlineMid: string;
    headlineAccent: string;
    headlineBot: string;
  };
  caption: string;
  hashtags: string;
};

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

Each day, pick ONE focused angle and write copy around it. The cover (slide 1) and CTA (slide 7) should feel like the same conversation.`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["theme", "slide1", "slide7", "caption", "hashtags"],
  properties: {
    theme: {
      type: "string",
      description:
        "A 3-6 word internal label for today's angle (e.g. 'eligibility blind spots', 'time lost to fragmented search')",
    },
    slide1: {
      type: "object",
      additionalProperties: false,
      required: [
        "eyebrow",
        "headlineTop",
        "headlineMid",
        "headlineBot",
        "subheadline",
        "briefing",
      ],
      properties: {
        eyebrow: {
          type: "string",
          description:
            "Short kicker above the headline, uppercase, max 6 words. Example: 'On the cost of guesswork'",
        },
        headlineTop: {
          type: "string",
          description:
            "Top line of the giant cover headline. 1-2 words. Sets up the headline rhythm. Example: 'Stop'",
        },
        headlineMid: {
          type: "string",
          description:
            "Middle line of the cover headline. 1-2 words. Example: 'chasing'",
        },
        headlineBot: {
          type: "string",
          description:
            "Bottom line, rendered in outlined display type. 1-2 words ending in a period. Example: 'grants.'",
        },
        subheadline: {
          type: "string",
          description:
            "Smaller headline below, two-tone with an accent word. 3-5 words ending in a period. Example: 'Start winning them.'",
        },
        briefing: {
          type: "string",
          description:
            "1-2 sentence paragraph at the bottom of slide 1 reinforcing the angle. Max 220 chars.",
        },
      },
    },
    slide7: {
      type: "object",
      additionalProperties: false,
      required: [
        "eyebrow",
        "headlineTop",
        "headlineMid",
        "headlineAccent",
        "headlineBot",
      ],
      properties: {
        eyebrow: {
          type: "string",
          description:
            "Short kicker above the CTA headline, uppercase. Example: 'Now in early access'",
        },
        headlineTop: {
          type: "string",
          description: "Top line of CTA headline. 1-2 words.",
        },
        headlineMid: {
          type: "string",
          description: "Middle line. 2-3 words.",
        },
        headlineAccent: {
          type: "string",
          description:
            "Accent word rendered in brand orange. 1-2 words.",
        },
        headlineBot: {
          type: "string",
          description:
            "Last line, outlined display type. 1-2 words ending in a period.",
        },
      },
    },
    caption: {
      type: "string",
      description:
        "Instagram caption (2-4 short paragraphs, ~600-1200 chars total). No hashtags. Opens with a hook line, ends with a soft CTA pointing readers to the link in bio.",
    },
    hashtags: {
      type: "string",
      description:
        "8-12 hashtags as a single space-separated string (no commas). Mix big and niche. Example: '#grants #nonprofit #grantwriting ...'",
    },
  },
} as const;

export async function generateDailyContent(date: Date): Promise<DailyContent> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const client = new OpenAI({ apiKey });
  const isoDate = date.toISOString().slice(0, 10);

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.9,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Write today's Instagram post copy. Date: ${isoDate}. Pick a fresh angle that hasn't been overdone. Keep cover and CTA in dialogue with each other.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "daily_ig_content",
        strict: true,
        schema: RESPONSE_SCHEMA,
      },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI returned no content");
  }

  return JSON.parse(raw) as DailyContent;
}
