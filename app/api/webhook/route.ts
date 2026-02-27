import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// Use service-role client for n8n webhooks (bypasses RLS)
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function validateWebhookSecret(request: NextRequest): boolean {
  const secret = request.headers.get("x-webhook-secret");
  return secret === process.env.N8N_WEBHOOK_SECRET;
}

export async function POST(request: NextRequest) {
  // if (!validateWebhookSecret(request)) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    console.log("another hit");

    let body = await request.json();
    // 👇 handle stringified JSON from n8n
    if (typeof body === "string") {
      body = JSON.parse(body);
    }
    console.log("body received:", JSON.stringify(body)); // ← ADD THIS
    const { action, data } = body;
    console.log("action:", action); // ← ADD THIS
    console.log("data:", JSON.stringify(data)); // ← ADD THIS

    const supabase = createServiceClient();

    switch (action) {
      case "create_proposal": {
        const { sections, ...proposalData } = data;
        console.log("create_proposal - proposalData:", JSON.stringify(proposalData));
        console.log("create_proposal - sections count:", sections?.length);

        // Insert proposal
        const { data: proposal, error: proposalError } = await supabase
          .from("proposals")
          .insert(proposalData)
          .select("id")
          .single();

        console.log("create_proposal - proposal insert result:", JSON.stringify(proposal));
        if (proposalError) {
          console.error("create_proposal - proposal insert error:", JSON.stringify(proposalError));
          throw proposalError;
        }

        // Insert sections with proposal_id
        if (sections && sections.length > 0) {
          const sectionsWithProposalId = sections.map(
            (section: {
              title: string;
              content: string;
              sort_order: number;
            }) => ({
              ...section,
              proposal_id: proposal.id,
            }),
          );

          console.log("create_proposal - inserting sections, first section:", JSON.stringify(sectionsWithProposalId[0]));

          const { error: sectionsError } = await supabase
            .from("proposal_sections")
            .insert(sectionsWithProposalId);

          if (sectionsError) {
            console.error("create_proposal - sections insert error:", JSON.stringify(sectionsError));
            throw sectionsError;
          }
        }

        console.log("create_proposal - success, proposal_id:", proposal.id);
        return NextResponse.json({
          success: true,
          proposal_id: proposal.id,
          sections_created: sections?.length || 0,
        });
      }

      case "update_grant": {
        const { grantid, ...updates } = data;

        // Extract screening_score from eligibility.confidence if present
        if (updates.eligibility?.confidence != null && updates.screening_score == null) {
          updates.screening_score = Number(updates.eligibility.confidence);
        }

        const { data: grants, error } = await supabase
          .from("grants")
          .update(updates)
          .eq("id", grantid)
          .select();
        if (error) throw error;

        return NextResponse.json({
          success: true,
          grants: grants,
        });
      }

      case "insert_grants": {
        // Normalize grant data before insert
        const normalizedGrants = data.grants.map((g: Record<string, unknown>) => ({
          ...g,
          amount:
            !g.amount || g.amount === "$0 - $0" || g.amount === "$0" || g.amount === ""
              ? null
              : g.amount,
          deadline: g.deadline === "" ? null : g.deadline,
          description: g.description === "" ? null : g.description,
          stage: g.stage || "discovery",
        }));

        const { data: insertedGrants, error } = await supabase
          .from("grants")
          .insert(normalizedGrants)
          .select("*");
        if (error) throw error;
        return NextResponse.json({
          success: true,
          grants: insertedGrants,
        });
      }

      case "update_workflow": {
        const { grantid, ...updates } = data;
        const { error } = await supabase
          .from("workflow_executions")
          .update(updates)
          .eq("id", grantid);
        if (error) throw error;
        break;
      }

      case "log_activity": {
        const { error } = await supabase.from("activity_log").insert(data);
        if (error) throw error;
        return NextResponse.json({
          success: true,
          grants: data,
        });
      }

      case "update_document": {
        const { id, ...updates } = data;
        const { error } = await supabase
          .from("documents")
          .update(updates)
          .eq("id", id);
        if (error) throw error;
        break;
      }

      /**
       * WF4: Document Vault Manager - Insert New Document
       *
       * Creates a new document record when Google Drive files are added to the vault.
       * This replaces the old Plane issue creation for document tracking.
       *
       * Used by: WF4 (Document Vault Manager) - Node 8
       * Triggered when: A new file is detected in Google Drive that doesn't exist in Supabase
       */
      case "insert_document": {
        const { error } = await supabase.from("documents").insert(data);
        if (error) throw error;
        break;
      }

      /**
       * WF4: Document Vault Manager - Update Document by Google Drive File ID
       *
       * Updates existing document records using Google Drive file ID as the lookup key.
       * This handles the transition period where workflows still reference files by their
       * Google Drive ID instead of Supabase UUID.
       *
       * Why we need this: During migration from Plane to Supabase, workflows don't yet
       * know the Supabase document ID. Using source_file_id (Google Drive ID) allows
       * workflows to update documents without requiring a separate lookup step.
       *
       * Used by: WF4 (Document Vault Manager) - Node 7
       * Triggered when: An existing Google Drive file is updated and needs to sync to Supabase
       */
      case "update_document_by_file_id": {
        const { source_file_id, ...updates } = data;
        const { error } = await supabase
          .from("documents")
          .update(updates)
          .eq("source_file_id", source_file_id);
        if (error) throw error;
        break;
      }

      case "insert_proposal": {
        const { data: proposal, error } = await supabase
          .from("proposals")
          .insert(data.proposal)
          .select()
          .single();
        if (error) throw error;
        break;
      }

      case "insert_proposal_sections": {
        const { error } = await supabase
          .from("proposal_sections")
          .insert(data.sections);
        if (error) throw error;
        break;
      }

      case "update_proposal": {
        const { id, ...updates } = data;
        const { error } = await supabase
          .from("proposals")
          .update(updates)
          .eq("id", id);
        if (error) throw error;
        break;
      }

      case "insert_funder": {
        const { error } = await supabase.from("funders").insert(data.funder);
        if (error) throw error;
        break;
      }

      case "update_funder": {
        const { id, ...updates } = data;
        const { error } = await supabase
          .from("funders")
          .update(updates)
          .eq("id", id);
        if (error) throw error;
        break;
      }

      case "insert_budget_narrative": {
        const { budget_id, narrative } = data;
        const { error } = await supabase
          .from("budgets")
          .update({ narrative, updated_at: new Date().toISOString() })
          .eq("id", budget_id);
        if (error) throw error;
        break;
      }

      case "submission_complete": {
        const {
          grant_id,
          org_id,
          confirmation_number,
          portal_url,
          method,
          notes,
        } = data;
        const { error } = await supabase.from("submissions").insert({
          grant_id,
          org_id,
          confirmation_number,
          portal_url,
          method: method || "auto",
          status: "completed",
          submitted_at: new Date().toISOString(),
          notes,
        });
        if (error) throw error;
        break;
      }

      case "insert_checklist": {
        const { grant_id, org_id, items } = data;
        const totalItems = items.length;
        const completedItems = items.filter((i: any) => i.completed).length;
        const completion_percentage =
          totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        const { error } = await supabase.from("submission_checklists").upsert(
          {
            grant_id,
            org_id,
            items,
            completion_percentage,
          },
          { onConflict: "grant_id" },
        );
        if (error) throw error;
        break;
      }

      case "insert_award": {
        const {
          grant_id,
          org_id,
          amount,
          award_date,
          start_date,
          end_date,
          requirements,
        } = data;
        const { error } = await supabase.from("awards").insert({
          grant_id,
          org_id,
          amount,
          award_date,
          start_date,
          end_date,
          requirements,
        });
        if (error) throw error;
        break;
      }

      case "update_award": {
        const { id, ...updates } = data;
        const { error } = await supabase
          .from("awards")
          .update(updates)
          .eq("id", id);
        if (error) throw error;
        break;
      }

      case "insert_report": {
        const {
          award_id,
          grant_id,
          org_id,
          report_type,
          title,
          content,
          due_date,
          status,
        } = data;
        const { error } = await supabase.from("reports").insert({
          award_id,
          grant_id,
          org_id,
          report_type,
          title,
          content,
          due_date,
          status,
        });
        if (error) throw error;
        break;
      }

      case "update_report": {
        const { id, ...updates } = data;
        const { error } = await supabase
          .from("reports")
          .update(updates)
          .eq("id", id);
        if (error) throw error;
        break;
      }

      case "list_documents": {
        let query = supabase
          .from("documents")
          .select("id, name, file_type, category, ai_category, created_at")
          .eq("org_id", data.org_id)
          .order("created_at", { ascending: false });

        if (data.category) {
          query = query.eq("category", data.category);
        }

        const { data: documents, error } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true, documents });
      }

      case "get_document_url": {
        // Look up the document to get its storage path
        const { data: doc, error: docError } = await supabase
          .from("documents")
          .select("id, name, file_type, file_path")
          .eq("id", data.document_id)
          .single();

        if (docError) throw docError;

        // Generate a signed URL using the service client
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from("documents")
          .createSignedUrl(doc.file_path, 3600);

        if (urlError) throw urlError;

        return NextResponse.json({
          success: true,
          url: signedUrlData.signedUrl,
          name: doc.name,
          file_type: doc.file_type,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
