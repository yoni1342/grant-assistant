"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Copy,
  Download,
  X,
  AlertTriangle,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  Images,
} from "lucide-react";

interface IgPost {
  id: string;
  post_date: string;
  theme: string;
  caption: string | null;
  hashtags: string | null;
  slide_urls: string[];
  status: "generating" | "ready" | "failed";
  error_message: string | null;
  created_at: string;
}

// Flat shape used by the lightbox so any slide knows where it is in the global
// scroll-through-everything sequence. Built once from the props.
type FlatSlide = {
  url: string;
  postId: string;
  postDate: string;
  theme: string;
  caption: string | null;
  hashtags: string | null;
  slideIndex: number; // 0-based within its parent post
  totalInPost: number;
};

// Group posts by relative date band so the admin scans the gallery the way
// they'd browse a phone camera roll. Today / Yesterday get their own buckets;
// everything else is bucketed by ISO date string.
function bucketLabel(postDate: string): string {
  const today = new Date();
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(postDate + "T00:00:00");
  const diffDays = Math.floor((t.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)
    return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: t.getFullYear() === d.getFullYear() ? undefined : "numeric",
  });
}

export function IgPostsClient({ posts }: { posts: IgPost[] }) {
  const [openPost, setOpenPost] = useState<IgPost | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Mark the gallery as visited so the sidebar badge clears.
  useEffect(() => {
    if (posts[0]?.created_at) {
      localStorage.setItem("ig-posts:last-seen", posts[0].created_at);
    } else {
      localStorage.setItem("ig-posts:last-seen", new Date().toISOString());
    }
  }, [posts]);

  // Flatten every slide of every ready post into one ordered sequence so the
  // lightbox can scroll through the entire gallery one image at a time. Posts
  // come pre-sorted newest-first by the server; slides keep their carousel
  // order inside each post.
  const flatSlides = useMemo<FlatSlide[]>(() => {
    const out: FlatSlide[] = [];
    for (const p of posts) {
      const total = p.slide_urls.length;
      for (let i = 0; i < total; i++) {
        out.push({
          url: p.slide_urls[i],
          postId: p.id,
          postDate: p.post_date,
          theme: p.theme,
          caption: p.caption,
          hashtags: p.hashtags,
          slideIndex: i,
          totalInPost: total,
        });
      }
    }
    return out;
  }, [posts]);

  const grouped = useMemo(() => {
    const map = new Map<string, IgPost[]>();
    for (const p of posts) {
      const label = bucketLabel(p.post_date);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(p);
    }
    return Array.from(map.entries());
  }, [posts]);

  // Given a postId + slide index, find its flat-list position so we can open
  // the lightbox at the right point when a thumb is clicked.
  const flatIndexFor = useCallback(
    (postId: string, slideIndex: number) => {
      return flatSlides.findIndex(
        (s) => s.postId === postId && s.slideIndex === slideIndex,
      );
    },
    [flatSlides],
  );

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-black uppercase tracking-tight">
            Instagram Posts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daily generated carousels. Click a card for the grouped view, or use{" "}
            <strong>Browse all slides</strong> to flick through every image one
            at a time.
          </p>
        </div>
        {flatSlides.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLightboxIndex(0)}
          >
            <Images className="h-4 w-4 mr-1.5" /> Browse all slides (
            {flatSlides.length})
          </Button>
        )}
      </header>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <p>No posts yet — the daily cron will produce the first one at 7am.</p>
            <p className="text-xs mt-3 font-mono uppercase tracking-wider">
              Trigger manually: GET /api/cron/daily-ig-post (with bearer token)
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {grouped.map(([label, items]) => (
            <section key={label}>
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
                {label}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((p) => (
                  <PostCard key={p.id} post={p} onOpen={() => setOpenPost(p)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {openPost && (
        <PostDetailModal
          post={openPost}
          onClose={() => setOpenPost(null)}
          onSlideClick={(slideIndex) => {
            const idx = flatIndexFor(openPost.id, slideIndex);
            if (idx >= 0) setLightboxIndex(idx);
          }}
        />
      )}

      {lightboxIndex !== null && flatSlides[lightboxIndex] && (
        <LightboxViewer
          slides={flatSlides}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

function PostCard({
  post,
  onOpen,
}: {
  post: IgPost;
  onOpen: () => void;
}) {
  const thumb = post.slide_urls[0];
  return (
    <button
      onClick={onOpen}
      className="group text-left bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg hover:border-foreground/30 transition-all"
    >
      <div className="aspect-square bg-muted relative">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={post.theme}
            className="w-full h-full object-cover"
          />
        ) : post.status === "generating" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="font-mono text-xs uppercase tracking-wider">
              Generating…
            </span>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <span className="font-mono text-xs uppercase tracking-wider">
              Failed
            </span>
          </div>
        )}
        <span className="absolute top-2 left-2 font-mono text-[10px] uppercase tracking-[0.18em] bg-background/85 backdrop-blur px-2 py-1 rounded">
          {post.post_date}
        </span>
        {post.status === "ready" && (
          <span className="absolute top-2 right-2 font-mono text-[10px] uppercase tracking-[0.18em] bg-foreground text-background px-2 py-1 rounded">
            {post.slide_urls.length} slide{post.slide_urls.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
          Theme
        </p>
        <p className="text-sm font-medium line-clamp-1">{post.theme}</p>
        {post.caption && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
            {post.caption}
          </p>
        )}
      </div>
    </button>
  );
}

function PostDetailModal({
  post,
  onClose,
  onSlideClick,
}: {
  post: IgPost;
  onClose: () => void;
  onSlideClick: (slideIndex: number) => void;
}) {
  const [copied, setCopied] = useState<null | "caption" | "hashtags">(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const copy = async (text: string, which: "caption" | "hashtags") => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1800);
  };

  const downloadAll = async () => {
    for (let i = 0; i < post.slide_urls.length; i++) {
      const a = document.createElement("a");
      a.href = post.slide_urls[i];
      a.download = `fundory-${post.post_date}-slide-${String(i + 1).padStart(2, "0")}.png`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Slight stagger so the browser doesn't block subsequent downloads.
      await new Promise((r) => setTimeout(r, 200));
    }
  };

  const fullCaption = [post.caption, post.hashtags].filter(Boolean).join("\n\n");
  const total = post.slide_urls.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 sm:p-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg max-w-5xl w-full my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {post.post_date}
            </p>
            <h2 className="text-lg font-medium">{post.theme}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={downloadAll}>
              <Download className="h-4 w-4 mr-1.5" /> Download all
            </Button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {post.status === "failed" && post.error_message && (
          <div className="bg-destructive/10 text-destructive border-b border-destructive/20 px-5 py-3 text-sm">
            <strong>Generation failed:</strong> {post.error_message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-0">
          <div className="p-5 border-b lg:border-b-0 lg:border-r border-border">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2">
              {post.slide_urls.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => onSlideClick(i)}
                  className="block group relative cursor-zoom-in"
                  title={`Open slide ${i + 1} in viewer`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Slide ${i + 1}`}
                    className="w-full aspect-square object-cover rounded border border-border group-hover:border-foreground/40 transition"
                  />
                  <span className="absolute top-1.5 left-1.5 font-mono text-[9px] uppercase tracking-[0.18em] bg-background/85 backdrop-blur px-1.5 py-0.5 rounded">
                    {String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Caption
                </span>
                <button
                  onClick={() => copy(fullCaption, "caption")}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {copied === "caption" ? (
                    <>
                      <Check className="h-3 w-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copy full
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {post.caption || "—"}
              </p>
            </div>

            {post.hashtags && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Hashtags
                  </span>
                  <button
                    onClick={() => copy(post.hashtags!, "hashtags")}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {copied === "hashtags" ? (
                      <>
                        <Check className="h-3 w-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground break-words leading-relaxed">
                  {post.hashtags}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Fullscreen one-slide-at-a-time viewer. Navigates the full flat list of
// every slide across every post (newest first) so the admin can scroll
// through the whole gallery like a phone photo viewer.
function LightboxViewer({
  slides,
  index,
  onIndexChange,
  onClose,
}: {
  slides: FlatSlide[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const total = slides.length;
  const current = slides[index];

  const prev = useCallback(() => {
    onIndexChange((index - 1 + total) % total);
  }, [index, total, onIndexChange]);
  const next = useCallback(() => {
    onIndexChange((index + 1) % total);
  }, [index, total, onIndexChange]);

  // Keyboard: ← prev, → next, Esc close.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next, onClose]);

  // Lock body scroll while the viewer is open.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Preload the neighbouring images so prev/next feels instant.
  useEffect(() => {
    const preload = (i: number) => {
      const s = slides[(i + total) % total];
      if (!s) return;
      const img = new Image();
      img.src = s.url;
    };
    preload(index + 1);
    preload(index - 1);
  }, [index, slides, total]);

  const downloadCurrent = () => {
    const a = document.createElement("a");
    a.href = current.url;
    a.download = `fundory-${current.postDate}-slide-${String(current.slideIndex + 1).padStart(2, "0")}.png`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-5 py-3 text-white/90"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
            {index + 1} / {total}
          </span>
          <span className="mx-2 text-white/30">·</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
            {current.postDate}
          </span>
          <span className="mx-2 text-white/30">·</span>
          <span>{current.theme}</span>
          <span className="mx-2 text-white/30">·</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
            slide {current.slideIndex + 1}/{current.totalInPost}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCurrent}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20"
          >
            <Download className="h-4 w-4" /> Download
          </button>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Close viewer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Image stage — clicking outside the image closes the viewer */}
      <div className="flex-1 relative flex items-center justify-center px-4 sm:px-20 min-h-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.url}
          src={current.url}
          alt={`Slide ${current.slideIndex + 1} of ${current.theme}`}
          className="max-w-full max-h-full object-contain select-none"
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />

        {/* Prev */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 rounded-full p-3 bg-white/10 hover:bg-white/25 text-white transition"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Next */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 rounded-full p-3 bg-white/10 hover:bg-white/25 text-white transition"
          aria-label="Next slide"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* Bottom hint strip */}
      <footer
        className="px-5 py-3 text-center text-[10px] font-mono uppercase tracking-[0.22em] text-white/45"
        onClick={(e) => e.stopPropagation()}
      >
        ← / → keys to navigate · Esc to close · click outside the image to dismiss
      </footer>
    </div>
  );
}
