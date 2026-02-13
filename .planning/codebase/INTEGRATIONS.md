# External Integrations

**Analysis Date:** 2026-02-13

## Overview

This is a Next.js frontend application that integrates with:
1. **n8n workflow automation platform** (self-hosted) - Primary orchestration layer
2. **Multiple government and nonprofit grant databases** - Data source APIs
3. **Slack** - Notifications
4. **Plane** - Project management (self-hosted instance)
5. **ProPublica Nonprofit API** - Organization research

All integrations are accessed via HTTP/webhooks through n8n workflows. No direct SDK dependencies in the application layer.

## APIs & External Services

**Government Grant Databases:**
- **Grants.gov API** - `https://api.grants.gov/v1/api/search2`
  - Purpose: Search federal grants
  - Auth: API key (not yet integrated in frontend)
  - Endpoints: Grant search, grant details

- **USAspending.gov API** - `https://api.usaspending.gov/api/v2/`
  - Purpose: Spending data by CFDA code and award
  - Endpoints:
    - `/autocomplete/cfda/` - CFDA code lookup
    - `/search/spending_by_award/` - Award spending details
  - Auth: None (public API)

**Nonprofit Research:**
- **ProPublica Nonprofit API** - `https://projects.propublica.org/nonprofits/api/v2/`
  - Purpose: Lookup nonprofit organizations by name or EIN
  - Endpoints:
    - `/search.json?q={query}&state[id]={state_code}` - Search organizations
    - `/organizations/{ein}.json` - Get organization details by EIN
  - Auth: None (public API)
  - Usage: Funder/organization research in workflows

**Foundation Grants Data:**
- Gates Foundation Grants - `https://www.gatesfoundation.org/about/committed-grants`
  - Purpose: Browse committed grants database
  - Method: Web scraping or public database access

- Chan Zuckerberg Initiative - `https://chanzuckerberg.com/`
  - Purpose: Research foundation grants
  - Method: Web research

- Ford Foundation - `https://www.fordfoundation.org/work/our-grants/awarded-grants/grants-database/`
  - Purpose: Browse awarded grants database
  - Method: Web scraping or public database access

**Grant Opportunity Feeds:**
- **Philanthropy News Digest** - `https://www.philanthropynewsdigest.org/rfps`
  - Purpose: Feed of RFPs (Requests for Proposals) and grant opportunities
  - Endpoints: RSS feed with optional search parameter
  - Auth: None (public feed)
  - Query: `/rfps?format=rss&search={query}`

**Regional Grant Resources:**
- Pennsylvania Department of Community & Economic Development - `https://dced.pa.gov/programs-funding/`
  - Purpose: State grant programs
  - Method: Web research

- Georgia Grants Management - `https://grantsmanagement.georgia.gov/grants`
  - Purpose: State grant programs
  - Method: Web research

- Foundation Center Regional Maps - `https://maps.foundationcenter.org/api/1.0/maps/region?iso3166=US-PA`
  - Purpose: Foundation/funder location data for specific regions
  - Auth: None (public API)

**Yield Giving (MacKenzie Scott)** - `https://yieldgiving.com/gifts/`
- Purpose: Large donor grant opportunities (MacKenzie Scott announcements)
- Method: Web research

## Data Storage

**Project Management:**
- **Plane** (Self-hosted) - `https://plane.thebrownmine.com/api/v1/workspaces/grant-application-writer/`
  - Purpose: Store grant applications, documents, and project state
  - Client: HTTP REST API
  - Workspace: `grant-application-writer`
  - Project ID: `f65bffe2-ee6b-4647-9487-9b7dd73c0d19`
  - Auth: Generic credential type (API key or token)
  - Main operations:
    - Search issues: `/issues/?search={query}`
    - Get issues by tag: `?search=%5BOrgInfo%5D`, `%5BNarrative%5D`, `%5BBudget%5D`, `%5BDoc%5D`
    - Create issues: POST to `/issues/`
    - Update issues: PUT/PATCH to `/issues/{issueId}/`
    - Add comments: POST to `/issues/{issueId}/comments/`

**File Storage:**
- Local filesystem storage (Next.js `/public` directory)
- Plane asset storage for documents: `/api/assets/v2/static/`

**Caching:**
- None detected (relies on application-level caching via Next.js ISR if needed)

## Workflow Orchestration

