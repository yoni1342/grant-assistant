Fundory AI — Developer Work Summary
Date: April 2, 2026
Developer: Yoni
Context: Continuing Round 2 & Round 3 QA fixes and implementing new features based on tester feedback from Dr. Kara Lock-Harris (KLH Business Solutions)

Summary

Building on yesterday's work (approximately 85% of reported issues fixed), today I addressed the remaining critical and medium-priority items from the outstanding issues list. The focus was on proposal generation safety, grant lifecycle management, usage tracking accuracy, and eligibility scoring clarity.

Below is a breakdown of today's changes.


13. Proposal Generation Validation — Ghost Grant Prevention (Critical Fix)

Issue: A grant with no title, funder, or description could trigger proposal generation. The webhook only validated grants going through "grant-screening", not "proposal-generation".

What was done:

- Added frontend validation in the grant detail page — if you try to move a grant to "Drafting" stage and the title is empty, it blocks with an alert before the confirmation dialog even opens.
- Added backend validation in the webhook route — the "proposal-generation" service now looks up the grant by ID (scoped to the user's org) and rejects with a 400 error if the grant doesn't exist or has no title.
- Added a database constraint — a CHECK constraint (`grants_title_not_empty`) now prevents any grant with an empty or whitespace-only title from being saved at the database level. This is the last line of defense.

How it works now:
Three layers of protection ensure proposal generation never runs on a grant without a title: frontend alert, backend API rejection, and database constraint.


14. Archive System — Soft Delete for Pipeline Grants (Medium Fix)

Issue: The only way to remove a grant from the pipeline was a permanent hard delete. There was no way to mark a grant as "Not a Fit" or archive it for later review.

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

Issue: On the free tier, deleting or archiving a grant would reset the daily usage count, allowing users to add another grant even though they had already used their daily allowance.

What was done:

- Created a new `grant_usage_log` table that records every grant addition with a timestamp. This table is append-only — entries are never removed when grants are deleted or archived.
- Updated the webhook route to insert into `grant_usage_log` every time a grant passes validation through "grant-screening".
- Updated both the backend limit check (webhook route) and the frontend usage API (`/api/grants/usage`) to count from `grant_usage_log` instead of the `grants` table.

How it works now:
The daily grant limit is based on how many grants were added today, regardless of whether those grants were later deleted or archived. Deleting or archiving a grant no longer frees up a slot.


16. Eligibility Screening — Insufficient Data Detection (Medium Fix)

Issue: When a grant listing lacked detail (no description, no eligibility criteria, no target population), the screening would still score it numerically with a low/RED score. Users couldn't tell the difference between "this grant is a poor fit" and "there isn't enough information to assess this grant."

What was done:

- Updated the n8n eligibility screening prompt to include a new `dataQuality` field (`"sufficient"` or `"insufficient"`) and a new `INSUFFICIENT_DATA` value for `overallScore`. The LLM is now instructed to use these when the grant content is too sparse to evaluate meaningfully.
- Updated the n8n "Format Analysis Response" code node to detect the `dataQuality` and `INSUFFICIENT_DATA` values and store `data_quality` in the eligibility JSON.
- Updated the n8n routing condition ("Passes Eligibility?") to treat `INSUFFICIENT_DATA` the same as RED — these grants stay in "screening" stage and don't pass to "pending_approval".
- Updated the frontend in three places (grant detail page, list view, kanban view) to show a blue "Not Enough Info" badge instead of a red percentage score when `data_quality` is `"insufficient"`.

How it works now:
Grants with insufficient detail show a distinct blue "Not Enough Info" badge. Users can immediately see that the low score is due to missing grant data, not a genuine poor fit. The concerns and recommendations sections still explain what information is missing.


Database Migrations Run Today

1. `ALTER TYPE grant_stage ADD VALUE IF NOT EXISTS 'archived'` — Added "archived" to the grant stage enum.
2. `ALTER TABLE grants ADD CONSTRAINT grants_title_not_empty CHECK (trim(title) <> '')` — Prevents empty titles at the database level.
3. `CREATE TABLE grant_usage_log (...)` — Tracks daily grant additions independently of grant deletions/archives.


Updated Outstanding Items

| # | Issue | Status |
|---|-------|--------|
| 1 | Proposal generation validation | Fixed (today) |
| 2 | Proposals not tied to grant requirements | n8n workflow concern — grantId is sent, n8n can fetch full data |
| 3 | No archive/soft-delete option | Fixed (today) |
| 4 | Eligibility scoring — no "poor fit" vs "insufficient data" distinction | Fixed (today) |
| 5 | No results UX could be improved | Partially addressed — functional, minor polish remaining |
| 6 | Ghost grant prevention incomplete | Mostly fixed — title required at DB level, funder/description warned |
| 7 | Discovery relevance/keyword matching | n8n workflow concern — not a frontend fix |
| 8 | GrantWatch vs Fundory coverage gap | Content/data concern — needs more grant sources |


Remaining Items

- Strengthen ghost grant prevention further (make funder/description required, not just warned) — Low priority since title is now enforced at DB level.
- Improve no-results UX with more actionable messaging — Low priority, functional as-is.
- Grant database expansion — Content-related, not a code change.
- Discovery relevance quality — Depends on n8n workflow tuning and grant data sources.
