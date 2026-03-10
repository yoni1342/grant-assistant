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
  if (!validateWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body = await request.json();
    // Handle stringified JSON from n8n
    if (typeof body === "string") {
      body = JSON.parse(body);
    }
    const { action, data } = body;

    const supabase = createServiceClient();

    switch (action) {
      case "create_proposal": {
        const { sections, ...proposalData } = data;

        if (!proposalData.org_id) {
          return NextResponse.json(
            { error: "org_id is required for create_proposal" },
            { status: 400 },
          );
        }

        // Insert proposal
        const { data: proposal, error: proposalError } = await supabase
          .from("proposals")
          .insert(proposalData)
          .select("id")
          .single();

        if (proposalError) throw proposalError;

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

          const { error: sectionsError } = await supabase
            .from("proposal_sections")
            .insert(sectionsWithProposalId);

          if (sectionsError) throw sectionsError;
        }

        // Auto-create notification for proposal generation
        if (proposalData.org_id && proposalData.grant_id) {
          const proposalTitle = proposalData.title || "a grant";
          await supabase.from("notifications").insert({
            org_id: proposalData.org_id,
            grant_id: proposalData.grant_id,
            type: "proposal_generated",
            title: `Proposal generated for "${proposalTitle}"`,
            message: "The proposal draft is ready for review.",
          });
        }

        return NextResponse.json({
          success: true,
          proposal_id: proposal.id,
          sections_created: sections?.length || 0,
        });
      }

      case "update_grant": {
        const { grantid, org_id, ...updates } = data;

        // Extract screening_score from eligibility.confidence if present
        if (updates.eligibility?.confidence != null && updates.screening_score == null) {
          updates.screening_score = Number(updates.eligibility.confidence);
        }

        let query = supabase
          .from("grants")
          .update(updates)
          .eq("id", grantid);

        // Scope to org if provided (defense-in-depth)
        if (org_id) query = query.eq("org_id", org_id);

        const { data: grants, error } = await query.select();
        if (error) throw error;

        // Auto-create notifications for screening results and stage transitions
        if (grants?.[0] && org_id) {
          const grant = grants[0] as { title?: string; stage?: string; id?: string };
          const grantTitle = grant.title || "a grant";

          // Screening completed — check eligibility results
          if (updates.eligibility != null || updates.screening_score != null) {
            const eligible = updates.eligibility?.eligible !== false
              && updates.eligibility?.score !== "Not Eligible"
              && updates.eligibility?.indicator !== "not_eligible";

            if (!eligible) {
              await supabase.from("notifications").insert({
                org_id,
                grant_id: grantid,
                type: "grant_not_eligible",
                title: `"${grantTitle}" is not eligible`,
                message: updates.screening_notes || "The grant did not pass eligibility screening.",
              });
            } else {
              await supabase.from("notifications").insert({
                org_id,
                grant_id: grantid,
                type: "screening_completed",
                title: `Screening completed for "${grantTitle}"`,
                message: updates.screening_notes || null,
              });
            }
          }

          // Proposal generated
          if (updates.stage === "drafting" && updates.metadata?.proposal) {
            await supabase.from("notifications").insert({
              org_id,
              grant_id: grantid,
              type: "proposal_generated",
              title: `Proposal generated for "${grantTitle}"`,
              message: `The proposal draft is ready for review.`,
            });
          }
        }

        return NextResponse.json({
          success: true,
          grants: grants,
        });
      }

      case "insert_grants": {
        // Validate all grants have org_id
        const missingOrgId = data.grants.some((g: Record<string, unknown>) => !g.org_id);
        if (missingOrgId) {
          return NextResponse.json(
            { error: "org_id is required for all grants in insert_grants" },
            { status: 400 },
          );
        }

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
          .upsert(normalizedGrants, { onConflict: "org_id,source_id", ignoreDuplicates: true })
          .select("*");
        if (error) throw error;
        return NextResponse.json({
          success: true,
          grants: insertedGrants,
        });
      }

      case "update_workflow": {
        const { grantid, org_id, ...updates } = data;
        let query = supabase
          .from("workflow_executions")
          .update(updates)
          .eq("id", grantid);
        if (org_id) query = query.eq("org_id", org_id);
        const { error } = await query;
        if (error) throw error;
        break;
      }

      case "log_activity": {
        const { error } = await supabase.from("activity_log").insert(data);
        if (error) throw error;

        // Auto-create notification from activity log
        if (data.org_id && data.action) {
          const notifMap: Record<string, { type: string; title: string }> = {
            screening_started: {
              type: "screening_started",
              title: `Screening started for "${data.details?.grant_name || "a grant"}"`,
            },
            screening_completed: {
              type: "screening_completed",
              title: `Screening completed for "${data.details?.grant_name || "a grant"}"`,
            },
            grant_not_eligible: {
              type: "grant_not_eligible",
              title: `"${data.details?.grant_name || "A grant"}" is not eligible`,
            },
            proposal_started: {
              type: "proposal_started",
              title: `Proposal generation started for "${data.details?.grant_name || "a grant"}"`,
            },
            proposal_generated: {
              type: "proposal_generated",
              title: `Proposal generated for "${data.details?.grant_name || "a grant"}"`,
            },
          };
          const notif = notifMap[data.action];
          if (notif) {
            await supabase.from("notifications").insert({
              org_id: data.org_id,
              grant_id: data.grant_id || null,
              type: notif.type,
              title: notif.title,
              message: data.details?.summary || data.details?.message || null,
            });
          }
        }

        return NextResponse.json({
          success: true,
          grants: data,
        });
      }

      case "create_notification": {
        const { error } = await supabase.from("notifications").insert({
          org_id: data.org_id,
          grant_id: data.grant_id || null,
          type: data.type,
          title: data.title,
          message: data.message || null,
        });
        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      case "update_document": {
        const { id, org_id, ...updates } = data;
        let query = supabase
          .from("documents")
          .update(updates)
          .eq("id", id);
        if (org_id) query = query.eq("org_id", org_id);
        const { error } = await query;
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
        const { source_file_id, org_id, ...updates } = data;
        let query = supabase
          .from("documents")
          .update(updates)
          .eq("source_file_id", source_file_id);
        if (org_id) query = query.eq("org_id", org_id);
        const { error } = await query;
        if (error) throw error;
        break;
      }

      case "insert_proposal": {
        const { error } = await supabase
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
        const { id, org_id, ...updates } = data;
        let query = supabase
          .from("proposals")
          .update(updates)
          .eq("id", id);
        if (org_id) query = query.eq("org_id", org_id);
        const { error } = await query;
        if (error) throw error;
        break;
      }

      case "insert_funder": {
        const { error } = await supabase.from("funders").insert(data.funder);
        if (error) throw error;
        break;
      }

      case "update_funder": {
        const { id, org_id, ...updates } = data;
        let query = supabase
          .from("funders")
          .update(updates)
          .eq("id", id);
        if (org_id) query = query.eq("org_id", org_id);
        const { error } = await query;
        if (error) throw error;
        break;
      }

      case "insert_budget_narrative": {
        const { budget_id, org_id, narrative } = data;
        let query = supabase
          .from("documents")
          .update({ extracted_text: narrative, updated_at: new Date().toISOString() })
          .eq("id", budget_id);
        if (org_id) query = query.eq("org_id", org_id);
        const { error } = await query;
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
        const completedItems = items.filter((i: Record<string, unknown>) => i.completed).length;
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
        const { id, org_id, ...updates } = data;
        let query = supabase
          .from("awards")
          .update(updates)
          .eq("id", id);
        if (org_id) query = query.eq("org_id", org_id);
        const { error } = await query;
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
        const { id, org_id, ...updates } = data;
        let query = supabase
          .from("reports")
          .update(updates)
          .eq("id", id);
        if (org_id) query = query.eq("org_id", org_id);
        const { error } = await query;
        if (error) throw error;
        break;
      }

      case "list_documents": {
        const selectFields = data.include_content
          ? "id, name, file_type, category, ai_category, extraction_status, extracted_text, created_at"
          : "id, name, file_type, category, ai_category, extraction_status, created_at";

        let query = supabase
          .from("documents")
          .select(selectFields)
          .eq("org_id", data.org_id)
          .order("created_at", { ascending: false });

        if (data.category) {
          query = query.eq("category", data.category);
        }

        const { data: documents, error } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true, documents });
      }

      case "get_document": {
        let docQuery = supabase
          .from("documents")
          .select("id, org_id, name, title, file_type, category, ai_category, description, extracted_text, extraction_status, metadata, created_at, updated_at")
          .eq("id", data.document_id);
        if (data.org_id) docQuery = docQuery.eq("org_id", data.org_id);
        const { data: doc, error } = await docQuery.single();
        if (error) throw error;

        return NextResponse.json({ success: true, document: doc });
      }

      case "get_documents_content": {
        let query = supabase
          .from("documents")
          .select("id, name, file_type, category, ai_category, extracted_text, extraction_status")
          .eq("org_id", data.org_id)
          .eq("extraction_status", "completed");

        if (data.category) {
          query = query.eq("category", data.category);
        }
        if (data.document_ids && Array.isArray(data.document_ids)) {
          query = query.in("id", data.document_ids);
        }

        const { data: documents, error } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true, documents });
      }

      case "get_document_url": {
        // Look up the document to get its storage path
        let docQuery = supabase
          .from("documents")
          .select("id, name, file_type, file_path")
          .eq("id", data.document_id);
        if (data.org_id) docQuery = docQuery.eq("org_id", data.org_id);
        const { data: doc, error: docError } = await docQuery.single();

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

      case "extract_document_text": {
        const { document_id, org_id } = data;

        // Get document record (include category to route extracted text)
        let docQuery = supabase
          .from("documents")
          .select("id, name, file_type, file_path, category, org_id")
          .eq("id", document_id);
        if (org_id) docQuery = docQuery.eq("org_id", org_id);
        const { data: doc, error: docError } = await docQuery.single();
        if (docError) throw docError;

        // Download file from Supabase Storage
        const { data: fileData, error: dlError } = await supabase.storage
          .from("documents")
          .download(doc.file_path);
        if (dlError) throw dlError;

        let extractedText = "";
        const buffer = Buffer.from(await fileData.arrayBuffer());

        if (doc.file_type === "application/pdf") {
          const { extractText } = await import("unpdf");
          const pdfData = await extractText(new Uint8Array(buffer));
          // unpdf may return text as string or array of page strings
          const rawText = pdfData.text;
          extractedText = Array.isArray(rawText) ? rawText.join('\n') : rawText;
        } else if (
          doc.file_type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          // Basic DOCX extraction - pull text from XML inside the zip
          const JSZip = await import("jszip");
          const zip = await JSZip.loadAsync(buffer);
          const docXml = await zip.file("word/document.xml")?.async("string");
          if (docXml) {
            extractedText = docXml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          }
        } else {
          // For text-based formats, just decode
          extractedText = buffer.toString("utf-8");
        }

        // Update document with extracted text
        await supabase
          .from("documents")
          .update({
            extracted_text: extractedText,
            extraction_status: extractedText ? "completed" : "failed",
          })
          .eq("id", document_id);

        return NextResponse.json({
          success: true,
          document_id,
          file_name: doc.name,
          file_type: doc.file_type,
          extracted_text: extractedText,
          text_length: extractedText.length,
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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: errMsg },
      { status: 500 },
    );
  }
}
