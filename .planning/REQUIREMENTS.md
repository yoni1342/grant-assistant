# Requirements: Grant Assistant

**Defined:** 2026-02-13
**Core Value:** Grant writers can see their entire pipeline at a glance, trigger any automation with one click, and never miss a deadline

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User can log in with email and password
- [ ] **AUTH-03**: User can sign in with Google OAuth
- [ ] **AUTH-04**: User session persists across browser refresh and tab switches
- [ ] **AUTH-05**: Unauthenticated users are redirected to login page
- [ ] **AUTH-06**: User can log out from any page
- [ ] **AUTH-07**: User can invite team members by email to join the organization

### Dashboard

- [ ] **DASH-01**: User sees pipeline overview with count of grants per lifecycle stage
- [ ] **DASH-02**: User sees deadline calendar with upcoming deadlines and urgency indicators (critical <24h, urgent <48h, soon <7d)
- [ ] **DASH-03**: User sees recent activity feed showing grants added, proposals generated, submissions made
- [ ] **DASH-04**: User sees key metrics: total grants, win rate, pipeline value, pending deadlines

### Pipeline

- [ ] **PIPE-01**: User can view grants as a kanban board organized by lifecycle stage (Discovery → Screening → Drafting → Submission → Award → Reporting)
- [ ] **PIPE-02**: User can view grants in a sortable, filterable table/list view
- [ ] **PIPE-03**: User can switch between kanban and list view
- [ ] **PIPE-04**: User can click a grant to see its full detail page with status, documents, proposals, history
- [ ] **PIPE-05**: User can search grants by name, funder, or keyword
- [ ] **PIPE-06**: User can filter grants by status, deadline range, funder, and amount range
- [ ] **PIPE-07**: User can manually add a new grant opportunity with funder name, grant name, deadline, and amount
- [ ] **PIPE-08**: User can edit grant details from the detail page
- [ ] **PIPE-09**: Pipeline updates in real-time when n8n workflows complete (via Supabase Realtime)

### Grant Discovery

- [ ] **DISC-01**: User can trigger grant discovery search across Grants.gov, ProPublica, USAspending, CFDA, and Philanthropy News Digest
- [ ] **DISC-02**: Discovered grants appear automatically in the pipeline at Discovery stage
- [ ] **DISC-03**: User can trigger AI eligibility screening on any grant
- [ ] **DISC-04**: User sees screening results with GREEN/YELLOW/RED score and analysis notes

### Proposals

- [ ] **PROP-01**: User can trigger one-click AI proposal generation for any eligible grant
- [ ] **PROP-02**: User can view AI-generated proposal content organized by sections
- [ ] **PROP-03**: User can edit proposal content inline
- [ ] **PROP-04**: User can trigger AI quality review on a draft proposal
- [ ] **PROP-05**: User sees quality review results: scores, issues found, rewrite suggestions
- [ ] **PROP-06**: User sees proposal generation progress while n8n is working (not a loading spinner forever)

### Narrative Library

- [ ] **NARR-01**: User can browse existing narrative blocks (mission, impact, methods, evaluation, etc.)
- [ ] **NARR-02**: User can create new narrative blocks
- [ ] **NARR-03**: User can edit existing narrative blocks
- [ ] **NARR-04**: User can trigger AI customization of a narrative for a specific grant/funder
- [ ] **NARR-05**: User can search and filter narratives by category

### Documents

- [ ] **DOCS-01**: User can browse the document vault with search and filter by type
- [ ] **DOCS-02**: User can upload new documents (PDF, DOCX, XLSX, PNG, JPG)
- [ ] **DOCS-03**: Uploaded documents are automatically categorized by AI (via n8n)
- [ ] **DOCS-04**: User can view document metadata (name, type, upload date, size)
- [ ] **DOCS-05**: User can delete documents from the vault

### Budgets

- [ ] **BUDG-01**: User can create a new budget for a grant with line items
- [ ] **BUDG-02**: User can trigger AI budget narrative generation
- [ ] **BUDG-03**: User can edit budget line items and narrative
- [ ] **BUDG-04**: User can save budget templates for reuse

### Funder Intelligence

- [ ] **FUND-01**: User can trigger funder analysis for any grant
- [ ] **FUND-02**: User sees funder strategy brief with giving patterns, priorities, and submission preferences
- [ ] **FUND-03**: User sees funder profile with ProPublica 990 data

### Submission

- [ ] **SUBM-01**: User can generate a dynamic submission checklist for any grant
- [ ] **SUBM-02**: User can check off checklist items as they complete them
- [ ] **SUBM-03**: User sees deadline urgency indicators on the checklist
- [ ] **SUBM-04**: User can trigger auto-submission to grant portals (via n8n Puppeteer)
- [ ] **SUBM-05**: User can log a manual submission with confirmation details
- [ ] **SUBM-06**: User sees submission status and history for each grant

### Awards & Reporting

- [ ] **AWRD-01**: User can record an award with amount, period, and requirements
- [ ] **AWRD-02**: User sees a reporting calendar with interim and final report due dates
- [ ] **AWRD-03**: User can trigger AI report generation for an awarded grant
- [ ] **AWRD-04**: User can view and edit AI-generated reports before submission

### Analytics

- [ ] **ANLZ-01**: User sees win rate (awards / submissions)
- [ ] **ANLZ-02**: User sees total pipeline value (sum of pending grant amounts)
- [ ] **ANLZ-03**: User sees average time from discovery to submission
- [ ] **ANLZ-04**: User sees success rate by funder type

### Infrastructure

