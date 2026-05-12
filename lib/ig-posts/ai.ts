import { spawn } from "child_process";
import { z } from "zod";

// What the renderer needs to vary the cover + CTA for the day's post, plus the
// IG caption that ships with it. The brand-pillar slides (Reality / Stats /
// Aggregate / Validate / Compose) stay constant in design + copy — variation
// comes from which subset is included (slide_plan) and the cover/CTA copy.
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

export type PostType =
  | "introduction"
  | "pain-point"
  | "feature-spotlight"
  | "stat-highlight"
  | "marketing"
  | "industry-observation";

export type SlideId =
  | "solo"
  | "cover"
  | "reality"
  | "stats"
  | "aggregate"
  | "validate"
  | "compose"
  | "cta";

function postTypeBrief(postType: PostType): string {
  switch (postType) {
    case "introduction":
      return "Today is an INTRODUCTION post — frame Fundory for someone who's never heard of it. The cover should answer 'what is Fundory and who is it for?' rather than open with a pain point.";
    case "pain-point":
      return "Today is a PAIN-POINT post — open with a specific, visceral pain (a wasted week, a missed deadline, a rejected proposal) and position Fundory as the antidote.";
    case "feature-spotlight":
      return "Today is a FEATURE-SPOTLIGHT post — pick one capability (eligibility scoring, fragmented-source aggregation, funder-rubric-aligned drafting) and lead with what that one feature unlocks.";
    case "stat-highlight":
      return "Today is a STAT-HIGHLIGHT post — open with a single striking number (10K+ grants indexed, 85% target-match scoring, 15+ sources unified) and use the cover to make that number land.";
    case "marketing":
      return "Today is a MARKETING post — lead with an outcome the user gets (more grants won, hours saved, less guesswork). Confident, benefit-forward voice.";
    case "industry-observation":
      return "Today is an INDUSTRY-OBSERVATION post — a sharp take on the state of grant-seeking (e.g. why most templates lose, why eligibility is a coin flip). Editorial, slightly contrarian.";
  }
}

const SYSTEM_PROMPT_BASE = `You write daily Instagram cover/CTA copy for Fundory — a grant intelligence platform for non-profits and grant-writing agencies. Voice: editorial, confident, slightly tactical. No emojis in headlines. Headlines are short and impactful, set in giant uppercase display type.

Brand pillars you can lean on (pick one per post — vary which day-to-day):
- Time wasted on fragmented grant search
- Eligibility blind spots ("read the RFP, assume you qualify, lose three weeks")
- Generic templates that lose to funder-specific narratives
- Pipeline chaos (deadlines in inboxes, spreadsheets)
- The 6-dimension eligibility score
- 10K+ indexed grants across 15+ sources
- Funder-rubric-aligned proposal writing
- Specific personas: small non-profits, grant writers, multi-org agencies

The cover (slide 1) and CTA (slide 7) MUST feel like the same conversation — same angle, same voice. Vary phrasing, sentence structure, and chosen angle across days — repetition is the enemy of an editorial voice.`;

type CallOptions = {
  date: Date;
  postType: PostType;
  slidePlan: SlideId[];
};

// Spawns the local `claude` CLI in --print mode with --json-schema enforcing
// our shape. Auth is OAuth via the credentials in $HOME/.claude/.credentials.json
// — billed against the Max subscription, not an API key.
export async function generateDailyContent(
  opts: CallOptions,
): Promise<DailyContent> {
  const isoDate = opts.date.toISOString().slice(0, 10);
  const isSolo = opts.slidePlan.length === 1 && opts.slidePlan[0] === "solo";
  const hasCTA = opts.slidePlan.includes("cta");

  const systemPrompt =
    SYSTEM_PROMPT_BASE +
    `\n\nTODAY:\n- Date: ${isoDate}\n- ${postTypeBrief(opts.postType)}\n- Slide plan: ${opts.slidePlan.join(", ")} (${opts.slidePlan.length} slide${opts.slidePlan.length === 1 ? "" : "s"})\n` +
    (isSolo
      ? "- This is a SINGLE-SLIDE post. There is no swipe-through carousel. The cover copy must land standalone. Treat slide7 fields as a tight inline CTA tucked into the cover."
      : hasCTA
        ? "- There's a closing CTA slide. Use slide7 fields as a proper CTA — keep them in dialogue with the cover."
        : "- No closing CTA slide today. Keep slide7 fields concise; they'll be unused.");

  const userPrompt = `Write today's Instagram post copy following the slide plan and post type in the system prompt. Pick a fresh angle that hasn't been overdone. Output strictly matches the JSON schema.`;

  const jsonSchema = z.toJSONSchema(DailyContentSchema);

  return new Promise((resolve, reject) => {
    const proc = spawn(
      "claude",
      [
        "-p",
        "--no-session-persistence",
        "--output-format",
        "json",
        "--json-schema",
        JSON.stringify(jsonSchema),
        "--system-prompt",
        systemPrompt,
        "--tools",
        "",
        "--disable-slash-commands",
        userPrompt,
      ],
      {
        env: {
          ...process.env,
          // The cron process under PM2 inherits root's env; HOME must be set so
          // Claude Code finds /root/.claude/.credentials.json for OAuth.
          HOME: process.env.HOME ?? "/root",
        },
      },
    );

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(`claude exited ${code}: ${stderr.slice(0, 500)}`),
        );
      }
      let response: {
        is_error?: boolean;
        result?: string;
        structured_output?: unknown;
      };
      try {
        response = JSON.parse(stdout);
      } catch (e) {
        return reject(
          new Error(
            `Failed to parse claude output: ${(e as Error).message}. stdout head: ${stdout.slice(0, 500)}`,
          ),
        );
      }
      if (response.is_error) {
        return reject(new Error(`claude reported error: ${response.result}`));
      }
      const parsed = DailyContentSchema.safeParse(response.structured_output);
      if (!parsed.success) {
        return reject(
          new Error(`claude output failed schema: ${parsed.error.message}`),
        );
      }
      resolve(parsed.data);
    });
  });
}
