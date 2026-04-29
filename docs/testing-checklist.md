# Fundory — Complete Testing Checklist

> **Purpose:** Walk through every feature in the app, page by page, in the order a real user experiences them. Nothing should be skipped. Each item is a discrete testable action.
>
> **How to use:** Go through each flow in order. Check off each item as you test it. If a test fails, note the issue inline.
>
> **Last revision:** 2026-04-29 — refreshed to cover changes since 2026-04-17, including the website-to-narratives onboarding mode + 5-step wizard, pipeline added-date column, inline (non-blocking) proposal generation, live Stripe MRR on admin overview, source-analytics charts + date range filter, hourly per-org grant fetch with 24h cooldown, grant digest email, and three new admin pages (Org Pickup, Fetch Queue, System Errors).

---

## Table of Contents

1. [Flow 1: Registration (New User)](#flow-1-registration-new-user)
2. [Flow 2: Login & Authentication](#flow-2-login--authentication)
3. [Flow 3: Organization Status Gates](#flow-3-organization-status-gates)
4. [Flow 4: Onboarding Tour](#flow-4-onboarding-tour)
5. [Flow 5: Dashboard](#flow-5-dashboard)
6. [Flow 6: Discovery](#flow-6-discovery)
7. [Flow 7: Pipeline — Kanban & List Views](#flow-7-pipeline--kanban--list-views)
8. [Flow 8: Pipeline — Grant Detail](#flow-8-pipeline--grant-detail)
9. [Flow 9: Pipeline — Add Grant Manually](#flow-9-pipeline--add-grant-manually)
10. [Flow 10: Documents](#flow-10-documents)
11. [Flow 11: Narratives](#flow-11-narratives)
12. [Flow 12: Proposals](#flow-12-proposals)
13. [Flow 13: Submissions](#flow-13-submissions)
14. [Flow 14: Awards & Reporting](#flow-14-awards--reporting)
15. [Flow 15: Notifications](#flow-15-notifications)
16. [Flow 16: Grant Source Directory](#flow-16-grant-source-directory)
17. [Flow 17: Analytics](#flow-17-analytics)
18. [Flow 18: Billing & Subscription](#flow-18-billing--subscription)
19. [Flow 19: Settings](#flow-19-settings)
20. [Flow 20: Dashboard Sub-Pages](#flow-20-dashboard-sub-pages)
21. [Flow 21: Sidebar Navigation](#flow-21-sidebar-navigation)
22. [Flow 22: Admin — Overview](#flow-22-admin--overview)
23. [Flow 23: Admin — Organizations](#flow-23-admin--organizations)
24. [Flow 24: Admin — Organization Detail](#flow-24-admin--organization-detail)
25. [Flow 25: Admin — Users](#flow-25-admin--users)
26. [Flow 26: Admin — Grants](#flow-26-admin--grants)
27. [Flow 27: Admin — Proposals](#flow-27-admin--proposals)
28. [Flow 28: Admin — Source Analytics](#flow-28-admin--source-analytics)
29. [Flow 29: Admin — Agencies](#flow-29-admin--agencies)
30. [Flow 30: Admin — Settings](#flow-30-admin--settings)
31. [Flow 31: Admin — Impersonation](#flow-31-admin--impersonation)
32. [Flow 32: Agency — Setup](#flow-32-agency--setup)
33. [Flow 33: Agency — Dashboard](#flow-33-agency--dashboard)
34. [Flow 34: Agency — Organizations](#flow-34-agency--organizations)
35. [Flow 35: Agency — Analytics](#flow-35-agency--analytics)
36. [Flow 36: Agency — Billing](#flow-36-agency--billing)
37. [Flow 37: Agency — Settings](#flow-37-agency--settings)
38. [Flow 38: Emails](#flow-38-emails)
39. [Flow 39: Cron Jobs & Background Processes](#flow-39-cron-jobs--background-processes)
40. [Flow 40: Stripe Webhooks](#flow-40-stripe-webhooks)
41. [Flow 41: Real-time & WebSocket Features](#flow-41-real-time--websocket-features)
42. [Flow 42: Responsive & Cross-Browser](#flow-42-responsive--cross-browser)
43. [Flow 43: Admin — Org Pickup](#flow-43-admin--org-pickup)
44. [Flow 44: Admin — Fetch Queue](#flow-44-admin--fetch-queue)
45. [Flow 45: Admin — System Errors](#flow-45-admin--system-errors)

---

## Flow 1: Registration (New User)

### 1.1 Landing Page

- [ ] Visit `/` as unauthenticated user — landing page loads
- [ ] Click "Get Started" or "Register" — redirects to `/register`
- [ ] Click "Sign In" — redirects to `/login`

### 1.2 Step 1 — Create Account

- [ ] Full Name field is present and required
- [ ] Email field is present, required, validates email format
- [ ] Password field is present, required, minimum 6 characters
- [ ] Confirm Password field is present, required
- [ ] Submit with empty fields — shows validation errors
- [ ] Submit with mismatched passwords — shows error
- [ ] Submit with password < 6 chars — shows error
- [ ] Submit with valid data — advances to Step 2
- [ ] "Sign in" link at bottom navigates to `/login`

### 1.3 Step 2 — Choose Your Plan

- [ ] Three plan cards are displayed: Starter (Free), Professional ($49/mo), Agency ($149/mo)
- [ ] Each card shows features list and price
- [ ] Professional and Agency show "7-day free trial"
- [ ] Click a plan card — card highlights with checkmark
- [ ] "Next" button is enabled only when a plan is selected
- [ ] "Back" button returns to Step 1 with data preserved
- [ ] Select Free plan and click Next — advances to Step 3 (org form)
- [ ] Select Professional plan and click Next — advances to Step 3 (org form)
- [ ] Select Agency plan and click Next — advances to Step 3 (agency form)

### 1.4 Step 3 — Organization Details (Free/Professional)

- [ ] Organization Name field is present and required
- [ ] EIN field is present and optional
- [ ] Sector dropdown has all options (Education, Health, Environment, Arts & Culture, Social Services, Community Development, Human Rights, International Development, Science & Technology, Other)
- [ ] Mission textarea is present and optional
- [ ] Address, Phone, Website, Founding Year fields are present and optional
- [ ] Geographic Focus multi-select is present and required
- [ ] Geographic Focus search filters states as you type
- [ ] Selected states appear as removable badges
- [ ] Can select multiple states
- [ ] Can remove a selected state by clicking X on badge
- [ ] Submit with empty org name — shows error
- [ ] Submit with no geographic focus — shows error
- [ ] Submit with valid data — advances to Step 4
- [ ] "Back" button returns to Step 2

### 1.5 Step 3 — Agency Details (Agency Plan)

- [ ] Agency Name field is present and required
- [ ] Submit with empty name — shows error
- [ ] Submit with valid name — triggers registration and redirects to Stripe checkout
- [ ] "Back" button returns to Step 2

### 1.6 Step 4 — Organization Profile (Free/Professional)

- [ ] **Three** mode options displayed: "Upload Documents", "Answer Questions", "Use My Website"
- [ ] Click "Upload Documents" — shows file upload form
- [ ] Click "Answer Questions" — shows questionnaire form
- [ ] Click "Use My Website" — shows website URL input
- [ ] "Back" button on the mode-picker returns to Step 3 (org details)
- [ ] After picking a mode, "Back" within that mode returns to mode selection (not Step 3)
- [ ] All three modes lead to the **Step 5 review screen**, not direct registration

#### 1.6a Upload Documents Mode

- [ ] Narrative Document file input is present
- [ ] Accepts PDF, DOCX, XLSX, PPTX, PNG, JPG
- [ ] Rejects other file types with error message
- [ ] Rejects files > 25MB with error message
- [ ] Selected file shows filename with X to clear
- [ ] Additional Documents input accepts multiple files
- [ ] Multiple files shown as list with X to remove each
- [ ] "Back" button returns to mode selection
- [ ] "Continue to review" button advances to Step 5 (must have at least one file)

#### 1.6b Answer Questions Mode

- [ ] Annual Budget ($) number field is present
- [ ] Staff Count number field is present
- [ ] Organization Description textarea is present
- [ ] Executive Summary textarea is present
- [ ] Mission Narrative textarea is present
- [ ] Impact Narrative textarea is present
- [ ] Methods & Approach textarea is present
- [ ] Budget Narrative textarea is present
- [ ] All fields are optional
- [ ] "Back" button returns to mode selection
- [ ] "Continue to review" button advances to Step 5

#### 1.6c Use My Website Mode (NEW)

- [ ] Website URL input is present with placeholder `https://yourorganization.org`
- [ ] "Generate" button is disabled when URL is empty
- [ ] Click Generate — button shows spinner with "Generating..." label
- [ ] Status banner appears: teal-tinted card with "Reading your website…" and "This usually takes 20–60 seconds."
- [ ] Generation failure — red error card shows the error message; can retry
- [ ] Generation success — sub-step switches from "input" to "edit"
- [ ] Edit sub-step header shows "Generated N narrative(s) — review and edit below."
- [ ] Each generated narrative renders as a document-style sheet with:
  - [ ] Emerald gradient ribbon at the top (distinct from the navy proposal style)
  - [ ] Category label (uppercase, mono font) and live word count
  - [ ] Title (serif heading, e.g., Georgia)
  - [ ] Editable textarea pre-filled with generated content
  - [ ] Footer index "i / N" and "Fundory.ai narrative draft" caption
- [ ] "Regenerate" link in the header re-runs generation (resets edits)
- [ ] "Back" button returns to the input sub-step (URL preserved)
- [ ] "Continue to review" advances to Step 5

### 1.7 Step 5 — Review & Register (NEW)

- [ ] Header instruction: "Confirm everything below, then register. Use Back to fix anything."
- [ ] **Account section** shown only for unauthenticated users (full name + email)
- [ ] **Plan section** shows selected plan label
- [ ] **Organization section** shows: Name, EIN, Sector, Mission, Address, Phone, Website, Founded, Geographic focus
- [ ] If profile mode = questionnaire: **Questionnaire section** shows all entered narratives + budget/staff
- [ ] If profile mode = documents: **Documents section** lists narrative file + additional file names (or "No files attached")
- [ ] If profile mode = website + generation succeeded: **AI-generated narratives section** shows each generated section with title, word count, and full content preview (saved to library on register)
- [ ] If profile mode = website + generation NOT ready: section shows "None — you can generate them in the library after registering."
- [ ] "Back" button returns to Step 4 (mode-specific page) with all data preserved
- [ ] "Register Organization" button submits the registration

### 1.8 Registration Completion

- [ ] Free plan: Shows success card "Registration Submitted"
- [ ] Success message mentions org name and "pending admin approval"
- [ ] "Go to Login" button navigates to `/login`
- [ ] Professional plan: Redirects to Stripe checkout page
- [ ] After Stripe checkout completion: Returns to app
- [ ] Agency plan: Redirects to Stripe checkout page
- [ ] Welcome email is received by the user
- [ ] Website-mode users: generated narratives appear in their narratives library after first login

### 1.9 Registration Edge Cases

- [ ] Register with existing email (has org) — shows "account already exists" error
- [ ] Register with existing email (no org, orphaned) — succeeds (auto-cleans orphan)
- [ ] Authenticated user visits `/register` — wizard starts at Step 2 (no account step)
- [ ] Authenticated user who already has org — shows error "each user can only have one organization"
- [ ] Authenticated user who already has agency — shows error "each user can only create one agency"
- [ ] Website mode: enter a URL that fails to fetch (404, blocked) — error card shows; user can edit URL and retry
- [ ] Website mode: regenerate after editing URL — replaces previously generated narratives

---

## Flow 2: Login & Authentication

### 2.1 Email/Password Login

- [ ] Visit `/login` — login form displays
- [ ] Email and Password fields are present and required
- [ ] Submit with empty fields — shows validation error
- [ ] Submit with wrong credentials — shows "Invalid login credentials" error
- [ ] Submit with correct credentials — redirects based on role (dashboard/admin/agency)
- [ ] "Register" link navigates to `/register`

### 2.2 Google OAuth Login

- [ ] "Continue with Google" button is present
- [ ] Click button — redirects to Google OAuth consent screen
- [ ] Authorize on Google — redirects back to `/auth/callback`
- [ ] Callback exchanges code for session
- [ ] First-time Google user with no org — redirects to `/register`
- [ ] Returning Google user with org — redirects to `/dashboard`
- [ ] OAuth failure — redirects to `/login?error=auth_callback_failed`

### 2.3 Session Management

- [ ] Authenticated user visiting `/login` — redirects to appropriate dashboard
- [ ] Authenticated user visiting `/` — redirects to appropriate dashboard
- [ ] Sign out from any page — redirects to `/login`
- [ ] Session expired — next page load redirects to `/login`
- [ ] `/signup` redirects to `/register`

---

## Flow 3: Organization Status Gates

### 3.1 Pending Approval

- [ ] User with pending org visits any page — redirects to `/pending-approval`
- [ ] Pending approval page shows clock icon and "Registration Pending" message
- [ ] Org name is displayed in the message
- [ ] "Sign Out" button works and redirects to `/login`
- [ ] User cannot navigate to `/dashboard` or any other page

### 3.2 Rejected

- [ ] User with rejected org visits any page — redirects to `/rejected`
- [ ] Rejected page shows X icon and "Registration Not Approved" message
- [ ] If rejection reason exists — shown in gray box
- [ ] If no rejection reason — reason section is hidden
- [ ] "Sign Out" button works

### 3.3 Suspended

- [ ] User with suspended org visits any page — redirects to `/suspended`
- [ ] Suspended page shows ban icon and "Account Suspended" message
- [ ] "Sign Out" button works

### 3.4 Middleware Routing

- [ ] Platform admin → redirected to `/admin` (not dashboard)
- [ ] Agency user with incomplete setup → redirected to `/agency/setup`
- [ ] Agency user with complete setup → can access `/agency/*` and `/dashboard/*`
- [ ] Approved org user → can access dashboard routes, blocked from `/admin`
- [ ] Unauthenticated user → blocked from all routes except `/`, `/login`, `/register`, `/auth/*`

---

## Flow 4: Onboarding Tour

### 4.1 Free Tier Tour (base)

- [ ] New free user lands on `/dashboard` — tour auto-starts after 1 second
- [ ] Tour shows "1 of 30" progress counter (BASE_TOUR has 30 steps; verify against `lib/tour/definitions.ts`)
- [ ] Tour highlights Dashboard nav item first
- [ ] Tour navigates through: Dashboard → Discovery → Pipeline → Documents → Narratives → Proposals → Notifications → Billing → Settings → Dashboard
- [ ] Each step highlights correct element with popover
- [ ] "Next" button advances to next step
- [ ] "Back" button returns to previous step
- [ ] "Skip Tour" (X button) closes tour and marks as complete
- [ ] Completing all steps marks tour as complete
- [ ] Tour does not auto-trigger again after completion
- [ ] Tour navigates between pages automatically when step requires different page

### 4.2 Professional Tour

- [ ] New professional user lands on `/dashboard` — professional tour auto-starts
- [ ] Tour mentions "Unlimited grants", "RFP parsing", "Full content library"
- [ ] 30 steps total (PROFESSIONAL_TOUR)

### 4.3 Upgrade Tour

- [ ] Free user who completed base tour upgrades to Professional
- [ ] On next `/dashboard` visit — upgrade tour auto-starts (9 steps)
- [ ] Highlights new features unlocked by upgrade

### 4.4 Agency Tour

- [ ] New agency user lands on `/agency` — agency tour auto-starts
- [ ] 18 steps across agency pages (AGENCY_TOUR)
- [ ] Navigates through: Dashboard → Organizations → Analytics → Billing → Settings → Dashboard

### 4.5 Tour Replay

- [ ] Go to Settings → Appearance → click "Restart Tour"
- [ ] Tour restarts from beginning
- [ ] Button is disabled while tour is active

---

## Flow 5: Dashboard

### 5.1 Metrics Cards

- [ ] Page loads with title "Dashboard" and subtitle "Your grant pipeline at a glance"
- [ ] "Total Grants" card shows correct count — clickable, links to `/pipeline`
- [ ] "Active Deadlines" card shows correct count — clickable, links to `/dashboard/deadlines`
- [ ] "No Deadline Grants" card shows correct count — clickable, links to `/dashboard/no-deadline`
- [ ] "Past Deadlines" card shows correct count — clickable, links to `/dashboard/past-deadlines`
- [ ] "Daily Grants Usage" card shows usage/limit with progress bar (free tier only)

### 5.2 Pipeline Overview

- [ ] Horizontal bar chart displays with all stages
- [ ] Stages shown: Discovered, Screened, Waiting for Approval, Drafted, Closed
- [ ] Each bar shows count and percentage
- [ ] Empty state: "No grants yet. Head to Discovery to find opportunities."

### 5.3 Upcoming Deadlines

- [ ] Shows next deadlines sorted chronologically
- [ ] Each item shows: grant title, deadline date, urgency badge
- [ ] Urgency badges: Critical (< 24h), Urgent (< 48h), Soon (< 7 days)
- [ ] "View All" link navigates to `/dashboard/deadlines`
- [ ] Clicking a deadline item navigates to grant detail page
- [ ] Empty state: "No upcoming deadlines"

### 5.4 Recent Activity

- [ ] Shows last 10 activity entries
- [ ] Each entry: icon, action text, timestamp
- [ ] Empty state: "No recent activity"

---

## Flow 6: Discovery

### 6.1 Search

- [ ] Page loads with title "Grant Discovery"
- [ ] Search input with placeholder "Search for grants..."
- [ ] Type a query and press Enter — triggers search
- [ ] Click "Discover" button — triggers search (disabled when query empty)
- [ ] Loading state shows spinner with animated stage messages
- [ ] Stage messages update: "Connecting to grant databases...", source names
- [ ] Results appear incrementally as sources respond (real-time)
- [ ] Results header shows count: "X found" with "so far" while loading
- [ ] Completion banner turns green: "Found X grant(s) matching your search"

### 6.2 Filters

- [ ] Click "Filter" button — filter panel expands
- [ ] Filter badge shows count of active filters
- [ ] Location multi-select: searchable, supports multiple states
- [ ] Organization Type multi-select: 501(c)(3), 501(c)(4), Government, etc.
- [ ] Nonprofit / For-Profit multi-select
- [ ] Industry multi-select: Health, Education, Arts, etc.
- [ ] Funding Category multi-select: Federal, State, Foundation, etc.
- [ ] Each multi-select: search input, checkbox list, removable badges, "Clear all"
- [ ] "Clear All Filters" button clears everything
- [ ] Filters persist across searches in the same session

### 6.3 Recent Searches

- [ ] After performing a search, it appears in "Recent:" section
- [ ] Click a recent search — restores query and loads cached results
- [ ] Hover over recent search — X button appears
- [ ] Click X — removes from history

### 6.4 Session Tabs

- [ ] Each search creates a new session tab
- [ ] Tab shows: status icon (spinner/checkmark/alert), query text, result count badge
- [ ] Click a tab — switches to that session's results
- [ ] Click X on tab — closes session
- [ ] Active tab is highlighted

### 6.5 Grant Result Cards

- [ ] Each card shows: title, funder, amount, deadline, description (2-line clamp), source badge
- [ ] Expired grants show "Expired" badge
- [ ] "Add to Pipeline" button on each card
- [ ] Click "Add to Pipeline" — shows spinner, then changes to "Added" (disabled)
- [ ] At daily limit: button shows "Limit Reached" (disabled, lock icon)
- [ ] Click card title — opens detail dialog

### 6.6 Grant Detail Dialog

- [ ] Shows full: title, funder, amount, deadline, source, description
- [ ] "View Original Listing" link opens source URL in new tab
- [ ] "Add to Pipeline" button in footer (or "Added to Pipeline" if already added)
- [ ] At limit: shows "Upgrade to Add More Grants" button

### 6.7 Grant Usage Indicator (Free Tier)

- [ ] Usage box shows: "X/Y grant(s) used today" with progress blocks
- [ ] At limit: red border, "Upgrade to Professional" button
- [ ] Near limit: amber border, "X grants remaining" text
- [ ] Below limit: gray border, normal state

### 6.8 Discovery Edge Cases

- [ ] Search with no results — shows "No grants found matching your search"
- [ ] Search while already searching — shows results from both in tabs
- [ ] Expired grants hidden by default — "Show X Expired" toggle to reveal
- [ ] Session persistence: refresh page — session state restored from sessionStorage

---

## Flow 7: Pipeline — Kanban & List Views

### 7.1 Pipeline Page Load

- [ ] Page loads with title "Pipeline" and grant count
- [ ] Professional/Agency plan with empty pipeline — auto-triggers grant fetch
- [ ] Fetch banner shows: status messages, spinner, stage progress
- [ ] Fetch banner auto-hides on completion

### 7.2 Filters and View Toggle

- [ ] Search input filters by grant title or funder name in real-time
- [ ] Stage dropdown filters: All, Discovered, Screened, Waiting for Approval, Drafted, Closed
- [ ] Sort dropdown: No sorting, Deadline (soonest), Amount (highest), Score (highest)
- [ ] Kanban view tab (grid icon) — switches to kanban
- [ ] List view tab (list icon) — switches to list

### 7.3 Kanban View

- [ ] Columns for each stage with: colored dot, label, tooltip, count
- [ ] Grant cards show: title, funder, amount badge, score badge, deadline
- [ ] Cards now also show **"Added [Mon DD, YYYY]"** (date the org picked the grant up — based on `created_at`)
- [ ] Score badge colors: green (>= 80%), yellow (>= 50%), red (< 50%)
- [ ] Drafting stage cards show: confidence % and proposal quality %
- [ ] Cards with a proposal-generation run in flight show an inline "Generating proposal…" indicator (driven by 15s client poll over running workflow_executions)
- [ ] Drag a card from one column to another — triggers stage move
- [ ] Drop target column highlights with ring during drag
- [ ] Card shows opacity change while dragging
- [ ] After drop: card shows loading spinner during API call
- [ ] Cannot drag to same column
- [ ] Empty columns show "No grants" message
- [ ] During drag, empty target shows "Drop here"

### 7.4 List View

- [ ] Desktop: table layout with columns (Grant, Funder, **Added**, Score, Amount, Deadline)
- [ ] Mobile: card layout shows the same data including the Added date
- [ ] "Added" column displays the org pickup date (`created_at`)
- [ ] Grants grouped by stage with section headers (label + count)
- [ ] Click grant title — navigates to `/pipeline/[id]`
- [ ] Score display: screening score for most stages, confidence/quality for drafting
- [ ] In-flight proposal generation surfaces on the matching list row

### 7.5 Recommendation Banner

- [ ] Banner appears when grants exist in screening/pending_approval/drafting
- [ ] Shows: "We recommend applying to grants with a screening score of 85%+"
- [ ] Green styled with lightbulb icon

### 7.6 Real-time Updates

- [ ] Another user/process moves a grant — pipeline updates without refresh
- [ ] Notification toast appears when workflow completes (screening_completed, proposal_generated)
- [ ] Toast types: info (started), success (completed), error (not eligible)

---

## Flow 8: Pipeline — Grant Detail

### 8.1 Grant Information

- [ ] Page loads with back button (dynamic label based on origin)
- [ ] Title field (editable, required)
- [ ] Funder field (editable)
- [ ] Stage dropdown (all stages available)
- [ ] Amount field (number input)
- [ ] Deadline field (date input) OR "Ongoing/Rolling" display
- [ ] Ongoing checkbox toggles between date input and "Ongoing / Rolling" display
- [ ] Description textarea
- [ ] Grant URL input with clickable external link icon
- [ ] Notes textarea
- [ ] "Additional Information" collapsible section
- [ ] When expanded: Eligibility Requirements, Focus Areas, Match Requirement, Contact Info

### 8.2 Save Changes

- [ ] Modify any field — Save button enables
- [ ] Click Save — saves all fields, shows success
- [ ] Save with empty title — shows error

### 8.3 Screening Report (if grant has screening data)

- [ ] Overall score badge (color-coded)
- [ ] "Not Enough Info" badge if insufficient data
- [ ] Scoring breakdown: 5 dimensions with progress bars
  - [ ] Mission Alignment (/20)
  - [ ] Target Population (/20)
  - [ ] Service/Program Fit (/20)
  - [ ] Geographic Alignment (/20)
  - [ ] Org Capacity (/20)
- [ ] Screening Assessment text block
- [ ] Concerns list (yellow bullets)
- [ ] Recommendations list (blue bullets)

### 8.4 Proposal Generation (background / non-blocking)

- [ ] Discovery/Screening stage: Blue card "Generate Proposal" with button
- [ ] Pending Approval stage: Amber card "Awaiting Your Approval" with "Approve & Generate Proposal"
- [ ] Click generate/approve — confirmation dialog opens
- [ ] Dialog shows: grant title, funder, org name, screening score
- [ ] Click "Approve & Generate" — **inline loading state** on the button (no blocking modal); user can navigate away
- [ ] While generation is running:
  - [ ] The matching grant card on `/pipeline` shows a "Generating proposal…" indicator (15s poll)
  - [ ] Re-clicking generate on the same grant within 10 minutes is blocked by the per-org concurrency gate
  - [ ] Other orgs are unaffected (gate is per-org, not global)
- [ ] On success: notification toast "Proposal generated", grant moves to Drafting stage, proposal link surfaces on detail page
- [ ] On error: inline error message shown next to the button, slot is released so user can retry
- [ ] If generation crashes mid-run, the slot auto-releases after a 10-minute stale window so the user is never permanently locked out

### 8.5 Drafting Stage View

- [ ] Drafted Report card shows confidence score
- [ ] Proposals list: title, status, quality score badge
- [ ] "View Proposal" button links to `/proposals/[id]`
- [ ] Eligibility breakdown with dimension scores

### 8.6 Archive

- [ ] Archive button (orange) in header
- [ ] Click Archive — confirmation dialog opens
- [ ] Dialog shows grant title, funder, "moved to archive" message
- [ ] Confirm — grant moves to archived stage
- [ ] Grant disappears from pipeline

---

## Flow 9: Pipeline — Add Grant Manually

### 9.1 Open Dialog

- [ ] Click "Add Grant" button on pipeline page
- [ ] Button shows "Checking..." while validating usage limit
- [ ] At daily limit — button stays disabled, shows limit reached toast
- [ ] Within limit — dialog opens

### 9.2 Form Fields

- [ ] Title field (required)
- [ ] Funder Name field
- [ ] Description textarea
- [ ] Amount number field
- [ ] Deadline date field with "Ongoing/rolling deadline" checkbox
- [ ] Source field (pre-filled with org name)
- [ ] Grant URL field
- [ ] "Additional Information" collapsible:
  - [ ] Eligibility Requirements textarea
  - [ ] Focus Areas input
  - [ ] Match Requirement input
  - [ ] Contact Info input
  - [ ] "Add custom field" button — adds key/value pair fields
  - [ ] Custom fields have delete (X) button

### 9.3 Validation

- [ ] Submit with empty title — shows "Grant name is required."
- [ ] Submit with missing recommended fields (funder, description, amount, deadline) — warning dialog
- [ ] Warning lists missing fields with "Continue Anyway" and "Back to Form" buttons
- [ ] "Continue Anyway" — submits with missing fields
- [ ] "Back to Form" — returns to form

### 9.4 Submission

- [ ] Loading state shows "Adding..."
- [ ] Success: toast "Grant added to pipeline successfully", form clears, dialog closes
- [ ] Error: toast with error message
- [ ] Limit reached during add: toast "Daily grant limit reached" with upgrade link
- [ ] Grant appears in pipeline in Discovery stage

---

## Flow 10: Documents

### 10.1 Document List

- [ ] Page loads with title "Documents" and subtitle
- [ ] Search input filters documents by name
- [ ] Category dropdown filter: All Categories, Uncategorized, and category list
- [ ] Table columns: Name, Category, File Type, File Size, Uploaded Date, Actions
- [ ] Click row — navigates to document detail page
- [ ] Empty state: "No documents found"

### 10.2 Upload Documents

- [ ] Click "Upload" button — dialog opens
- [ ] File input accepts multiple files
- [ ] Accepted types: PDF, DOCX, XLSX, PPTX, PNG, JPG
- [ ] Reject invalid file types with error
- [ ] Reject files > 25MB with error
- [ ] Category dropdown (optional, AI categorizes if not selected)
- [ ] Selected files shown as list with size and delete button
- [ ] Duplicate file prevention (same name + size)
- [ ] Upload progress: "Uploading X/Y..."
- [ ] Success: files appear in document list
- [ ] Error: per-file error messages displayed

### 10.3 Document Detail

- [ ] Back button returns to document list
- [ ] Header shows: file type icon, document name
- [ ] PDF files: inline iframe viewer
- [ ] Images: auto-fitted display
- [ ] Extracted text: thumbnail sidebar + page content viewer with pagination
- [ ] "Download Original" link
- [ ] Metadata sidebar: File type badge, Category (editable dropdown with Save), AI Category (read-only), File size, Upload date, Linked grant
- [ ] Download button
- [ ] Delete button — confirmation dialog — deletes document

### 10.4 Row Actions

- [ ] Actions dropdown on each row: Download, Delete
- [ ] Download — downloads file
- [ ] Delete — confirmation dialog — removes from list

### 10.5 Real-time Updates

- [ ] Upload a document in another tab — appears in list without refresh
- [ ] Delete a document in another tab — disappears from list without refresh
- [ ] AI category updates automatically after n8n processing

---

## Flow 11: Narratives

### 11.1 Narrative List

- [ ] Page loads with title "Narratives"
- [ ] Left panel: list of narratives (title, category, tags)
- [ ] Click a narrative — right panel shows content
- [ ] Selected narrative is highlighted
- [ ] Empty state: "Select a narrative to view its content"

### 11.2 Create Narrative

- [ ] Click "New Narrative" button — dialog opens
- [ ] Title input (required)
- [ ] Category dropdown: Mission, Impact, Methods, Evaluation, Sustainability, Capacity, Budget Narrative, Other
- [ ] Content editor (Tiptap rich text)
- [ ] Toolbar: Bold, Italic, Heading 2, Bullet list, Ordered list, Blockquote
- [ ] Tags input (comma-separated)
- [ ] Submit — narrative appears in list

### 11.3 Edit Narrative

- [ ] Click Edit button on selected narrative
- [ ] Content becomes editable in rich text editor
- [ ] Modify content — Save and Reset buttons appear
- [ ] Click Save — content saved
- [ ] Click Reset — reverts to last saved version

### 11.4 Narrative Detail Page

- [ ] Navigate to `/narratives/[id]`
- [ ] Back button to narratives list
- [ ] Header: title, category badge, Edit button, Export PDF button
- [ ] Center: document viewer with formatted content
- [ ] Right sidebar metadata:
  - [ ] Category dropdown (editable)
  - [ ] Tags: add/remove with input field
  - [ ] Word count
  - [ ] Created date, Updated date
  - [ ] Current version number
  - [ ] Status (Indexed/Not indexed)
- [ ] Version History (collapsible):
  - [ ] Current version badge (green, "Used for proposal generation")
  - [ ] Previous versions list with: version number, date, "Restore" button
  - [ ] Click Restore — confirmation — reverts to that version

### 11.5 AI Customization

- [ ] Click AI Customization button — triggers n8n workflow
- [ ] Workflow customizes narrative content for a specific grant
- [ ] Result appears as a new version

### 11.6 Export

- [ ] Click "Export PDF" — downloads narrative as PDF

### 11.7 Delete Narrative

- [ ] Delete action available per narrative
- [ ] Confirmation dialog
- [ ] Narrative removed from list

---

## Flow 12: Proposals

### 12.1 Proposal List

- [ ] Page loads with title "Proposals"
- [ ] Table columns: Title, Grant, Status, Created Date, Updated Date, Actions
- [ ] Status badges: draft, generating, ready, submitted
- [ ] Click row — navigates to `/proposals/[id]`
- [ ] Empty state: "No proposals found"

### 12.2 Proposal Detail

- [ ] Back button
- [ ] Header: title, status badge, "For: [Grant Title]"
- [ ] Edit/Reset/Save buttons (conditional on edit mode)
- [ ] Export dropdown: PDF, Word
- [ ] "View Review" button toggles sidebar

### 12.3 Proposal Content

- [ ] Proposal sections displayed with titles and content
- [ ] Click Edit — sections become editable in rich text editor
- [ ] Drag-to-reorder sections
- [ ] Save changes — persisted

### 12.4 Quality Review Sidebar

- [ ] Click "View Review" — sidebar opens
- [ ] Overall Score display (color-coded: red/yellow/green)
- [ ] "Run Review" button (triggers n8n workflow)
- [ ] After review completes:
  - [ ] Section Scores grid
  - [ ] Strengths list (collapsible)
  - [ ] Areas to Improve list (collapsible)
  - [ ] Quick Wins with checkboxes (collapsible)
  - [ ] Suggested Rewrites (before/after)
  - [ ] Story to Add suggestion
  - [ ] Improved Opening/Closing paragraphs
  - [ ] Issues Found (severity badges: high/medium/low)
- [ ] Empty state: "No quality review yet"

### 12.5 Export

- [ ] Export as PDF — downloads PDF
- [ ] Export as Word — downloads .docx
- [ ] Loading state on each export button

### 12.6 Real-time Updates

- [ ] Proposal sections update in real-time during n8n generation
- [ ] Quality review results stream in as they complete

---

## Flow 13: Submissions

### 13.1 Submission List

- [ ] Page loads with title "Submissions"
- [ ] Table columns: Grant Title (link), Deadline, Urgency badge, Checklist progress (X/Y), Status
- [ ] Urgency badges color-coded by days until deadline
- [ ] Empty state: "No grants in your pipeline"

### 13.2 Submission Detail

- [ ] Header: grant title, funder, urgency badge
- [ ] Submission Checklist section:
  - [ ] Progress bar (percentage)
  - [ ] "X of Y items" completion text
  - [ ] Each checklist item has checkbox (optimistic update)
  - [ ] Check an item — shows completion timestamp
  - [ ] "Generate Checklist" button if no checklist exists
  - [ ] Checklist generation shows workflow progress

### 13.3 Submit Grant

- [ ] Auto-Submit button (disabled if no portal URL, tooltip explains)
- [ ] Manual Submit Form:
  - [ ] Confirmation number input
  - [ ] Submission date picker
  - [ ] Notes textarea
  - [ ] Submit button
- [ ] After submission: entry appears in Submission History

### 13.4 Submission History

- [ ] List of past submissions: status, date, confirmation number, notes
- [ ] Empty state: "No submissions"

---

## Flow 14: Awards & Reporting

### 14.1 Awards List

- [ ] Page loads with title "Awards"
- [ ] "Record Award" button links to new award page
- [ ] Awards table: Grant Title, Amount, Award Date, Status, Actions
- [ ] Click row — navigates to detail
- [ ] Empty state: "No awards recorded"

### 14.2 Create Award

- [ ] Navigate to `/awards/new`
- [ ] Grant selection dropdown (from pipeline)
- [ ] Award amount input
- [ ] Award date picker
- [ ] Start date picker
- [ ] End date picker
- [ ] Requirements textarea
- [ ] "Create Award" button — creates award, redirects to detail

### 14.3 Award Detail

- [ ] Back button
- [ ] Header: grant title, funder, delete button
- [ ] Award Information card: Amount, Award Date, Period, Requirements
- [ ] Reports list
- [ ] Report Editor (when report selected):
  - [ ] Title with type badge (interim/final)
  - [ ] Rich text editor (Tiptap) with toolbar
  - [ ] Auto-save indicator (Saving.../Saved)
  - [ ] "Mark as Submitted" button

### 14.4 Reporting Calendar

- [ ] Calendar view of report due dates
- [ ] Color-coded by status
- [ ] Click date — selects associated report

### 14.5 Add Report

- [ ] Click "Add Report" — dialog opens
- [ ] Report Type dropdown: Interim, Final
- [ ] Title input
- [ ] Due Date picker
- [ ] "Create Report" button

### 14.6 Generate Report with AI

- [ ] Select a draft report
- [ ] Click "Generate with AI" — triggers n8n workflow
- [ ] Workflow progress displayed
- [ ] Generated content populates editor

### 14.7 Delete Award

- [ ] Click delete button — confirmation dialog
- [ ] Warning: "will also delete all associated reports"
- [ ] Confirm — award and reports deleted

---

## Flow 15: Notifications

### 15.1 Notification Center

- [ ] Navigate to `/notifications`
- [ ] Notifications grouped by time: Now, Today, This Week, Earlier
- [ ] Each notification: icon, title, timestamp
- [ ] Unread notifications visually distinct
- [ ] Visiting page marks all as read
- [ ] Sidebar badge count resets to 0

### 15.2 Real-time Notifications

- [ ] Trigger a workflow (screening, proposal generation) — notification appears
- [ ] Toast notification appears on pipeline page for workflow events
- [ ] Notification badge in sidebar updates in real-time

---

## Flow 16: Grant Source Directory

### 16.1 Page Structure

- [ ] Page loads with title "Grant Source Directory"
- [ ] Search input filters across all tabs
- [ ] Three tabs with count badges: Integrated, LOI Funders, Not Included

### 16.2 Integrated Tab

- [ ] Green info banner: "These sources are actively monitored..."
- [ ] Source cards: name, "Auto-monitored" badge, description, "For:" text, "Funds:" text
- [ ] External link icon button opens source URL
- [ ] Cards have hover state

### 16.3 LOI Funders Tab

- [ ] Amber info banner about Letter of Inquiry funders
- [ ] Source cards: name, "Send LOI" badge, description
- [ ] External link button

### 16.4 Not Included Tab

- [ ] Gray info banner explaining exclusion reasons
- [ ] Source cards: name, reason badge, description
- [ ] External link button

### 16.5 Search & Empty States

- [ ] Search filters cards by name/description
- [ ] No matches: "No [tab_name] sources match your search."

---

## Flow 17: Analytics

### 17.1 Pipeline Breakdown

- [ ] Navigate to `/analytics`
- [ ] Title "Analytics" with subtitle "Pipeline insights"
- [ ] Per stage: colored dot, label, count badge, progress bar, percentage
- [ ] Stages: Discovery (blue), Screening (yellow), Pending Approval (amber), Drafting (purple), Closed (gray)
- [ ] Empty state: "No grants in pipeline yet"

---

## Flow 18: Billing & Subscription

### 18.1 Billing Page

- [ ] Navigate to `/billing`
- [ ] Current plan card: plan name, price, status badge
- [ ] Trial info banner (if in trial): "Your free trial ends in X days"
- [ ] Past due banner (if applicable)
- [ ] Agency managed banner (if agency org)
- [ ] Pilot tester banner (if is_tester)

### 18.2 Grant Usage (Free Tier)

- [ ] Usage bar: "X of Y grants used today"
- [ ] Color-coded progress (green/amber/red)
- [ ] At limit: "Upgrade" message
- [ ] Remaining count display

### 18.3 Plan Comparison

- [ ] Plans grid: Free, Starter, Professional, Agency
- [ ] Each shows: name, price, trial info, feature checklist
- [ ] Current plan shows "Current Plan" button (disabled)
- [ ] Other plans show "Upgrade" or "Downgrade" button

### 18.4 Manage Billing

- [ ] "Manage Billing" button (if Stripe customer) — opens Stripe customer portal
- [ ] Portal allows: update payment method, view invoices, cancel subscription
- [ ] Returns to `/billing` after portal

---

## Flow 19: Settings

### 19.1 Profile Tab

- [ ] Avatar with initials fallback
- [ ] "Change Photo" button — file picker (PNG, JPEG, WebP, max 2MB)
- [ ] Upload photo — avatar updates (now uploads directly from the browser via the client-side Supabase SDK, matching the agency settings pattern; the old Server Action path was removed because Next.js's 1MB body limit was silently capping 1–2MB uploads)
- [ ] **Regression check:** upload a 1.5–2MB image — should complete (previously hung at "Uploading...")
- [ ] Full Name input
- [ ] Email input
- [ ] "Save Changes" button (disabled if no changes)
- [ ] Change Password section (hidden for OAuth users):
  - [ ] Current Password, New Password (min 6), Confirm Password
  - [ ] Mismatched passwords — error
  - [ ] Password < 6 chars — error
  - [ ] Correct input — password changed

### 19.2 Organization Tab

- [ ] Organization Name (required)
- [ ] EIN, Description, Mission, Email, Phone, Address, Website, Founding Year
- [ ] Sector dropdown (same options as registration)
- [ ] Geographic Focus multi-select (same as registration)
- [ ] "Save Changes" button
- [ ] Team Members table: Member (avatar + name), Email, Role, Joined Date, Actions
- [ ] Role dropdown (Member/Admin) — change role (disabled for owner)
- [ ] Delete member — confirmation dialog
- [ ] "Invite Member" button — dialog with email and role

### 19.3 Invite Member Dialog

- [ ] Email input
- [ ] Role dropdown (Member/Admin)
- [ ] "Send Invite" button
- [ ] Success/error messaging

### 19.4 Integrations Tab

- [ ] Webhook Connection card:
  - [ ] Status indicator (connected/disconnected)
  - [ ] Latency display
  - [ ] "Test Connection" button — tests n8n webhook
- [ ] Workflow History table:
  - [ ] Columns: Workflow, Status, Started, Completed, Error
  - [ ] Status badges (completed=green, running=blue, pending=gray, failed=red)
  - [ ] "Refresh" button

### 19.5 Appearance Tab

- [ ] Theme selector (Light/Dark/System)
- [ ] Selecting each theme — UI updates accordingly
- [ ] "Restart Tour" button — restarts onboarding tour

---

## Flow 20: Dashboard Sub-Pages

### 20.1 Active Deadlines (`/dashboard/deadlines`)

- [ ] Back button to dashboard
- [ ] Title "Active Deadlines" with count
- [ ] Filter dropdown: All, Within 1 week, Within 2 weeks, Within 1 month, Within 3 months, Ongoing/Rolling
- [ ] Table (desktop) / Card (mobile) layout
- [ ] Columns: Title, Funder, Deadline, Amount, Stage
- [ ] Deadline shows: formatted date + urgency badge (Critical/Urgent/Soon)
- [ ] "Rolling" badge for ongoing deadlines
- [ ] Sorted by soonest first
- [ ] Empty state: "No grants match this filter"

### 20.2 No-Deadline Grants (`/dashboard/no-deadline`)

- [ ] Back button, title with count
- [ ] Table: Title, Funder, Amount, Stage
- [ ] Only grants with `deadline = null`
- [ ] Empty state: "All grants have deadlines set"

### 20.3 Past Deadlines (`/dashboard/past-deadlines`)

- [ ] Back button, title with count
- [ ] Table: Title, Funder, Deadline, Amount, Stage
- [ ] Deadline shows date + red "Expired" badge
- [ ] Sorted by most recent deadline first
- [ ] Empty state: "No past deadlines"

### 20.4 Archive (`/dashboard/archive`)

- [ ] Back button, title with count
- [ ] Table: Title, Funder, Amount, Added date, Actions
- [ ] "View" button links to archive detail
- [ ] "Restore" button — moves grant back to discovery stage (spinner during restore)
- [ ] "Delete" button — confirmation dialog with warning "This action cannot be undone"
- [ ] Confirm delete — permanently removes grant
- [ ] Empty state: "No archived grants"

---

## Flow 21: Sidebar Navigation

### 21.1 Desktop Sidebar

- [ ] Sidebar shows: Fundory logo, nav items, user section
- [ ] 11 nav items visible (Submissions and Awards commented out)
- [ ] Active page highlighted with background color
- [ ] Collapse button (chevron) — collapses to icon-only (64px)
- [ ] Collapsed: shows icons only, logo mark only, avatar only
- [ ] Expand back — full labels visible

### 21.2 Mobile Sidebar

- [ ] Hamburger menu button visible on mobile
- [ ] Click — sidebar slides out (264px)
- [ ] Overlay behind sidebar
- [ ] Click overlay — closes sidebar
- [ ] Body scroll disabled while open

### 21.3 Notification Badge

- [ ] Bell icon on Notifications nav item
- [ ] Red badge shows unread count (max "99+")
- [ ] Badge updates in real-time (polling every 10 seconds + visibility change)
- [ ] Badge resets to 0 when visiting `/notifications`

### 21.4 User Section

- [ ] Avatar with initials
- [ ] Full name and email (truncated if long)
- [ ] "Sign Out" button — logs out, redirects to `/login`

### 21.5 Agency Org Switcher

- [ ] Only visible for agency users
- [ ] Allows switching between organizations
- [ ] Switching changes org context for all pages

---

## Flow 22: Admin — Overview

### 22.1 Stat Cards

- [ ] Total Orgs — clickable, links to `/admin/organizations`
- [ ] Pending Approvals (amber) — links to `/admin/organizations?status=pending`
- [ ] Approved Orgs (green) — links to `/admin/organizations?status=approved`
- [ ] Suspended Orgs (orange) — links to `/admin/organizations?status=suspended`
- [ ] Total Users — links to `/admin/users`
- [ ] Deactivated Users (red) — links to `/admin/users?status=deactivated`
- [ ] Total Grants — links to `/admin/grants`
- [ ] Total Proposals — links to `/admin/proposals`

### 22.2 Billing Stats

- [ ] **MRR card** shows live monthly recurring revenue fetched from Stripe (not derived from app data)
- [ ] MRR formats as currency (e.g., `$12,345`)
- [ ] If Stripe fetch fails, the card degrades gracefully (no error banner, value falls back to `—` or 0)
- [ ] Active Subscriptions — links to `/admin/organizations?billing=active`
- [ ] Trialing — links to `/admin/organizations?billing=trialing`
- [ ] Past Due — links to `/admin/organizations?billing=past_due`
- [ ] Canceled — links to `/admin/organizations?billing=canceled`

### 22.3 Charts

- [ ] Registrations Over Time (6 months bar chart)
- [ ] Grants Created Over Time
- [ ] Proposals Generated Over Time
- [ ] Workflow Executions (stacked: completed/failed)

### 22.4 Recent Pending Organizations

- [ ] Shows up to 5 pending orgs: name, owner, created date
- [ ] "Approve" button on each — approves org, sends email, triggers grant fetch

### 22.5 Platform Activity Feed

- [ ] Last 20 activity log entries
- [ ] Action text and timestamp

---

## Flow 23: Admin — Organizations

### 23.1 Filters

- [ ] Status tabs with counts: All, Pending, Approved, Rejected, Suspended
- [ ] Billing tabs with counts: All Billing, Active, Trialing, Past Due, Canceled, No Sub
- [ ] Search input: searches org name, owner email, owner name, org email, EIN

### 23.2 Table

- [ ] Columns: Organization, Owner, Sector, Status, Plan, Tester, Billing Status, Registered, Actions
- [ ] Status badges: pending (amber), approved (green), rejected (red), suspended (orange)
- [ ] Plan column shows "Agency" badge if applicable
- [ ] Tester badge if is_tester
- [ ] Billing badges: active (green), trialing (amber), past_due (red), canceled (gray)
- [ ] Org name is clickable link to detail page

### 23.3 Row Actions

- [ ] "View Details" — links to org detail page
- [ ] "View as Organization" — switches admin to org dashboard
- [ ] If pending: "Approve" action — approves org
- [ ] If pending: "Reject" action — opens reject dialog with reason textarea
- [ ] If not pending: "Suspend" action — confirmation dialog
- [ ] If suspended: "Unsuspend" action — confirmation dialog
- [ ] "Delete" action — confirmation dialog, cascading delete

### 23.4 Approve Flow

- [ ] Click Approve — org status changes to approved
- [ ] Stripe subscription with trial is created
- [ ] Grants seeded from central catalog
- [ ] n8n grant fetch triggered
- [ ] Approval email sent to org owner

### 23.5 Reject Flow

- [ ] Click Reject — dialog opens with optional reason textarea
- [ ] Submit — org status changes to rejected
- [ ] Rejection email sent to org owner (includes reason if provided)

---

## Flow 24: Admin — Organization Detail

### 24.1 Header

- [ ] Back link to organizations list
- [ ] "View as Organization" button
- [ ] Org name, status badge, tester badge, registration date, owner info
- [ ] If pending: inline Approve and Reject buttons

### 24.2 Summary Cards

- [ ] Grants count, Proposals count, Documents count, Team Members count

### 24.3 Overview Tab

- [ ] Organization profile: Mission, Sector, EIN, Address, Phone, Email, Website, Founding Year, Geographic Focus, Description
- [ ] Grants Over Time chart (6 months)
- [ ] Proposals Over Time chart (6 months)
- [ ] Integration Status: running/completed/failed workflow counts, last execution

### 24.4 Grants Tab

- [ ] Stage breakdown bar chart
- [ ] Search input + stage filter buttons with counts
- [ ] Grants table (sortable): Title, Funder, Org, Stage, Score, Amount, Deadline, Created
- [ ] Click row — grant detail dialog with screening report
- [ ] "Show More" pagination (5 at a time)

### 24.5 Proposals Tab

- [ ] Status breakdown bar chart
- [ ] Search + status filter buttons
- [ ] Proposals table: Title, Grant, Org, Status, Quality Score, Created
- [ ] Click row — proposal detail dialog with sections

### 24.6 Documents Tab

- [ ] Document list sidebar (name, category badge, file type, size)
- [ ] Click document — viewer displays content
- [ ] PDF: iframe viewer
- [ ] Images: img display
- [ ] Extracted text: thumbnail sidebar + page viewer
- [ ] Download button

### 24.7 Team & Activity Tab

- [ ] Team Members table: Name, Email, Role, Joined Date
- [ ] Activity Log: last 50 activities with action and date

### 24.8 Billing Tab

- [ ] Current Plan dropdown: free, professional, agency — change updates plan
- [ ] Subscription Status dropdown: active, trialing, past_due, canceled, unpaid
- [ ] Trial End Date with "Extend Trial" button (days input)
- [ ] "Cancel Subscription" button
- [ ] Tester Toggle: checkbox to make/remove tester (with plan selection for agency tester)

---

## Flow 25: Admin — Users

### 25.1 User List

- [ ] Title "Users" with "Add Admin" button
- [ ] Search input: searches name, email
- [ ] Status filter buttons: All, Active, Admin, Deactivated
- [ ] Table: Name, Email, Organization, Role (badge), Status (badge), Joined Date, Actions

### 25.2 User Actions

- [ ] Deactivate user — confirmation dialog, bans user, auto-suspends org
- [ ] Activate user — confirmation dialog, unbans user, auto-unsuspends org
- [ ] Delete user — confirmation dialog, cascading delete of all org data
- [ ] Cannot perform actions on yourself

### 25.3 Add Admin

- [ ] Click "Add Admin" — dialog opens
- [ ] Full Name, Email, Password (min 6 chars) inputs
- [ ] "Create Admin" button — creates platform admin user
- [ ] Error display for validation failures

---

## Flow 26: Admin — Grants

### 26.1 Stat Cards

- [ ] "All" card + per-stage cards with counts
- [ ] Click card — filters table

### 26.2 Grants Table

- [ ] Search: title, funder, organization
- [ ] Stage filter buttons with counts
- [ ] Table: Title, Funder, Organization, Stage, Score, Amount, Deadline, Created
- [ ] Stage badges color-coded
- [ ] Score badges color-coded (>= 80 green, >= 50 yellow, < 50 red)
- [ ] "Showing X of Y grants" summary

---

## Flow 27: Admin — Proposals

### 27.1 Stat Cards

- [ ] Per-status cards with counts

### 27.2 Proposals Table

- [ ] Search: title, organization, grant
- [ ] Status filter buttons
- [ ] Table: Title, Grant, Organization, Status, Quality Score, Created
- [ ] "Showing X of Y proposals" summary

---

## Flow 28: Admin — Source Analytics

### 28.1 Date Range Filter (NEW)

- [ ] Top-of-page date-range picker present with preset pills: Last 7 days, Last 30 days, Custom
- [ ] Selecting a preset re-loads charts and tables for the new window
- [ ] Custom range opens start/end date pickers
- [ ] Selected range is reflected in the URL query (e.g., `?from=...&to=...`) and survives page reload
- [ ] Date range is inherited by the source detail page when navigating from "View"

### 28.2 Header Stats

- [ ] Total in Catalog
- [ ] Active Grants (with % of catalog)
- [ ] New This Week (with today count)
- [ ] Sources Tracked (with stale count)
- [ ] Org Pickup Rate (with fraction)
- [ ] Stats reflect the selected date range

### 28.3 Pipeline Conversion Funnel

- [ ] Central Catalog → Picked Up → Screened → Pending Approval → Proposals
- [ ] Each step shows count and "X% of prev"

### 28.4 New Grants Over Time Chart

- [ ] Chart shows daily grant counts across the selected date range (defaults to last 7 days)
- [ ] X-axis: dates in range; Y-axis: per-day count
- [ ] Empty range shows zero-state placeholder (no error)

### 28.5 Source Effectiveness Chart (NEW)

- [ ] Horizontal bar chart shows per-source totals across the selected range
- [ ] Sources are ordered by volume; long source names truncate cleanly
- [ ] Tooltip on hover shows exact source name + count

### 28.6 Stale Sources Panel

- [ ] List of sources with stale flag (> 48h since last seen)
- [ ] Each shows: source name, "last seen Xd ago"

### 28.7 Source Breakdown Table

- [ ] Search input filters sources
- [ ] Table columns: Source, Total, Active, New, Picked Up, Avg Eligibility, Last Seen, Stale indicator, "View" link
- [ ] Summary row at bottom: "All Sources" totals
- [ ] "View" link navigates to source detail page (carries the selected date range via URL params)

### 28.8 Source Detail Page

- [ ] Back link to source analytics (preserves date range)
- [ ] Source name header
- [ ] Summary stats: Total, Active, Expired, Picked Up, Green/Yellow/Red, No score, Proposals
- [ ] Filter buttons: All, Active, Expired, Green, Yellow, Red
- [ ] Grants table (sortable): Title, Funder, Deadline, Amount, First Seen, Last Seen, Status, Eligibility, Confidence, Orgs Picked Up, Proposals, Source URL

---

## Flow 29: Admin — Agencies

### 29.1 Agency List

- [ ] Title with agency count
- [ ] Search: agency name, owner name, email
- [ ] Table: Agency, Owner, Status, Orgs count, Created, Actions
- [ ] Status badges: Setup Pending, Active, Trialing, Past Due, Canceled

### 29.2 Row Actions

- [ ] "View Details" — links to agency detail page
- [ ] "View as Agency" — switches admin to agency dashboard
- [ ] "Suspend" — suspends agency and all linked orgs
- [ ] "Unsuspend" — reactivates agency and all linked orgs
- [ ] "Delete" — unlinks orgs and profiles, deletes agency

### 29.3 Agency Detail Page

- [ ] Back button, agency name, status badge
- [ ] Owner info: avatar, name, email
- [ ] Created/Updated timestamps
- [ ] Action buttons: View as Agency, Suspend/Unsuspend, Delete
- [ ] Orgs table: Name, Sector, Status, Plan, Tester, Grants count, Created, Actions (link to org detail)

---

## Flow 30: Admin — Settings

### 30.1 Profile Tab

- [ ] Name and Email inputs
- [ ] Save button with success/error message

### 30.2 Password Tab

- [ ] Current Password, New Password, Confirm Password
- [ ] Validation: match check, min length
- [ ] "Change" button

### 30.3 Appearance Tab

- [ ] Theme select: Light, Dark, System
- [ ] Timezone select (17 options)
- [ ] Date Format select: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD (with live preview)
- [ ] Save button

---

## Flow 31: Admin — Impersonation

### 31.1 View as Organization

- [ ] From org list or detail: click "View as Organization"
- [ ] Admin session switches to org's dashboard context
- [ ] Admin can see org's pipeline, documents, proposals, etc.
- [ ] Cookie `admin-view-org-id` is set (24h expiry)
- [ ] Admin can navigate back to admin panel

### 31.2 View as Agency

- [ ] From agency list or detail: click "View as Agency"
- [ ] Admin session switches to agency dashboard context
- [ ] Admin can see agency's organizations, analytics, etc.
- [ ] Admin can navigate back to admin panel

---

## Flow 32: Agency — Setup

- [ ] New agency user lands on `/agency/setup`
- [ ] Agency name input field
- [ ] Form validation: name required
- [ ] Submit — marks setup as complete, redirects to `/agency`
- [ ] Already-completed setup — redirects to dashboard

---

## Flow 33: Agency — Dashboard

### 33.1 Overview

- [ ] Agency name and subscription status displayed
- [ ] 3 metric cards: Organizations count, Total Grants, Subscription Status
- [ ] Organization cards: name, sector, status badge, grant count
- [ ] Cards are clickable — switches to that org's context, navigates to `/dashboard`
- [ ] "New Organization" button

### 33.2 Org Context Switching

- [ ] Click org card — context switches (sets active org)
- [ ] Dashboard now shows selected org's data
- [ ] Sidebar shows org context
- [ ] Can navigate back to agency by clearing context

---

## Flow 34: Agency — Organizations

### 34.1 Organization List

- [ ] Table: Name, Sector, Status, Grants, Created Date
- [ ] Status badges: Active/Approved (green), Suspended (orange), Pending (amber)
- [ ] Mission shown if available

### 34.2 Actions

- [ ] "Open" button — switches to org dashboard context
- [ ] "Suspend" button — suspends org
- [ ] "Unsuspend" button — reactivates org

### 34.3 Create Organization

- [ ] Click "New Organization" — creation form
- [ ] Fields: name (required), ein, mission, sector, address, phone, website, founding_year, geographic_focus, description
- [ ] Optional questionnaire: annual budget, staff count, description, narratives
- [ ] Submit — creates org with status "approved" and plan "agency"
- [ ] Copies agency's is_tester flag
- [ ] Document upload option for narrative/supporting files

---

## Flow 35: Agency — Analytics

### 35.1 Summary Metrics

- [ ] Organizations count, Total Grants, Pending Deadlines, Total Pipeline Value

### 35.2 Pipeline Overview

- [ ] Stage distribution across all orgs: discovery, screening, pending_approval, drafting, closed

### 35.3 Upcoming Deadlines

- [ ] Scrollable list of next 10 deadlines across all orgs

### 35.4 Organization Breakdown

- [ ] Table: org name, sector, status, grant count, pipeline value, deadline count

### 35.5 Recent Activity

- [ ] Last 20 activity entries across all orgs

---

## Flow 36: Agency — Billing

- [ ] Current Plan card: name, price, features checklist
- [ ] Trial info (if applicable): days remaining, end date
- [ ] Org count and grant limit (unlimited for agency)
- [ ] "Manage Billing" button → Stripe customer portal
- [ ] Pilot Tester badge (if is_tester): "Full access, no payment required"

---

## Flow 37: Agency — Settings

### 37.1 Profile & Account Tab

- [ ] Avatar upload with preview (PNG, JPEG, WebP, max 2MB)
- [ ] Name and email fields
- [ ] Save profile button
- [ ] Change Password section (hidden for OAuth)
- [ ] Current/New/Confirm password fields

### 37.2 Agency Details Tab

- [ ] Agency name (editable)
- [ ] Created date (read-only)
- [ ] Organizations count (read-only)
- [ ] Subscription status badge (read-only)
- [ ] Account Owner card: avatar, name, email, role badge

### 37.3 Appearance Tab

- [ ] Theme selector: Light, Dark, System
- [ ] Timezone selector
- [ ] Date format selector with live preview
- [ ] "Restart Tour" button — restarts agency tour

---

## Flow 38: Emails

### 38.1 Welcome Email

- [ ] Sent immediately after registration (org or agency)
- [ ] Subject: "Welcome to Fundory - Your Grant Assistant Awaits!"
- [ ] Contains: org name, pending review status, next steps

### 38.2 Organization Approved Email

- [ ] Sent when admin approves org
- [ ] Subject: "Your Organization Has Been Approved!"
- [ ] Contains: org name, approval date

### 38.3 Organization Rejected Email

- [ ] Sent when admin rejects org
- [ ] Subject: "Update on Your Fundory Application"
- [ ] Contains: org name, rejection reason (if provided)

### 38.4 Trial Ending Email

- [ ] Sent 3 days before trial ends (Stripe webhook)
- [ ] Subject: "Your Fundory Trial is Ending Soon"
- [ ] Contains: org name, plan name, trial end date

### 38.5 Complete Profile Reminder Email

- [ ] Sent on days 3, 7, and 14 after registration (cron)
- [ ] Only sent to approved orgs with incomplete profiles
- [ ] Day 12+: final reminder subject
- [ ] Contains: org name, missing narratives/budget flags

### 38.6 Grant Eligible Email

- [ ] Sent when screening completes or grant moves to pending_approval
- [ ] Subject: "Eligible Grant: [Grant Title]"
- [ ] Contains: grant title, funder, amount, deadline, screening score, missing doc flags
- [ ] Triggered by: notification listener, cron fallback, or stage change listener
- [ ] Dedup prevents duplicate sends per grant

### 38.7 Proposal Ready Email

- [ ] Sent when proposal generation completes
- [ ] Subject: "Proposal Draft Ready: [Grant Title]"
- [ ] Contains: grant title, org name, proposal link

### 38.8 Grant Digest Email (NEW)

- [ ] Sent by the every-10-minutes cron when an org has multiple newly-eligible grants in the same window
- [ ] Replaces (or supplements) per-grant emails to avoid spamming the user with many separate messages
- [ ] Subject mentions the count of eligible grants (e.g., "N eligible grants ready for review")
- [ ] Body lists each grant with: title, funder, amount, deadline, screening score, urgency badge
- [ ] Footer CTA links to `/pipeline`
- [ ] Dedup via `grant_email_log` so the same grant isn't included in two digests
- [ ] If only one grant qualifies, the system still sends a single-grant email (not a 1-item digest)

---

## Flow 39: Cron Jobs & Background Processes

### 39.1 Grant Eligible Emails Cron (`/api/cron/grant-eligible-emails`)

- [ ] Runs **every 10 minutes** via GitHub Actions (`.github/workflows/cron-emails.yml`, schedule `*/10 * * * *`)
- [ ] Endpoint requires `Authorization: Bearer ${CRON_SECRET}` (returns 401 otherwise — fail-closed)
- [ ] Finds screening_completed notifications from last 24 hours
- [ ] Checks `grant_email_log` for dedup
- [ ] Groups multiple eligible grants for the same org into a single digest email (see 38.8)
- [ ] Sends emails for grants in screening or pending_approval stage
- [ ] Logs sent emails

### 39.2 Profile Reminders Cron (`/api/cron/profile-reminders`)

- [ ] Runs **every 30 minutes** via GitHub Actions (schedule `*/30 * * * *`)
- [ ] Endpoint requires `CRON_SECRET` bearer auth
- [ ] Targets: day 3, 7, 14 after registration
- [ ] Only approved orgs with incomplete profiles
- [ ] Checks `profile_reminder_log` for dedup

### 39.3 Close Expired Grants Cron (`/api/cron/close-expired-grants`)

- [ ] Finds grants with past deadlines in discovery/screening/pending_approval
- [ ] Moves them to "closed" stage
- [ ] Creates grant_closed notifications per org

### 39.4 Hourly Org Grant Fetch (`/api/cron/hourly-org-fetch`) (NEW)

- [ ] Runs **every hour on the hour** via GitHub Actions (`.github/workflows/cron-org-fetch.yml`, schedule `0 * * * *`)
- [ ] Endpoint requires `CRON_SECRET` bearer auth (fail-closed)
- [ ] Calls Supabase RPC `next_org_fetch_batch()` to pick the oldest orgs due for refresh
- [ ] Picks roughly `ceil(eligible_orgs / 24)` orgs per tick so every eligible org refreshes ≥ once per 24h
- [ ] **Eligibility filter:** only Professional / Agency / tester orgs — free-tier orgs are excluded from rotation
- [ ] **24-hour cooldown:** orgs whose `last_grant_fetch_at` is within the last 24h are skipped, so each org is fetched at most once per day
- [ ] Hours where no orgs qualify: cron returns success with an empty batch (no error)
- [ ] Each picked org triggers the n8n `fetch-grants` webhook; results update the `grant_fetch_status` table

### 39.5 Fan-Out Central Grants (`/api/cron/fan-out-central-grants`)

- [ ] Gets all approved orgs
- [ ] Triggers n8n fetch-grants workflow for each
- [ ] 2-second stagger between webhook calls
- [ ] Updates `grant_fetch_status` table
- [ ] Endpoint requires `CRON_SECRET` bearer auth

### 39.6 Notification Email Listener (PM2 process)

- [ ] Subscribes to `notifications` table INSERT events
- [ ] Subscribes to `grants` table UPDATE events
- [ ] Filters for screening_completed, proposal_generated notifications
- [ ] Detects stage changes to pending_approval
- [ ] Calls `/api/hooks/notification-email` webhook
- [ ] Auto-reconnects on channel drop (5-second delay)

---

## Flow 40: Stripe Webhooks

### 40.1 checkout.session.completed

- [ ] Setup mode: sets default payment method
- [ ] Subscription mode: updates org subscription_status, stripe_subscription_id

### 40.2 customer.subscription.updated

- [ ] Updates subscription_status (active, trialing, past_due, canceled)
- [ ] Updates plan based on price ID
- [ ] Updates trial_ends_at

### 40.3 customer.subscription.deleted

- [ ] Sets subscription_status to "canceled"

### 40.4 customer.subscription.trial_will_end

- [ ] Sends trial ending email to org owner (3 days before)

### 40.5 invoice.payment_failed

- [ ] Marks org as past_due

---

## Flow 41: Real-time & WebSocket Features

### 41.1 Pipeline

- [ ] Grant stage changes reflected without refresh (Supabase Realtime + polling)
- [ ] Notification toasts for workflow events
- [ ] Grant fetch status banner updates in real-time

### 41.2 Discovery

- [ ] Search results stream in as sources respond
- [ ] Status messages update during search
- [ ] Completion banner appears when done

### 41.3 Documents

- [ ] Upload/delete in another tab — list updates
- [ ] AI category updates after n8n processing

### 41.4 Notifications

- [ ] Sidebar badge updates in real-time (polling every 10s)
- [ ] New notifications appear without refresh

### 41.5 Proposals

- [ ] Sections update during n8n generation
- [ ] Quality review results stream in
- [ ] Pipeline cards (kanban + list) show "Generating proposal…" state for in-flight runs (15s client poll)

### 41.6 Admin View-Mode Side-Effects

- [ ] When an admin uses "View as Organization", visiting `/notifications` does **not** mark that org's notifications as read
- [ ] Workflow events fired during admin view are scoped via `getUserOrgId` + `isAdminViewMode` so the org's own users still see fresh badges

---

## Flow 42: Responsive & Cross-Browser

### 42.1 Mobile Responsiveness

- [ ] All pages render correctly on mobile (375px width)
- [ ] Sidebar collapses to hamburger menu
- [ ] Tables switch to card layout on mobile
- [ ] Kanban board is horizontally scrollable
- [ ] Dialogs fit mobile screen
- [ ] Touch interactions work (no hover-only features block usage)

### 42.2 Tablet

- [ ] All pages render correctly on tablet (768px width)
- [ ] Sidebar behaves correctly (collapse or overlay)

### 42.3 Desktop

- [ ] All pages render correctly at 1280px+
- [ ] Full table layouts visible
- [ ] Sidebar fully expanded by default

### 42.4 Cross-Browser

- [ ] Chrome: all features work
- [ ] Firefox: all features work
- [ ] Safari: all features work
- [ ] Edge: all features work

### 42.5 Dark Mode

- [ ] Toggle to dark theme in Settings → Appearance
- [ ] All pages render correctly in dark mode
- [ ] No contrast issues with text/badges
- [ ] Charts and graphs visible in dark mode

---

## Flow 43: Admin — Org Pickup

### 43.1 List Page (`/admin/org-pickup`)

- [ ] Navigate to `/admin/org-pickup` from the admin sidebar
- [ ] Date-range picker at the top with presets: Last 7 days, Last 30 days, Custom
- [ ] Selecting a preset re-loads all metrics, charts, and tables
- [ ] Selected range survives page reload (URL params)

### 43.2 Summary Cards

- [ ] Orgs (total eligible orgs in range)
- [ ] Total pickups (grants picked up across all orgs)
- [ ] Pickup rate (% of catalog that orgs are picking up)
- [ ] Avg pickups per org

### 43.3 Charts

- [ ] Pickup-rate trend line across the selected range
- [ ] Per-source pickup horizontal bar chart (which catalog sources are converting into pickups)

### 43.4 Org Breakdown Table

- [ ] Sortable columns: Org Name, Sector, Status, Pickups, Pickup Rate (%), Stage Distribution
- [ ] Rows color-code stages (discovery / screening / pending / drafting / closed)
- [ ] Click a row — navigates to `/admin/org-pickup/[orgId]` (date range carries via URL)
- [ ] Empty range shows zero-state placeholder

### 43.5 Org Detail Page (`/admin/org-pickup/[orgId]`)

- [ ] Back link returns to list with the same date range applied
- [ ] Stage breakdown for the selected org over the range
- [ ] Source breakdown for the selected org
- [ ] Full picked-up grants list: title, funder, source, picked-up date, stage

---

## Flow 44: Admin — Fetch Queue

### 44.1 Queue Order Section

- [ ] Navigate to `/admin/fetch-queue` from the admin sidebar
- [ ] Header note clarifies that only Professional / Agency / tester orgs appear (free-tier excluded)
- [ ] Sortable table columns: Org, Status, Grants added, Last checked, Next check, Error
- [ ] Status badges color-coded: success (green), failed (red), running (blue), never/pending (gray)
- [ ] Failed rows expose the underlying error (tooltip or expand row)
- [ ] "Next check" reflects the 24-hour cooldown — orgs fetched recently show a future timestamp ≥ 24h out

### 44.2 Date-Range Pills

- [ ] Pills present: Yesterday, Last 7 days, Last 30 days, Custom
- [ ] Clicking a pill filters Execution History below

### 44.3 Execution History

- [ ] Per-org day-level drilldown: org name, date, grants added count
- [ ] **Yesterday tab now reports correct org counts** (e.g., orgs that picked up grants from `central_grants` show up; previously Yesterday showed 0 because the view only counted `manual_grants`)
- [ ] Counts include catalog pickups via `central_grants` UNION `manual_grants` (the `grants_full` view)
- [ ] Click a row to drill into that org's daily history if applicable

### 44.4 Detail Page (`/admin/fetch-queue/[orgId]`)

- [ ] Per-org history view with full timeline of fetch executions
- [ ] Each entry: timestamp, source, grants added, status, error
- [ ] Back button returns to fetch-queue list

---

## Flow 45: Admin — System Errors

### 45.1 List Page (`/admin/system-errors`)

- [ ] Navigate to `/admin/system-errors` from the admin sidebar
- [ ] Title and subtitle indicate this is a rollup of n8n workflow failures (logged by the Error Notification Handler workflow alongside Slack alerts)
- [ ] Search input filters by keyword (workflow name, error message, org)
- [ ] Filter controls: by error type, by org, by time range

### 45.2 Grouped Rollup

- [ ] Errors are grouped by fingerprint (similar errors collapsed into a single row)
- [ ] Each row shows: error fingerprint / message, count, error type, org, last occurrence timestamp
- [ ] Sortable by count and last occurrence

### 45.3 Error Detail

- [ ] Click a row — expands or navigates to detail showing full stack trace, workflow ID, timestamp, org name
- [ ] Stack trace is readable (monospace, scrollable for long traces)
- [ ] Errors logged via HTTP Request node (so the row is written even if a Supabase node fails inside the failing workflow)

### 45.4 Cross-checks

- [ ] Trigger the throwaway error-test workflow in n8n — within ~1 min the row appears in `/admin/system-errors` AND a Slack alert fires
- [ ] Confirm error_type and workflow_id match the original failure
