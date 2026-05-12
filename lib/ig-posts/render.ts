import puppeteer from "puppeteer-core";

// Hits the locally-running Next.js production server at /instagram-post and
// captures each 1080×1080 slide at 2× device scale (final PNGs are 2160×2160).
// The server must be reachable from this process — we look it up via
// IG_RENDER_BASE_URL (default http://localhost:3002).
export async function renderSlides(postId: string): Promise<Buffer[]> {
  const baseUrl =
    process.env.IG_RENDER_BASE_URL ?? "http://localhost:3002";
  const chromePath =
    process.env.CHROME_PATH ??
    process.env.PUPPETEER_EXECUTABLE_PATH ??
    "/usr/bin/google-chrome";

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 1080,
      height: 8200,
      deviceScaleFactor: 2,
    });
    await page.goto(
      `${baseUrl}/instagram-post?postId=${encodeURIComponent(postId)}&full=1`,
      { waitUntil: "networkidle0", timeout: 60000 }
    );
    // Give web fonts + the SVG logo a beat to fully decode.
    await new Promise((r) => setTimeout(r, 2000));

    const rects = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("div"));
      return all
        .filter((d) => {
          const style = d.getAttribute("style") || "";
          return (
            /width:\s*1080px/.test(style) &&
            /height:\s*1080px/.test(style) &&
            /position:\s*relative/.test(style)
          );
        })
        .map((d) => {
          const r = d.getBoundingClientRect();
          return { x: r.left, y: r.top, w: r.width, h: r.height };
        });
    });

    if (rects.length !== 7) {
      throw new Error(
        `Expected 7 slide containers, found ${rects.length} at ${baseUrl}/instagram-post`
      );
    }

    const buffers: Buffer[] = [];
    for (const r of rects) {
      const png = await page.screenshot({
        type: "png",
        omitBackground: false,
        clip: { x: r.x, y: r.y, width: r.w, height: r.h },
      });
      buffers.push(Buffer.from(png));
    }
    return buffers;
  } finally {
    await browser.close();
  }
}
