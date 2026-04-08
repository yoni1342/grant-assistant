import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { tourId } = await req.json();
  if (!tourId || typeof tourId !== "string") {
    return Response.json({ error: "Missing tourId" }, { status: 400 });
  }

  // Merge into existing preferences
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  const existing = (profile?.preferences as Record<string, unknown>) || {};
  const toursCompleted =
    (existing.tours_completed as Record<string, string>) || {};
  toursCompleted[tourId] = new Date().toISOString();

  const merged = { ...existing, tours_completed: toursCompleted };

  const { error } = await supabase
    .from("profiles")
    .update({ preferences: merged, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return Response.json({ error: "Failed to save" }, { status: 500 });
  }

  return Response.json({ success: true });
}
