# Grant Assistant

## What This Is

A web application that gives grant writers a clean, modern UI to manage the entire grant lifecycle — from discovering opportunities through submission and post-award reporting. It replaces the current Plane-based interface with a purpose-built Next.js dashboard, while keeping n8n as the automation engine for AI processing, external API calls, and background workflows. Built for a small nonprofit team now, with plans to become a multi-tenant SaaS product.

## Core Value

Grant writers can see their entire pipeline at a glance, trigger any automation with one click, and never miss a deadline — all from a single, purpose-built interface instead of juggling Plane issues and n8n dashboards.

## Requirements

### Validated

- ✓ Grant discovery from Grants.gov, ProPublica, USAspending, CFDA, Philanthropy News Digest — existing (n8n WF1)
- ✓ AI-powered eligibility screening with GREEN/YELLOW/RED scoring — existing (n8n WF2/3)
- ✓ Document vault with AI categorization — existing (n8n WF4)
- ✓ Narrative library with AI customization — existing (n8n WF5)
- ✓ Full proposal generation assembling narratives, docs, budgets, funder intel — existing (n8n WF6)
- ✓ Budget generation with AI narrative justifications — existing (n8n WF7)
- ✓ AI proposal quality review (jargon, passive voice, vagueness, alignment) — existing (n8n WF8)
- ✓ Funder analysis with ProPublica 990 research and strategy briefs — existing (n8n WF9)
- ✓ Dynamic submission checklists with deadline urgency tracking — existing (n8n WF10)
- ✓ Dual-mode submission (Puppeteer auto-submit + manual entry sheets) — existing (n8n WF11)
- ✓ Post-submission tracking with follow-up reminders — existing (n8n WF12)
- ✓ Award notification handling with reporting calendar creation — existing (n8n WF13)
- ✓ AI-drafted grant reports (interim + final) with metrics — existing (n8n WF14)
- ✓ Central state routing triggering workflows on lifecycle transitions — existing (n8n WF15)

### Active

- [ ] Supabase database replacing Plane as the primary data store
- [ ] Email/password + Google OAuth authentication via Supabase Auth
- [ ] Dashboard with pipeline overview, deadline calendar, recent activity, and key metrics
- [ ] Pipeline view (kanban + list) showing grants by lifecycle stage
- [ ] Proposal workspace for drafting, editing, and reviewing AI-generated content
- [ ] Document vault browser with search, filter, and categorization
- [ ] Budget management interface
- [ ] Narrative library management
- [ ] Submission checklist tracker with completion percentage
- [ ] Grant discovery/search interface triggering n8n fetch workflows
- [ ] Eligibility screening results display
- [ ] Funder intelligence display
- [ ] Award tracking and reporting interface
- [ ] Real-time status updates when n8n completes workflows
- [ ] Responsive design (desktop-first, mobile-friendly)
- [ ] shadcn/ui component system with clean, minimal design (Linear/Notion aesthetic)

### Out of Scope

- Direct API calls to Grants.gov/ProPublica/USAspending from Next.js — n8n handles all external APIs
- AI/LLM SDK integration in Next.js — n8n handles all OpenAI calls
- Multi-tenant SaaS features (org isolation, billing, onboarding) — deferred to v2
- Mobile native app — web-responsive is sufficient for v1
- Real-time chat/messaging — Slack integration stays in n8n
- Replacing n8n workflow logic — n8n remains the automation engine

## Context

**Current system:** 14 n8n workflows running on self-hosted n8n at thebrownmine.com, using Plane (self-hosted) as the data store and project tracker. The system is fully functional — the gap is the user interface. Currently, users interact through Plane's generic issue tracker and n8n's workflow dashboard, which is clunky for non-technical grant writers.

**Migration strategy:** Replace Plane with Supabase as the database. The web app becomes the primary UI. n8n workflows are updated to read/write Supabase instead of Plane. All AI processing, external API calls, and scheduled tasks stay in n8n — the web app triggers workflows via webhook and displays results.

**n8n webhook endpoints (12 existing):**
- `/webhook/analyze-funder` — Funder research
- `/webhook/customize-narrative` — AI narrative customization
- `/webhook/draft-report` — Report auto-drafting
- `/webhook/generate-budget` — Budget generation
- `/webhook/generate-checklist` — Submission checklist
- `/webhook/generate-proposal` — Full proposal generation
- `/webhook/get-documents` — Document retrieval
- `/webhook/log-submission` — Log submission
- `/webhook/prepare-submission` — Submission preparation
- `/webhook/record-award` — Record awarded grant
- `/webhook/review-proposal` — AI proposal review
- `/webhook/screen-grant` — Eligibility screening

**Team:** Small nonprofit team (2-5 people) sharing the same organization's grants and pipeline.

**Codebase map:** See `.planning/codebase/` for detailed analysis of the existing Next.js scaffold.

## Constraints

- **Tech stack**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui — already scaffolded
- **Backend**: Supabase (auth, database, realtime) — replacing Plane
- **Automation**: n8n stays as the workflow engine — web app communicates via webhooks
- **Auth**: Supabase Auth with email/password + Google OAuth
- **Design system**: shadcn/ui with clean minimal aesthetic (Linear/Notion style)
- **Deployment**: Vercel for the web app, existing self-hosted n8n at thebrownmine.com
- **Approach**: UI-first — build the frontend and Supabase schema first, then update n8n workflows to write to Supabase

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Replace Plane with Supabase | Plane is a generic project tracker — a purpose-built database gives us proper schema, realtime, and auth | — Pending |
| Keep n8n for all automation | n8n workflows are battle-tested and handle 14 complex workflows. Rewriting in Next.js API routes adds risk with no user benefit | — Pending |
| Webhook triggers (web → n8n) | Simple, reliable. Web app POSTs to n8n webhook URLs, n8n writes results to Supabase. No message bus complexity | — Pending |
| UI-first development | Build what users see first. Supabase schema + Next.js pages. Update n8n workflows to use Supabase after the UI works | — Pending |
| shadcn/ui component library | Pre-built accessible components that match the clean/minimal aesthetic. Faster than building from scratch | — Pending |
| Small team auth now, SaaS later | Simple Supabase Auth + RLS for the team. Multi-tenancy architecture deferred to v2 | — Pending |

---
*Last updated: 2026-02-13 after initialization*
