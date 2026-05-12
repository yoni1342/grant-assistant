import { FundoryCarousel, type DailyContent } from "../../instagram_post/slides";
import { createAdminClient } from "@/lib/supabase/server";

// Standalone preview + renderer surface for the launch carousel.
//   /instagram-post               → all 7 slides scaled to fit screen, static copy
//   /instagram-post?full=1        → 1080×1080 each (renderer/screenshot use)
//   /instagram-post?postId=<uuid> → load that day's generated copy from ig_posts
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ full?: string; scale?: string; postId?: string }>;
}) {
  const params = await searchParams;
  const full = params.full === "1";
  const scale = full ? 1 : params.scale ? Number(params.scale) : 0.5;

  let daily: DailyContent | undefined;
  if (params.postId) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("ig_posts")
      .select(
        "slide1_eyebrow, slide1_headline_top, slide1_headline_mid, slide1_headline_bot, slide1_subheadline, slide1_briefing, slide7_eyebrow, slide7_headline_top, slide7_headline_mid, slide7_headline_accent, slide7_headline_bot"
      )
      .eq("id", params.postId)
      .maybeSingle();
    if (data && data.slide1_headline_top) {
      daily = {
        slide1: {
          eyebrow: data.slide1_eyebrow ?? "",
          headlineTop: data.slide1_headline_top ?? "",
          headlineMid: data.slide1_headline_mid ?? "",
          headlineBot: data.slide1_headline_bot ?? "",
          subheadline: data.slide1_subheadline ?? "",
          briefing: data.slide1_briefing ?? "",
        },
        slide7: {
          eyebrow: data.slide7_eyebrow ?? "",
          headlineTop: data.slide7_headline_top ?? "",
          headlineMid: data.slide7_headline_mid ?? "",
          headlineAccent: data.slide7_headline_accent ?? "",
          headlineBot: data.slide7_headline_bot ?? "",
        },
      };
    }
  }

  return <FundoryCarousel scale={scale} daily={daily} />;
}
