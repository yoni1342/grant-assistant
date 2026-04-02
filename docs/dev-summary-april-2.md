Fundory AI — Developer Work Summary
Date: April 2, 2026
Developer: Yoni
Context: Continuing Round 2 & Round 3 QA fixes and implementing new features based on tester feedback from Dr. Kara Lock-Harris (KLH Business Solutions)

Summary

Building on yesterday's work (approximately 85% of Round 2 and Round 3 issues fixed), today I addressed the remaining critical and medium-priority items. The focus was on proposal generation safety, grant lifecycle management, usage tracking accuracy, eligibility scoring clarity, and n8n workflow fixes.

Below is a combined breakdown of all fixes across April 1 and April 2.


APRIL 1 FIXES
==============

1. Narratives — Save/Edit Persistence & Redesign (Critical Fix)

Tester Reference: Round 2 #2 (Critical, New Issue), Round 3 #2 (Critical, Persists from R2)
Tester said: "Edits to existing narratives and tags still do not persist after clicking Save Changes. Original content reverts upon reopening."

What was done:
- The entire Narratives section has been redesigned for better usability.
- You can now see all narratives in a clean table list.
- Clicking on any narrative opens a dedicated page where you can edit content, tags, and category directly.
- Changes to content, tags, and category now save reliably and stay saved.
- The document viewer now supports editing, saving, resetting, and exporting to PDF.
- Updates appear live even if you have the same narrative open in another tab.

How it works now:
Edit your narratives with confidence — your changes will persist correctly.


2. Discovery — Search Persistence (High Fix)

Tester Reference: Round 2 #14 (High, New Issue), Round 3 #18 (High, Persists from R2)
Tester said: "All search results and filter criteria were cleared when navigating away from Discovery. No session persistence for search state."

What was done:
- The Discovery page now remembers your search query, all filter selections, and previous results even after navigating away and returning.
- This works separately for each organization, so there is no mix-up between different accounts.

How it works now:
You can freely move around the app and return to Discovery without losing your search work.


3. Discovery — Expired Grant Flagging (Critical Fix)

Tester Reference: Round 2 #12 (Critical, New Issue)
Tester said: "Grant returned had application deadline of July 6, 2025 (expired). System did not flag or filter expired opportunities."

What was done:
- Expired grants are now clearly marked with a red "Expired" badge and warning icon.
- Grants without a proper title can no longer be added to the pipeline.

How it works now:
You will immediately see which grants are expired and avoid adding invalid ones.


4. Discovery — Multi-Select Filters (High Fix)

Tester Reference: Round 2 #8 (High, New Issue)
Tester said: "Only ONE option can be selected per filter category. Cannot combine e.g. 'Capacity Building' + 'General Operating Support'."

What was done:
- Filters now support multiple selections (for example, you can choose several funding categories or locations at once).
- A "Clear All Filters" button appears whenever filters are active.

How it works now:
You have much more flexibility when searching for grants that match your needs.


5. Discovery — No Results / Loading Stall Fix (High Fix)

Tester Reference: Round 2 #9 (High, New Issue)
Tester said: "System displayed 'Matching grants to your organization...' then stalled — no results, no 'no results found' message."

What was done:
- Added proper timeout handling so the loading state ends cleanly if the search takes too long.
- Added explicit "No grants found matching your search" messaging when no results are returned.
- Service errors show a distinct error message ("Failed to connect to search workflow").
- You will no longer see an endless loading message.

How it works now:
Searches complete gracefully with clear feedback. Users can distinguish between "no matches" and "service error."


6. Pipeline — Ghost Grant Prevention & Delete Functionality (Critical Fix)

Tester Reference: Round 3 #7 (Critical, Persists from R2), Round 3 #8 (Critical, New Issue), Round 3 #9 (Critical, Escalated)
Tester said: "A blank 'ghost' grant appeared in the pipeline under Discovered. No title, funder, description, or metadata." and "System allowed full interaction with blank ghost grant: opened record, displayed Generate Proposal button... generated a 'Not specified Proposal'."