- [ ] **INFR-01**: Supabase database schema covers all grant lifecycle entities (grants, documents, narratives, budgets, proposals, submissions, awards, reports)
- [ ] **INFR-02**: Row Level Security policies protect all tables
- [ ] **INFR-03**: n8n webhook integration layer with shared secret authentication
- [ ] **INFR-04**: Supabase Realtime subscriptions for live status updates
- [ ] **INFR-05**: Workflow execution tracking table showing n8n progress (running/completed/failed)
- [ ] **INFR-06**: Responsive design (desktop-first, usable on tablet/mobile for status checking)
- [ ] **INFR-07**: shadcn/ui component system with clean minimal design

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Multi-Tenancy

- **MTNT-01**: Multiple organizations can use the app with isolated data
- **MTNT-02**: Organization billing and subscription management
- **MTNT-03**: Organization onboarding flow

### Collaboration

- **COLB-01**: Users can comment on grants, proposals, and documents
- **COLB-02**: Users can assign tasks to team members
- **COLB-03**: Users can @mention team members in comments

### Notifications

- **NOTF-01**: User receives in-app notifications for grant updates
- **NOTF-02**: User receives email notifications for approaching deadlines
- **NOTF-03**: User can configure notification preferences

### Advanced Features

- **ADVN-01**: Magic link (passwordless) login
- **ADVN-02**: Custom workflow builder UI (expose n8n configuration)
- **ADVN-03**: Grant recommendation engine (AI suggests best-fit grants)
- **ADVN-04**: Collaborative real-time document editing

## Out of Scope

| Feature | Reason |
|---------|--------|
| Built-in grant database | Integrate with Grants.gov/ProPublica/USAspending via n8n instead |
| Full accounting system | Grant budget tracking only; integrate QuickBooks/Xero if needed later |
| Funder/reviewer portal | Different product — we serve grant writers, not funders |
| Mobile native app | Web responsive is sufficient for status checking |
| Real-time collaborative editing | Google Docs handles this; we handle orchestration |
| Built-in email/messaging | Slack integration stays in n8n |
| Custom n8n workflow builder UI | n8n IS the workflow builder |
| Direct API calls to Grants.gov etc. | n8n handles all external APIs |
| AI/LLM SDK in Next.js | n8n handles all OpenAI calls |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| AUTH-07 | Phase 1 | Pending |
| INFR-01 | Phase 1 | Pending |
| INFR-02 | Phase 1 | Pending |
| INFR-03 | Phase 1 | Pending |
| INFR-04 | Phase 1 | Pending |
| INFR-05 | Phase 1 | Pending |
| INFR-06 | Phase 1 | Pending |
| INFR-07 | Phase 1 | Pending |
| DASH-01 | Phase 2 | Pending |
| DASH-02 | Phase 2 | Pending |
| DASH-03 | Phase 2 | Pending |
| DASH-04 | Phase 2 | Pending |
| PIPE-01 | Phase 2 | Pending |
| PIPE-02 | Phase 2 | Pending |
| PIPE-03 | Phase 2 | Pending |
| PIPE-04 | Phase 2 | Pending |
| PIPE-05 | Phase 2 | Pending |
| PIPE-06 | Phase 2 | Pending |
| PIPE-07 | Phase 2 | Pending |
| PIPE-08 | Phase 2 | Pending |
| PIPE-09 | Phase 2 | Pending |
| DISC-01 | Phase 2 | Pending |
| DISC-02 | Phase 2 | Pending |
| DISC-03 | Phase 2 | Pending |
| DISC-04 | Phase 2 | Pending |
| DOCS-01 | Phase 3 | Pending |
| DOCS-02 | Phase 3 | Pending |
| DOCS-03 | Phase 3 | Pending |
| DOCS-04 | Phase 3 | Pending |
| DOCS-05 | Phase 3 | Pending |
| NARR-01 | Phase 3 | Pending |
| NARR-02 | Phase 3 | Pending |
| NARR-03 | Phase 3 | Pending |
| NARR-04 | Phase 3 | Pending |
| NARR-05 | Phase 3 | Pending |
| PROP-01 | Phase 4 | Pending |
| PROP-02 | Phase 4 | Pending |
| PROP-03 | Phase 4 | Pending |
| PROP-04 | Phase 4 | Pending |
| PROP-05 | Phase 4 | Pending |
| PROP-06 | Phase 4 | Pending |
| FUND-01 | Phase 4 | Pending |
| FUND-02 | Phase 4 | Pending |
| FUND-03 | Phase 4 | Pending |
| BUDG-01 | Phase 5 | Pending |
| BUDG-02 | Phase 5 | Pending |
| BUDG-03 | Phase 5 | Pending |
| BUDG-04 | Phase 5 | Pending |
| SUBM-01 | Phase 5 | Pending |
| SUBM-02 | Phase 5 | Pending |
| SUBM-03 | Phase 5 | Pending |
| SUBM-04 | Phase 5 | Pending |
| SUBM-05 | Phase 5 | Pending |
| SUBM-06 | Phase 5 | Pending |
| AWRD-01 | Phase 6 | Pending |
| AWRD-02 | Phase 6 | Pending |
| AWRD-03 | Phase 6 | Pending |
| AWRD-04 | Phase 6 | Pending |
| ANLZ-01 | Phase 6 | Pending |
| ANLZ-02 | Phase 6 | Pending |
| ANLZ-03 | Phase 6 | Pending |
| ANLZ-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 68 total
- Mapped to phases: 68
- Unmapped: 0

---
*Requirements defined: 2026-02-13*
*Last updated: 2026-02-13 after roadmap creation*
