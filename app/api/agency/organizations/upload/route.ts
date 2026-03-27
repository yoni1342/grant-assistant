import { NextResponse } from "next/server";
import { createClient, getUserAgencyId, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { agencyId } = await getUserAgencyId(supabase);
  if (!agencyId) {
    return NextResponse.json({ error: "Not an agency user" }, { status: 403 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData();
  const orgId = formData.get("orgId") as string;
  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Verify org belongs to this agency
  const { data: org } = await adminClient
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .eq("agency_id", agencyId)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const narrativeFile = formData.get("narrativeFile") as File | null;
  const additionalFiles = formData.getAll("additionalFiles") as File[];

  const allFiles: { file: File; category: string }[] = [];
  if (narrativeFile && narrativeFile.size > 0) allFiles.push({ file: narrativeFile, category: "narrative" });
  for (const f of additionalFiles) {
    if (f && f.size > 0) allFiles.push({ file: f, category: "supporting" });
  }

  const errors: string[] = [];

  for (const { file, category } of allFiles) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${Date.now()}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminClient.storage
      .from("documents")
      .upload(path, buffer, { contentType: file.type, cacheControl: "3600", upsert: false });

    if (uploadError) {
      errors.push(`Failed to upload ${file.name}: ${uploadError.message}`);
      continue;
    }

    const { data: docData, error: dbError } = await adminClient
      .from("documents")
      .insert({
        org_id: orgId,
        title: file.name,
        name: file.name,
        file_path: path,
        file_type: file.type,
        file_size: file.size,
        category,
      })
      .select("id")
      .single();

    if (dbError) {
      errors.push(`Failed to save ${file.name}: ${dbError.message}`);
      continue;
    }

    // Trigger n8n document processing webhook
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        await fetch(`${process.env.N8N_WEBHOOK_URL}/process-document`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET || "",
          },
          body: JSON.stringify({
            document_id: docData.id,
            org_id: orgId,
            file_name: file.name,
            file_type: file.type,
            category,
          }),
        });
      } catch (err) {
        console.error("n8n document processing webhook failed:", err);
      }
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