What was done:
- Added validation to prevent grants without a title from being added.
- Added a Delete button on the grant detail page with a confirmation dialog.
- The manual "Add Grant" form now requires a title and gives warnings for other important missing fields.

How it works now:
Ghost grants are prevented, and you can easily delete any unwanted grant from the pipeline.


7. Pipeline — Grant Fields Now Editable (High Fix)

Tester Reference: Round 3 #14 (High, New Issue)
Tester said: "When opening the grant record: description field is not editable, no ability to add notes, attachments, external links, or eligibility criteria."

What was done:
- All main fields (title, funder, amount, deadline, description, source URL, notes) are now fully editable.
- Added a new "Additional Information" section where you can add eligibility requirements, focus areas, match percentage, and contact info.
- Added support for "Ongoing / Rolling" deadlines with a simple checkbox.

How it works now:
You can fully customize and update grant details directly in the pipeline.


8. Pipeline — Add Grant Dialog Redesign (High Fix)

Tester Reference: Round 3 #6 (Critical, Persists from R2)
Tester said: "Adding grants to pipeline initially failed for some entries with workflow errors. Subsequent attempts and refreshes created partial entries."

What was done:
- The "Add Grant" dialog has been completely redesigned and improved.
- It now properly connects to the screening workflow.
- Added clear required fields, warnings for recommended fields, support for custom fields, and "Ongoing" deadline option.
- The form resets cleanly after use and checks your daily grant limit.

How it works now:
Adding grants manually is smoother and more reliable.


9. n8n Workflow — "Add New Grants to Pipeline" Fix

Tester Reference: Round 2 #15 (Critical, New Issue)
Tester said: "Error returned: 'Failed to add grant to pipeline — Workflow returned empty response — check n8n logs'."

What was done:
- Reworked the background workflow to eliminate circular issues and make it more stable.
- The system now correctly inserts grants and triggers eligibility screening.

How it works now:
Adding grants (from Discovery or manually) flows more reliably into the pipeline.


10. Dashboard — Clickable Metrics & Deadline Views (Medium Fix)

Tester Reference: Round 3 #16 (Medium, New Issue)
Tester said: "Dashboard panels (Total Grants, Pending Deadlines, Pipeline stages) display counts and metrics but have no clickable links or drill-down functionality."

What was done:
- All metric cards are now clickable and take you directly to the relevant section:
  - Total Grants -> Pipeline
  - Active Deadlines -> Deadlines page
  - No Deadline -> New "No Deadline" page
  - Past Deadlines -> New "Past Deadlines" page
- Added two new metric cards (No Deadline and Past Deadlines).
- Created dedicated, filterable table pages for deadlines.

How it works now:
You can click any number on the dashboard to drill down and see the details.


11. Discovery — "Ongoing" Deadline Support (Medium Fix)

Tester Reference: Round 3 #14 (High, New Issue)
Tester said: "Fundory does not support 'Ongoing' as a deadline type — a significant gap given many grants have rolling deadlines."

What was done:
- "Ongoing / Rolling" is now fully supported across the app.
- You can mark grants as ongoing using a checkbox.
- Ongoing grants show a "Rolling" badge and appear correctly in deadline filters.

How it works now:
Grants with rolling deadlines are handled properly throughout the system.


12. Stripe Checkout — Production Mode Fix (Critical Fix)

What was done:
- Improved validation and error handling for customer IDs and checkout sessions.
- Added clear error messages and better logging in case anything goes wrong.

How it works now:
Billing and checkout should work reliably in production.


APRIL 2 FIXES
==============

13. Proposal Generation Validation — Ghost Grant Prevention (Critical Fix)

Tester Reference: Round 3 #9 (Critical, Escalated), Round 3 #10 (Critical, New Issue)
Tester said: "System allowed full interaction with blank ghost grant... upon approval — generated a 'Not specified Proposal' with funder shown as 'Not specified'. PDF contained placeholder fields."

