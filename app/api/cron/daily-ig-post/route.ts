import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateDailyContent } from "@/lib/ig-posts/openai";
import { renderSlides } from "@/lib/ig-posts/render";

// Daily Instagram-post generator.
//
// Runs once a day from the host crontab:
//   Bearer ${CRON_SECRET}
//   GET ${NEXT_PUBLIC_APP_URL}/api/cron/daily-ig-post
//
// Pipeline:
//   1. Insert ig_posts row (status=generating) so the admin gallery can show
//      progress and the renderer has a stable id to fetch dailyContent for.
//   2. Generate copy with gpt-4.1-mini, persist it on the row.
//   3. Render 7 PNGs by driving Puppeteer at the locally-running production
//      server at /instagram-post?postId=<id>.
//   4. Upload PNGs to the public ig-posts storage bucket, store their URLs.
//   5. Flip status to 'ready'. On any failure, store status='failed' + error.
//
// Idempotent per calendar day via the unique post_date constraint — calling
// it twice on the same day no-ops the second call.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date();
  const postDate = today.toISOString().slice(0, 10);

  // Has today's post already been generated successfully?
  const { data: existing } = await supabase
    .from("ig_posts")
    .select("id, status")
    .eq("post_date", postDate)
    .maybeSingle();

  if (existing?.status === "ready") {
    return NextResponse.json({
      skipped: true,
      reason: "post for today already exists",
      postId: existing.id,
    });
  }

  // Reserve the row up front so the renderer has a stable id to fetch the
  // dailyContent for. If a prior failed attempt exists, reuse its id.
  let postId: string;
  if (existing) {
    postId = existing.id;
    await supabase
      .from("ig_posts")
      .update({ status: "generating", error_message: null })
      .eq("id", postId);
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("ig_posts")
      .insert({ post_date: postDate, theme: "generating…", status: "generating" })
      .select("id")
      .single();
    if (insertError || !inserted) {
      return NextResponse.json(
        { error: `Failed to insert ig_posts row: ${insertError?.message}` },
        { status: 500 }
      );
    }
    postId = inserted.id;
  }

  try {
    // Step 1 — write copy
    const content = await generateDailyContent(today);
    const { error: copyError } = await supabase
      .from("ig_posts")
      .update({
        theme: content.theme,
        slide1_eyebrow: content.slide1.eyebrow,
        slide1_headline_top: content.slide1.headlineTop,
        slide1_headline_mid: content.slide1.headlineMid,
        slide1_headline_bot: content.slide1.headlineBot,
        slide1_subheadline: content.slide1.subheadline,
        slide1_briefing: content.slide1.briefing,
        slide7_eyebrow: content.slide7.eyebrow,
        slide7_headline_top: content.slide7.headlineTop,
        slide7_headline_mid: content.slide7.headlineMid,
        slide7_headline_accent: content.slide7.headlineAccent,
        slide7_headline_bot: content.slide7.headlineBot,
        caption: content.caption,
        hashtags: content.hashtags,
      })
      .eq("id", postId);
    if (copyError) throw new Error(`Failed to write copy: ${copyError.message}`);

    // Step 2 — render
    const buffers = await renderSlides(postId);
    if (buffers.length !== 7) {
      throw new Error(`Renderer returned ${buffers.length} slides, expected 7`);
    }

    // Step 3 — upload
    const slideUrls: string[] = [];
    for (let i = 0; i < buffers.length; i++) {
      const path = `${postDate}/${postId}/slide-${String(i + 1).padStart(2, "0")}.png`;
      const { error: uploadError } = await supabase.storage
        .from("ig-posts")
        .upload(path, buffers[i], {
          contentType: "image/png",
          cacheControl: "31536000",
          upsert: true,
        });
      if (uploadError) throw new Error(`Upload ${i + 1} failed: ${uploadError.message}`);
      const { data: publicUrl } = supabase.storage
        .from("ig-posts")
        .getPublicUrl(path);
      slideUrls.push(publicUrl.publicUrl);
    }

    // Step 4 — flip to ready
    const { error: finalError } = await supabase
      .from("ig_posts")
      .update({ slide_urls: slideUrls, status: "ready" })
      .eq("id", postId);
    if (finalError) throw new Error(`Final update failed: ${finalError.message}`);

    return NextResponse.json({
      ok: true,
      postId,
      theme: content.theme,
      slideUrls,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("ig_posts")
      .update({ status: "failed", error_message: message })
      .eq("id", postId);
    return NextResponse.json(
      { error: message, postId },
      { status: 500 }
    );
  }
}
