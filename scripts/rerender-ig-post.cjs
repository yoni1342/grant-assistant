// Re-render a single ig_posts row in place: keep DB content, replace the
// PNGs in the ig-posts storage bucket. Useful when the renderer code or a
// static piece of slide copy (e.g. a domain) changes and we want the
// rendered images to catch up without re-rolling the dice for fresh copy.
//
// Usage:  node scripts/rerender-ig-post.cjs <postId>
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const puppeteer = require("puppeteer-core");

const POST_ID = process.argv[2];
if (!POST_ID) {
  console.error("usage: node scripts/rerender-ig-post.cjs <postId>");
  process.exit(1);
}

// Hand-parse .env.local — small and avoids dotenv as a dep.
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

(async () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data: row, error } = await supabase
    .from("ig_posts")
    .select("id, post_date, slide_plan")
    .eq("id", POST_ID)
    .single();
  if (error || !row) {
    console.error("DB read failed:", error?.message);
    process.exit(1);
  }
  console.log("Re-rendering", row.id, "·", row.slide_plan?.length, "slides");

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 8200, deviceScaleFactor: 2 });
  await page.goto(
    `http://localhost:3002/instagram-post?postId=${encodeURIComponent(POST_ID)}&full=1`,
    { waitUntil: "networkidle0", timeout: 60000 },
  );
  await new Promise((r) => setTimeout(r, 2000));

  const rects = await page.evaluate(() =>
    Array.from(document.querySelectorAll("div"))
      .filter((d) => {
        const s = d.getAttribute("style") || "";
        return (
          /width:\s*1080px/.test(s) &&
          /height:\s*1080px/.test(s) &&
          /position:\s*relative/.test(s)
        );
      })
      .map((d) => {
        const r = d.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      }),
  );
  console.log("captured", rects.length, "slides");

  const urls = [];
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    const png = await page.screenshot({
      type: "png",
      clip: {
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.w),
        height: Math.round(r.h),
      },
    });
    const path = `${row.post_date}/${row.id}/slide-${String(i + 1).padStart(2, "0")}.png`;
    const { error: upErr } = await supabase.storage
      .from("ig-posts")
      .upload(path, Buffer.from(png), {
        contentType: "image/png",
        cacheControl: "31536000",
        upsert: true,
      });
    if (upErr) throw new Error(`upload ${i + 1}: ${upErr.message}`);
    const { data: pub } = supabase.storage.from("ig-posts").getPublicUrl(path);
    urls.push(pub.publicUrl);
    console.log(`  ${i + 1}/${rects.length} ✓`);
  }
  await browser.close();

  const { error: updErr } = await supabase
    .from("ig_posts")
    .update({ slide_urls: urls })
    .eq("id", POST_ID);
  if (updErr) throw new Error(`final update: ${updErr.message}`);
  console.log("done.");
})().catch((err) => {
  console.error("fatal:", err.message);
  process.exit(1);
});