What was done:
- Added frontend validation in the grant detail page — if you try to move a grant to "Drafting" stage and the title is empty, it blocks with an alert before the confirmation dialog even opens.
- Added backend validation in the webhook route — the "proposal-generation" service now looks up the grant by ID (scoped to the user's org) and rejects with a 400 error if the grant doesn't exist or has no title.
- Added a database constraint — a CHECK constraint (`grants_title_not_empty`) now prevents any grant with an empty or whitespace-only title from being saved at the database level. This is the last line of defense.

How it works now:
Three layers of protection ensure proposal generation never runs on a grant without a title: frontend alert, backend API rejection, and database constraint.


14. Archive System — Soft Delete for Pipeline Grants (Medium Fix)

Tester Reference: Round 3 #8 (Critical, New Issue)
Tester said: "No delete or remove functionality exists in the pipeline. Users cannot remove irrelevant, invalid, or failed grant entries. Pipeline accumulates unusable records with no way to clean up."

What was done:
- Added a new "archived" stage to the grant lifecycle. This required a database migration to add "archived" to the `grant_stage` enum.
- Replaced the red "Delete" button on the grant detail page with an orange "Archive" button. Clicking it sets the grant's stage to "archived" instead of permanently deleting it.
- Created a new Archive page at `/dashboard/archive` that lists all archived grants with three actions per grant:
  - View — opens the full grant detail page (under the Archive tab, not Pipeline)
  - Restore — moves the grant back to "Discovery" stage in the pipeline
  - Delete Permanently — hard deletes with a confirmation dialog
- Added "Archive" to the sidebar navigation between Proposals and Notifications.
- Archived grants are now filtered out everywhere they shouldn't appear:
  - Pipeline page (server query and client filter)
  - Dashboard metric counts (Total Grants, Active Deadlines, etc.)
  - Deadline sub-pages (Active Deadlines, No Deadline, Past Deadlines)
- The archive detail view opens under the Archive sidebar tab (not Pipeline), so navigation context stays correct.
- The archive button is hidden when viewing an already-archived grant.

How it works now:
Grants you don't want can be archived instead of deleted. Archived grants are invisible in the pipeline and dashboard but can be reviewed, restored, or permanently deleted from the Archive page.


15. Daily Grant Limit — Delete/Archive Bypass Fix (Medium Fix)

Tester Reference: Round 3 #17 (High, New Issue)
Tester said: "Dashboard and Discovery still displayed '0/1 grant used today' and '1 grant remaining' even after all 3 grants had been drafted. Counter did not update after grants were moved."

What was done:
- Created a new `grant_usage_log` table that records every grant addition with a timestamp. This table is append-only — entries are never removed when grants are deleted or archived.
- Updated the webhook route to insert into `grant_usage_log` every time a grant passes validation through "grant-screening".
- Updated both the backend limit check (webhook route) and the frontend usage API (`/api/grants/usage`) to count from `grant_usage_log` instead of the `grants` table.

How it works now:
The daily grant limit is based on how many grants were added today, regardless of whether those grants were later deleted or archived. Deleting or archiving a grant no longer frees up a slot.


16. Eligibility Screening — Insufficient Data Detection (Medium Fix)

Tester Reference: Round 3 #5 (High, New Issue)
Tester said: "Grant scored 28% overall... Scoring penalized KLH due to gaps in the grant's own data — not KLH's profile. Misleading to user." Recommended: "Distinguish between 'poor fit' and 'insufficient data' in eligibility scoring."

What was done:
- Updated the n8n eligibility screening prompt to include a new `dataQuality` field (`"sufficient"` or `"insufficient"`) and a new `INSUFFICIENT_DATA` value for `overallScore`. The LLM is now instructed to use these when the grant content is too sparse to evaluate meaningfully.
- Updated the n8n "Format Analysis Response" code node to detect the `dataQuality` and `INSUFFICIENT_DATA` values and store `data_quality` in the eligibility JSON.
- Updated the n8n routing condition ("Passes Eligibility?") to treat `INSUFFICIENT_DATA` the same as RED — these grants stay in "screening" stage and don't pass to "pending_approval".
- Updated the frontend in three places (grant detail page, list view, kanban view) to show a blue "Not Enough Info" badge instead of a red percentage score when `data_quality` is `"insufficient"`.

How it works now:
Grants with insufficient detail show a distinct blue "Not Enough Info" badge. Users can immediately see that the low score is due to missing grant data, not a genuine poor fit. The concerns and recommendations sections still explain what information is missing.


17. n8n Workflow — Field Fallback Fix for Screening Results

Tester Reference: Related to Round 3 #10 (Critical, New Issue)
Issue found during testing: When the AI returned "Not specified" for funder, amount, or deadline, the n8n code node did not fall back to the original grant data. Also, fallback field names were wrong (`scannerData.agency` instead of `scannerData.funder_name`, `scannerData.awardRange` instead of `scannerData.amount`).

What was done:
- Fixed the "Format Analysis Response" code node to use correct fallback field names from the original grant data.
- Added logic to treat AI responses of "Not specified" as empty, so the system falls back to the actual grant data entered by the user.

How it works now:
When you manually enter a grant with a funder and amount, those values are preserved even if the AI screening doesn't extract them from the description.


18. Discovery — Geographic Filter Added to Relevance Prompt

Tester Reference: Round 2 #11 (Critical, New Issue), Round 3 #4 (High, Persists from R2)
Tester said: "Result returned was 'U.S. Mission to Tunisia Annual Program Statement' — international diplomacy grant... Filter for Wisconsin and For-Profit was set — result still bypassed these."

What was done:
- Added a geographic filter rule to the n8n grant relevance filter prompt. The filter now checks if a grant's eligible geography matches the user's location filter and discards grants restricted to other states or countries.

How it works now:
Grants that don't match the user's geographic filter are now discarded by the relevance filter before being shown in results.


Database Migrations Run (April 2)

1. `ALTER TYPE grant_stage ADD VALUE IF NOT EXISTS 'archived'` — Added "archived" to the grant stage enum.
2. `ALTER TABLE grants ADD CONSTRAINT grants_title_not_empty CHECK (trim(title) <> '')` — Prevents empty titles at the database level.
3. `CREATE TABLE grant_usage_log (...)` — Tracks daily grant additions independently of grant deletions/archives.


COMPLETE STATUS — All Tester Issues
====================================

Round 2 Issues:
| # | Issue | Severity | Status |
|---|-------|----------|--------|
| R2-1 | Login & Navigation | Low | Fixed (was already working) |
| R2-2 | Narratives — Persistence (Existing) | Critical | Fixed (Fix #1) |
| R2-3 | Narratives — New Entry Save | Low | Fixed (was already working) |
| R2-4 | Narratives — Preview Panel | High | Fixed (Fix #1 — full redesign) |
| R2-5 | Narratives — Export PDF | Medium | Fixed (was already working) |
| R2-6 | Narratives — Tags (Edit Mode) | Critical | Fixed (Fix #1) |
| R2-7 | Discovery — Filters Added | Low | Fixed, improved with multi-select (Fix #4) |
| R2-8 | Discovery — Single Select Only | High | Fixed (Fix #4) |
| R2-9 | Discovery — No Results Feedback | High | Fixed (Fix #5) |
| R2-10 | Discovery — Over-Filtering / Logic | High | Partially fixed — no auto-broaden, but clear messaging |
| R2-11 | Discovery — Relevance of Results | Critical | Improved (Fix #18 — geographic filter added) |
| R2-12 | Discovery — Expired Grants | Critical | Fixed (Fix #3) |
| R2-13 | Discovery — Keyword Language | Medium | Not fixed — n8n workflow / search language gap |
| R2-14 | Discovery — State Not Persisted | High | Fixed (Fix #2) |
| R2-15 | Pipeline — Add to Pipeline | Critical | Fixed (Fix #9) |
| R2-16 | Pipeline — Notifications / Screening | High | Fixed — frontend/backend sync resolved |
| R2-17 | Proposals — Auto-Generation Without Org Confirm | High | Fixed — org confirmation dialog exists before proposal generation |

Round 3 Issues:
| # | Issue | Severity | Status |
|---|-------|----------|--------|
| R3-1 | Narrative Updates — Enhanced Content | Low | Fixed (Fix #1) |
| R3-2 | Narrative Save Bug — Edit Persistence | Critical | Fixed (Fix #1) |
| R3-3 | Discovery — GrantWatch vs Fundory Comparison | High | Not fixed — database coverage gap, needs more grant sources |
| R3-4 | Discovery — Irrelevant Results Returned | High | Improved (Fix #18 — geographic filter) |
| R3-5 | Discovery — Eligibility Scoring (Low Score Result) | High | Fixed (Fix #16 — insufficient data detection) |
| R3-6 | Pipeline — Add to Pipeline (Intermittent Failure) | Critical | Fixed (Fix #9) |
| R3-7 | Pipeline — Ghost Grant Created | Critical | Fixed (Fix #6, #13) |
| R3-8 | Pipeline — Cannot Delete Ghost or Low-Score Grants | Critical | Fixed (Fix #14 — archive system) |
| R3-9 | Pipeline — Ghost Grant Fully Actionable | Critical | Fixed (Fix #13 — proposal validation) |
| R3-10 | Proposal Generation — 'Not Specified Proposal' | Critical | Fixed (Fix #13, #17) |
| R3-11 | Proposal Generation — Narrative Integration (EOC) | Low | Working — narratives integrated into proposals |
| R3-12 | Proposal Quality — AI Jargon Still Present | Medium | Partially fixed — quality review detects jargon, but generation still produces it (n8n prompt tuning needed) |
| R3-13 | Proposal Generation — Not Tied to Grant Requirements | High | Not fixed — n8n workflow sends grantId only, proposals default to org narrative |
| R3-14 | Manual Grant Entry — Fields Not Editable | High | Fixed (Fix #7, #11) |
| R3-15 | Pipeline Integrity — Blank Record Counted in Metrics | High | Fixed (Fix #6, #13, #14) |
| R3-16 | Dashboard — No Clickable Hyperlinks | Medium | Fixed (Fix #10) |
| R3-17 | Daily Grant Counter — Not Syncing | High | Fixed (Fix #15) |
| R3-18 | Search Persistence — Results Lost on Navigation | High | Fixed (Fix #2) |


Remaining Items (Not Yet Fixed)
================================

| # | Issue | Severity | Tester Reference | Notes |
|---|-------|----------|------------------|-------|
| 1 | Proposals not tied to grant requirements | High | R3-13, R3-17 | Proposals default to org narrative only. Grant description, eligibility, and funder requirements are not included in the proposal generation payload. This is an n8n workflow change — the frontend sends grantId, and the n8n workflow needs to fetch and use the full grant data when generating. |
| 2 | GrantWatch vs Fundory coverage gap | High | R3-3 | GrantWatch returned 5 relevant results for the same search that Fundory returned 2. This is a database/content issue — needs more grant sources added to the n8n discovery workflows. Not a code fix. |
| 3 | Discovery keyword language mismatch | Medium | R2-13 | Program-based language returns more results than service-based language. Tester recommended providing search guidance or auto-translating org profile tags into funder language. Could add search tips in the UI or improve n8n keyword expansion. |
| 4 | Narrative version control | Medium | R2-2 (recommendation) | Tester recommended version control or "active narrative" toggle so users know which narrative version proposals use. Currently each edit overwrites the previous version with no history. |
| 5 | Saved/Recent Searches in Discovery | Medium | R2-14 (recommendation) | Tester recommended "Saved Searches" or "Recent Searches" functionality. Currently only session persistence exists — no persistent search history. |
| 6 | AI jargon in generated proposals | Low | R3-12 | Quality review tool detects jargon, but the proposal generation prompt still produces it. Requires n8n prompt tuning for the proposal generation workflow. |


Questions for the Tester (Carried Forward)
==========================================

Regarding Issue R2-13 (Discovery — Keyword Language):
The tester noted that program-based language (e.g. "workforce technology, digital literacy") returned more results than service-based language ("grant writing, consulting"). Would it be helpful to add search tips or example keywords in the Discovery UI to guide users toward more effective search terms?

Regarding Issue R3-13 (Proposals Not Tied to Grant Requirements):
The system currently sends the grant ID to the proposal generation workflow. The n8n workflow could be updated to fetch full grant data (description, eligibility criteria, funder requirements) and incorporate them into the proposal. Should we prioritize this for the next round?
