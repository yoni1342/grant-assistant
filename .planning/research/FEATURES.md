# Features Research: Grant Management Web App

**Research Date:** 2026-02-13
**Domain:** Grant lifecycle management dashboard
**Context:** Building web UI to replace Plane interface for 14 existing n8n automation workflows
**Sources:** Submittable, Fluxx, Instrumentl, OpenGrants, GrantHub, Foundant, SmartSimple competitor analysis

## Table Stakes (Must Have or Users Leave)

These are expected in any grant management tool. Missing any of these makes the product feel incomplete.

### 1. Grant Pipeline Dashboard
- **What:** Visual overview of all grants by lifecycle stage (Discovery → Screening → Drafting → Submission → Award → Reporting)
- **Complexity:** Medium
- **Why table stakes:** Every competitor has this. Users need the "command center" view
- **Our advantage:** n8n already tracks lifecycle states — we just need to display them
- **Dependencies:** Supabase schema, auth

### 2. Deadline & Task Tracking
- **What:** Calendar view of upcoming deadlines, overdue alerts, urgency indicators (critical <24h, urgent <48h, soon <7d)
- **Complexity:** Medium
- **Why table stakes:** Missed deadlines = lost grants. This is existential for grant writers
- **Our advantage:** n8n WF10 already calculates urgency levels and generates checklists
- **Dependencies:** Pipeline dashboard, date-fns

### 3. Document Repository
- **What:** Browse, search, and filter organizational documents (org docs, budgets, financial statements, letters of support)
- **Complexity:** Medium
- **Why table stakes:** Grant applications require the same docs repeatedly. Quick retrieval is critical
- **Our advantage:** n8n WF4 already categorizes documents with AI
- **Dependencies:** Supabase Storage or Google Drive links, search

### 4. Application Status Tracking
- **What:** Detailed view of each grant application — current stage, history, attached documents, AI outputs, submission status
- **Complexity:** Medium
- **Why table stakes:** Users need to drill into any grant and see everything about it
- **Our advantage:** All data already exists in n8n workflow outputs
- **Dependencies:** Pipeline dashboard, Supabase schema

### 5. Search & Filter
- **What:** Search across grants, documents, narratives. Filter by status, deadline, funder, amount, category
- **Complexity:** Low-Medium
- **Why table stakes:** With 50+ active grants, finding things quickly is essential
- **Dependencies:** Supabase full-text search, pipeline data

### 6. Team Activity & Collaboration
- **What:** Activity feed showing who did what, when. Comments on grants. Basic task assignment
- **Complexity:** Medium
- **Why table stakes:** 2-5 person team needs visibility into each other's work
- **Dependencies:** Auth (user identities), Supabase Realtime

### 7. Financial Tracking
- **What:** Budget summaries per grant, award amounts, spending tracking, financial overview
- **Complexity:** Medium
- **Why table stakes:** Compliance requires knowing budget vs actuals
- **Our advantage:** n8n WF7 generates budgets with AI narratives
- **Dependencies:** Budget data in Supabase

### 8. Reporting Interface
- **What:** View, edit, and manage interim/final grant reports. Track reporting deadlines
- **Complexity:** Medium
- **Why table stakes:** Post-award reporting is mandatory. Missing report deadlines can trigger clawbacks
- **Our advantage:** n8n WF14 auto-drafts reports with metrics
- **Dependencies:** Award tracking, report data in Supabase

### 9. Funder/Contact Management
- **What:** Funder profiles with contact info, past awards, giving patterns, relationship notes
- **Complexity:** Low-Medium
- **Why table stakes:** Grant writers maintain funder relationships across multiple applications
- **Our advantage:** n8n WF9 researches funders via ProPublica 990 data
- **Dependencies:** Supabase schema for funders

## Differentiators (Competitive Advantage)

These set us apart from generic grant management tools. Most are already built in n8n — the UI just needs to expose them.

### 1. AI Grant Discovery & Matching ★
- **What:** Automated search across Grants.gov, ProPublica, USAspending, CFDA, Philanthropy News Digest. AI-scored eligibility matching
- **Complexity:** Low (UI only — n8n WF1 + WF2/3 already do this)
- **Competitor gap:** Instrumentl charges $179+/mo just for discovery. Most tools have manual search only
- **Dependencies:** n8n webhook triggers, eligibility display

### 2. AI Proposal Generation ★
- **What:** One-click full proposal generation. AI writes narrative sections customized to funder requirements, pulls from narrative library, assembles complete documents
- **Complexity:** Medium (UI for triggering, status tracking, reviewing AI output)
- **Competitor gap:** No competitor offers end-to-end AI proposal generation. This is the headline feature
- **Dependencies:** Proposal workspace UI, n8n WF5+WF6 webhooks

