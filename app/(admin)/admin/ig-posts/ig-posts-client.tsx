"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Download, X, AlertTriangle, Loader2, Check } from "lucide-react";

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

  // Mark the gallery as visited so the sidebar badge clears.
  useEffect(() => {
    if (posts[0]?.created_at) {
      localStorage.setItem("ig-posts:last-seen", posts[0].created_at);
    } else {
      localStorage.setItem("ig-posts:last-seen", new Date().toISOString());
    }
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

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-display font-black uppercase tracking-tight">
          Instagram Posts
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Daily generated carousels. Click a card to view all 7 slides, copy the
          caption, or download the full PNG bundle for the IG mobile upload.
        </p>
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
        <PostDetailModal post={openPost} onClose={() => setOpenPost(null)} />
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
            7 slides
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
}: {
  post: IgPost;
  onClose: () => void;
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
                 
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block group relative"
                >
                  <img
                    src={url}
                    alt={`Slide ${i + 1}`}
                    className="w-full aspect-square object-cover rounded border border-border group-hover:border-foreground/40 transition"
                  />
                  <span className="absolute top-1.5 left-1.5 font-mono text-[9px] uppercase tracking-[0.18em] bg-background/85 backdrop-blur px-1.5 py-0.5 rounded">
                    {String(i + 1).padStart(2, "0")} / 07
                  </span>
                </a>
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