**n8n** (Self-hosted) - `https://n8n.thebrownmine.com/webhook/`
- Purpose: Automation and workflow orchestration
- Webhook endpoints (accessible from frontend or other services):
  - `/webhook/analyze-funder` - Funder research and analysis
  - `/webhook/customize-narrative` - AI narrative customization
  - `/webhook/draft-report` - Grant report auto-drafting
  - `/webhook/generate-budget` - Budget generation
  - `/webhook/generate-checklist` - Submission checklist generation
  - `/webhook/generate-proposal` - Full grant proposal generation
  - `/webhook/get-documents` - Document retrieval
  - `/webhook/log-submission` - Log grant submission
  - `/webhook/prepare-submission` - Submission preparation
  - `/webhook/record-award` - Record awarded grant
  - `/webhook/review-proposal` - AI proposal review/criticism
  - `/webhook/screen-grant` - Grant eligibility screening

## Authentication & Identity

**Auth Provider:**
- None detected in frontend code (minimal auth implementation)
- Plane API: Generic credential type (token/API key based)
- Slack API: Predefined credential type (OAuth or webhook token)
- n8n webhooks: No explicit auth (may be protected at n8n level or via bearer token)

**Note:** Authentication strategies are defined at workflow/integration level, not in the Next.js application.

## Monitoring & Observability

**Error Tracking:**
- Not detected in application code

**Logs:**
- n8n workflow logs (platform-native)
- Application logs via console (Next.js standard output)
- Plane activity tracking (platform-native)

**Notifications:**
- **Slack** - `https://slack.com/api/chat.postMessage`
  - Purpose: Award notifications, workflow status updates, completion notifications
  - Auth: Predefined credential type (OAuth token or webhook URL)
  - Used in workflows for: Award notifications, report delivery, submission confirmations

## CI/CD & Deployment

**Hosting:**
- Designed for Vercel (per Next.js README and default deployment recommendations)
- Can run on any Node.js-compatible server
- Development: `npm run dev` on port 3000
- Production: `next build && next start` or `npm run build && npm start`

**CI Pipeline:**
- Not detected in repository (no GitHub Actions, GitLab CI, etc.)
- Workflows directory contains n8n workflow exports (JSON), not CI configuration

**Infrastructure:**
- n8n platform: Self-hosted at `thebrownmine.com`
- Plane platform: Self-hosted at `thebrownmine.com`
- External APIs: Public cloud services (Grants.gov, USAspending, ProPublica, Slack)

## Environment Configuration

**Required environment variables:**
- None in `.env` file (not present in repository)
- Configuration expected via Next.js conventions:
  - `NEXT_PUBLIC_*` variables for client-side exposure
  - Server-side variables not exposed in git

**Typical configuration needed (not present):**
- `NEXT_PUBLIC_API_BASE_URL` - n8n webhook base URL (if needed client-side)
- `PLANE_API_KEY` - Plane authentication
- `SLACK_WEBHOOK_URL` or `SLACK_BOT_TOKEN` - Slack notifications
- Grant API keys (Grants.gov if direct integration needed)

**Secrets location:**
- Expected: Environment variables or Vercel secrets dashboard (if deployed to Vercel)
- Not yet configured

## Webhooks & Callbacks

**Incoming:**
- n8n webhooks receive POST requests from workflows/external triggers
- Plane webhooks (if configured) for issue state changes
- Slack webhooks for incoming messages (if implemented)

**Outgoing:**
- n8n → Slack: `chat.postMessage` for notifications
- n8n → Plane: Issue creation, updates, comments
- Frontend → n8n: HTTP POST to webhook endpoints (when implemented in Next.js app)
- Grants.gov / USAspending / ProPublica: Query requests (no outgoing webhooks)

## Data Flow

1. **User interacts with Next.js frontend** (future implementation)
2. **Frontend triggers n8n webhooks** (via HTTP POST with grant/funder data)
3. **n8n workflows:**
   - Query external APIs (Grants.gov, USAspending, ProPublica)
   - Call LLMs for AI content generation (configured in n8n, not exposed here)
   - Store results in Plane issues
   - Send Slack notifications
4. **Results returned to frontend** (or displayed in Plane/Slack)

## Current Integration Status

**Active (in workflows):**
- ProPublica API (funder research)
- USAspending API (grant/award search)
- Grants.gov API (federal grants)
- Plane API (document storage & project tracking)
- Slack API (notifications)
- n8n webhooks (workflow orchestration)

**Passive (research only):**
- Gates Foundation, Chan Zuckerberg, Ford Foundation, Philanthropy News Digest, regional grant databases (web-accessible, not API-integrated)

**Not yet integrated in frontend:**
- Grants.gov direct SDK (workflows handle it)
- Database clients (Plane used as document store)
- LLM SDKs (handled in n8n workflows)

---

*Integration audit: 2026-02-13*