### 3. AI Quality Review ★
- **What:** Pre-submission AI review checking jargon, passive voice, vagueness, repetition, funder alignment. Scored quality report with rewrite suggestions
- **Complexity:** Low (UI for displaying results — n8n WF8 already does the analysis)
- **Competitor gap:** Unique. No competitor offers AI-powered proposal quality review
- **Dependencies:** Proposal workspace, n8n WF8 webhook

### 4. Narrative/Content Library
- **What:** Reusable narrative blocks (org mission, team bios, methodology descriptions) that can be AI-customized per grant
- **Complexity:** Medium (CRUD UI + AI customization trigger)
- **Competitor gap:** Some competitors have template libraries but none offer AI customization per funder
- **Dependencies:** Supabase schema, n8n WF5 webhook

### 5. AI Budget Builder
- **What:** Budget templates with AI-written narrative justifications. Respects funder-specific administrative cost caps
- **Complexity:** Medium (budget editor UI + AI trigger)
- **Competitor gap:** Most tools have basic spreadsheets. AI-generated budget narratives are unique
- **Dependencies:** Budget data model, n8n WF7 webhook

### 6. Automated Submission
- **What:** Auto-submit to grant portals via Puppeteer, or generate copy-paste reference sheets for manual submission
- **Complexity:** Low (UI for triggering + status display — n8n WF11 handles automation)
- **Competitor gap:** No competitor auto-submits. This is a significant differentiator
- **Dependencies:** Submission workflow, n8n WF11 webhook

### 7. Funder Intelligence
- **What:** AI-generated funder strategy briefs using ProPublica 990 data. Giving patterns, priorities, submission preferences
- **Complexity:** Low (display UI — n8n WF9 generates the analysis)
- **Competitor gap:** Instrumentl has basic funder data. AI strategy briefs are unique
- **Dependencies:** Funder profiles, n8n WF9 webhook

### 8. Analytics & Insights Dashboard
- **What:** Win rates, pipeline value, average time-to-submission, success by funder type, team productivity metrics
- **Complexity:** Medium-High
- **Competitor gap:** Most tools have basic reporting. Cross-pipeline analytics are rare in this market
- **Dependencies:** Historical data in Supabase, charting library

## Anti-Features (Deliberately NOT Building)

| Feature | Why NOT |
|---------|---------|
| Built-in grant database | Integrate with Grants.gov/ProPublica/USAspending instead. Maintaining a grant DB is a separate product (Instrumentl, GrantStation) |
| Full accounting system | Integrate with QuickBooks/Xero if needed later. Grant budget tracking ≠ full accounting |
| Funder/reviewer portal | Different product entirely. We serve grant writers, not funders |
| Mobile-first design | Grant writing happens on desktop. Mobile-responsive for status checking, not proposal editing |
| Real-time collaborative editing | Overkill for 2-5 person team. Google Docs handles collaborative editing; we handle orchestration |
| Built-in email/messaging | Slack integration stays in n8n. Don't rebuild Slack |
| Custom workflow builder UI | n8n IS the workflow builder. Don't recreate n8n's UI inside our app |

## MVP Feature Prioritization

### P1 — Replace Plane (Must ship)
1. Grant Pipeline Dashboard (kanban + list view)
2. Grant Detail View (all info about one grant)
3. Deadline Calendar & Urgency Tracking
4. Document Vault Browser
5. AI Proposal Trigger + Review Display
6. Eligibility Screening Results
7. Search & Filter
8. Auth + Team Access
9. n8n Webhook Integration Layer

### P2 — Expose AI Power (Ship soon after)
1. Narrative Library Management
2. Budget Builder Interface
3. Funder Intelligence Display
4. Submission Checklist Tracker
5. Award & Reporting Interface

### P3 — Polish & Differentiate (Future)
1. Analytics Dashboard
2. Activity Feed & Collaboration
3. Funder/Contact CRM
4. Auto-Submit UI
5. Notification Center (replace Slack for in-app)

## Feature Dependencies

```
Auth ──────────────────────┐
  │                        │
  ├→ Supabase Schema ──────┤
  │    │                   │
  │    ├→ Pipeline Dashboard│
  │    │    │              │
  │    │    ├→ Grant Detail │
  │    │    ├→ Deadline Cal │
  │    │    └→ Search/Filter│
  │    │                   │
  │    ├→ Document Vault   │
  │    ├→ Narrative Library │
  │    ├→ Budget Builder   │
  │    └→ Funder Profiles  │
  │                        │
  └→ n8n Webhook Layer ────┤
       │                   │
       ├→ AI Proposal Gen  │
       ├→ AI Quality Review│
       ├→ Eligibility Screen│
       ├→ Budget Generation│
       ├→ Funder Analysis  │
       └→ Submission/Awards│
```

---
*Research completed: 2026-02-13*
*Confidence: MEDIUM — based on competitor analysis, industry publications, and user reviews*
