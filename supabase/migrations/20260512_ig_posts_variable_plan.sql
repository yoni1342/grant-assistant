-- Variable slide-count + post-type variation for daily IG posts.
--
-- Up to here every post was a fixed 7-slide carousel. Now the cron rolls
-- weighted dice for slide count (1, 4, 5, 6, 7) and post type (introduction,
-- pain-point, feature-spotlight, stat-highlight, marketing, industry-
-- observation). slide_plan lists the slide IDs in render order so the carousel
-- knows which subset to draw, and the admin gallery can show the shape.

ALTER TABLE public.ig_posts
  ADD COLUMN IF NOT EXISTS slide_plan text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS post_type text;

-- Backfill: existing rows were full carousels.
UPDATE public.ig_posts
SET slide_plan = ARRAY['cover','reality','stats','aggregate','validate','compose','cta']
WHERE slide_plan = ARRAY[]::text[];
