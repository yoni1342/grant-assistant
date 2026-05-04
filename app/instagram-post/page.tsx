import { FundoryCarousel } from "../../instagram_post/slides";

// Standalone preview for the launch carousel.
// /instagram-post              → all 7 slides scaled to fit screen
// /instagram-post?full=1       → all 7 slides at full 1080×1080 (for screenshot capture)
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ full?: string; scale?: string }>;
}) {
  const params = await searchParams;
  const full = params.full === "1";
  const scale = full ? 1 : params.scale ? Number(params.scale) : 0.5;
  return <FundoryCarousel scale={scale} />;
}
