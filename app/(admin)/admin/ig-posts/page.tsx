import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { IgPostsClient } from "./ig-posts-client";

export const dynamic = "force-dynamic";

export default async function AdminIgPostsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: posts } = await supabase
    .from("ig_posts")
    .select(
      "id, post_date, theme, caption, hashtags, slide_urls, status, error_message, created_at"
    )
    .order("post_date", { ascending: false });

  return (
    <div className="p-6">
      <IgPostsClient posts={posts || []} />
    </div>
  );
}
