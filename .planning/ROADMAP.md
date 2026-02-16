# Roadmap: Grant Assistant

## Overview

This roadmap transforms 14 existing n8n automation workflows into a purpose-built Next.js web application. We start with foundation (authentication, database schema, and component architecture), then build the grant pipeline command center with AI discovery integration. Next comes document/narrative management to support proposal generation, followed by the headline AI features (eligibility screening and proposal generation). We finish with budget management and submission tracking, then close the loop with post-award reporting and analytics.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Authentication** - Supabase setup, auth flow, RLS, component library
- [ ] **Phase 2: Grant Pipeline & Discovery** - Pipeline dashboard, grant CRUD, AI discovery integration
- [x] **Phase 3: Document Vault & Narrative Library** - File storage, document management, narrative CRUD
- [ ] **Phase 4: Eligibility Screening & Proposal Generation** - AI screening, proposal generation, quality review
- [x] **Phase 5: Budget Builder & Submission Tracking** - Budget management, submission checklists, tracking
- [ ] **Phase 6: Awards, Reporting & Analytics** - Award management, report generation, analytics dashboard

## Phase Details

### Phase 1: Foundation & Authentication
**Goal**: Establish authentication, database schema, and development foundation before feature work begins
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, INFR-01, INFR-02, INFR-03, INFR-04, INFR-05, INFR-06, INFR-07
**Success Criteria** (what must be TRUE):
  1. User can sign up with email/password and Google OAuth
  2. User can log in and stay authenticated across browser sessions
  3. User can log out from any page
  4. Unauthenticated users are redirected to login page
  5. All Supabase tables have Row Level Security policies protecting data
  6. n8n webhooks can authenticate with shared secret and write to Supabase
  7. shadcn/ui component system is installed with three-layer architecture (ui/primitives/blocks)
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 2: Grant Pipeline & Discovery
**Goal**: Users can manage their grant pipeline and trigger AI-powered discovery workflows
**Depends on**: Phase 1
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06, PIPE-07, PIPE-08, PIPE-09, DISC-01, DISC-02, DISC-03, DISC-04
**Success Criteria** (what must be TRUE):
  1. User sees dashboard overview with grants per stage, deadline calendar, and key metrics
  2. User can view grants in kanban board and list view, switching between them
  3. User can search, filter, and manually add grants
  4. User can click a grant to see full detail page with status and history
  5. User can trigger grant discovery across all sources (Grants.gov, ProPublica, USAspending, CFDA, PND)
  6. Discovered grants appear automatically in pipeline at Discovery stage via Realtime updates
  7. User can trigger AI eligibility screening and see GREEN/YELLOW/RED results
  8. Pipeline updates in real-time when n8n workflows complete
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 3: Document Vault & Narrative Library
**Goal**: Users can manage documents and narrative content used in proposal generation
**Depends on**: Phase 2
**Requirements**: DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, NARR-01, NARR-02, NARR-03, NARR-04, NARR-05
**Success Criteria** (what must be TRUE):
  1. User can upload documents (PDF, DOCX, XLSX, PNG, JPG) to Supabase Storage
  2. User can browse document vault with search and filter by type
  3. Uploaded documents are automatically categorized by AI via n8n
  4. User can view document metadata and delete documents
  5. User can browse, create, and edit narrative blocks
  6. User can trigger AI customization of narratives for specific grants/funders
  7. User can search and filter narratives by category
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Dependencies, Storage bucket, and document server actions
- [ ] 03-02-PLAN.md — Document Vault UI with data table, upload, and Realtime
- [ ] 03-03-PLAN.md — Narrative Library with Tiptap editor and AI customization

### Phase 4: Eligibility Screening & Proposal Generation
**Goal**: Users can generate AI-powered proposals and quality reviews (core value proposition)
**Depends on**: Phase 3
**Requirements**: PROP-01, PROP-02, PROP-03, PROP-04, PROP-05, PROP-06, FUND-01, FUND-02, FUND-03
**Success Criteria** (what must be TRUE):
  1. User can trigger one-click AI proposal generation for any eligible grant
  2. User sees proposal generation progress (not infinite loading spinner)
  3. User can view AI-generated proposal content organized by sections
  4. User can edit proposal content inline
  5. User can trigger AI quality review and see scores, issues, and rewrite suggestions
  6. User can trigger funder analysis and see strategy briefs with ProPublica 990 data
  7. User sees funder profile with giving patterns and submission preferences
**Plans**: 3 plans

Plans:
- [ ] 04-01-PLAN.md — Dependencies, server actions, and webhook route extensions
- [ ] 04-02-PLAN.md — Proposals list page and generation trigger on grant detail
- [ ] 04-03-PLAN.md — Proposal detail with section editing, quality review, and funder analysis

### Phase 5: Budget Builder & Submission Tracking
**Goal**: Users can create budgets and track submissions through completion
**Depends on**: Phase 4
**Requirements**: BUDG-01, BUDG-02, BUDG-03, BUDG-04, SUBM-01, SUBM-02, SUBM-03, SUBM-04, SUBM-05, SUBM-06
**Success Criteria** (what must be TRUE):
  1. User can create new budgets with line items
  2. User can trigger AI budget narrative generation
  3. User can edit budget line items and narratives
  4. User can save budget templates for reuse
  5. User can generate dynamic submission checklists with deadline urgency indicators
  6. User can check off checklist items as they complete them
  7. User can trigger auto-submission to grant portals via n8n Puppeteer
  8. User can log manual submissions with confirmation details
  9. User sees submission status and history for each grant
**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md — Dependencies, budget/submission server actions, webhook extensions, urgency utility
- [x] 05-02-PLAN.md — Budget Builder UI with dynamic line items, templates, and AI narrative
- [x] 05-03-PLAN.md — Submission Tracking UI with checklist, urgency badges, dual-mode submit, and history

### Phase 6: Awards, Reporting & Analytics
**Goal**: Users can manage awarded grants, generate reports, and track performance metrics
**Depends on**: Phase 5
**Requirements**: AWRD-01, AWRD-02, AWRD-03, AWRD-04, ANLZ-01, ANLZ-02, ANLZ-03, ANLZ-04
**Success Criteria** (what must be TRUE):
  1. User can record awards with amount, period, and reporting requirements
  2. User sees reporting calendar with interim and final report due dates
  3. User can trigger AI report generation for awarded grants
  4. User can view and edit AI-generated reports before submission
  5. User sees analytics dashboard with win rate, pipeline value, time-to-submission, and success rate by funder
**Plans**: 3 plans

Plans:
- [ ] 06-01-PLAN.md — Dependencies, award/report/analytics server actions, webhook extensions
- [ ] 06-02-PLAN.md — Award UI with list, create form, detail page, reporting calendar, report editor
- [ ] 06-03-PLAN.md — Analytics dashboard with metrics cards and success rate chart

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Authentication | 0/TBD | Not started | - |
| 2. Grant Pipeline & Discovery | 0/TBD | Not started | - |
| 3. Document Vault & Narrative Library | 3/3 | Complete | 2026-02-13 |
| 4. Eligibility Screening & Proposal Generation | 3/3 | Complete | 2026-02-13 |
| 5. Budget Builder & Submission Tracking | 3/3 | ✓ Complete | 2026-02-16 |
| 6. Awards, Reporting & Analytics | 0/3 | Planned | - |

---
*Roadmap created: 2026-02-13*
*Last updated: 2026-02-16 — Phase 6 planned (3 plans in 2 waves)*
