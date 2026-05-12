-- Daily Instagram post generator
--
-- One row per generated post. The renderer writes seven PNGs into the
-- `ig-posts` storage bucket and stores their public URLs in `slide_urls`.
-- The admin gallery reads from here, grouped by `post_date`.

CREATE TABLE IF NOT EXISTS public.ig_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_date date NOT NULL,
  theme text NOT NULL,
  slide1_eyebrow text,
  slide1_headline_top text,
  slide1_headline_mid text,
  slide1_headline_bot text,
  slide1_subheadline text,
  slide1_briefing text,
  slide7_eyebrow text,
  slide7_headline_top text,
  slide7_headline_mid text,
  slide7_headline_accent text,
  slide7_headline_bot text,
  caption text,
  hashtags text,
  slide_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ig_posts_post_date ON public.ig_posts(post_date);
CREATE INDEX IF NOT EXISTS idx_ig_posts_created_at ON public.ig_posts(created_at DESC);

ALTER TABLE public.ig_posts ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read; service role bypasses RLS for cron writes.
CREATE POLICY "Platform admins can view ig_posts"
  ON public.ig_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_platform_admin = true
    )
  );

-- Public storage bucket so generated slide PNGs are linkable from the admin
-- gallery (and shareable to clipboard for the IG mobile upload flow).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ig-posts', 'ig-posts', true, 8388608, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read ig-posts bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ig-posts');
