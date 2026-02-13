# Stack Research: Grant Management Web App

**Research Date:** 2026-02-13
**Domain:** Grant lifecycle management dashboard
**Context:** Brownfield — Next.js 16 scaffold exists, adding Supabase + shadcn/ui + n8n webhook integration

## Core Framework (Already Decided)

| Technology | Version | Rationale | Confidence |
|-----------|---------|-----------|------------|
| Next.js | 16.1.6 | Already scaffolded. App Router, RSC, server actions. Industry standard for full-stack React | HIGH |
| React | 19.2.3 | Already installed. Server components, use() hook, Actions API | HIGH |
| TypeScript | 5.x | Already configured. Strict mode enabled | HIGH |
| Tailwind CSS | 4.x | Already installed. Utility-first, pairs with shadcn/ui | HIGH |

## Database & Auth

| Technology | Package | Rationale | Confidence |
|-----------|---------|-----------|------------|
| Supabase | `@supabase/supabase-js` ^2.x | Replaces Plane. Postgres + Auth + Realtime + Storage in one. Row Level Security for team access | HIGH |
| Supabase SSR | `@supabase/ssr` ^0.5.x | Server-side auth for Next.js App Router. Replaces deprecated `@supabase/auth-helpers-nextjs` | HIGH |
| Supabase Auth | Built into supabase-js | Email/password + Google OAuth. Handles sessions, tokens, RLS context | HIGH |
| Supabase Realtime | Built into supabase-js | Live updates when n8n writes to DB (grant status changes, workflow completions) | HIGH |

**CRITICAL:** Use `@supabase/ssr` — NOT `@supabase/auth-helpers-nextjs` which is deprecated. The SSR package handles cookie-based auth correctly with Next.js App Router server components.

## UI Components

| Technology | Package | Rationale | Confidence |
|-----------|---------|-----------|------------|
| shadcn/ui | CLI-installed components | Not a dependency — copies component source into project. Full customization control. Clean minimal aesthetic matches Linear/Notion | HIGH |
| Radix UI | `@radix-ui/*` (via shadcn) | Accessible primitives under shadcn. Dialog, Dropdown, Tabs, etc. | HIGH |
| Lucide React | `lucide-react` | Icon library used by shadcn/ui. Consistent, tree-shakeable | HIGH |
| Sonner | `sonner` | Toast notifications. shadcn's built-in toast is deprecated in favor of Sonner | HIGH |
| class-variance-authority | `cva` | Variant management for components (shadcn dependency) | HIGH |
| clsx + tailwind-merge | `clsx`, `tailwind-merge` | Conditional class merging (shadcn dependency via `cn()` utility) | HIGH |

## Forms & Validation

| Technology | Package | Rationale | Confidence |
|-----------|---------|-----------|------------|
| React Hook Form | `react-hook-form` ^7.x | Performant form library. Works with shadcn Form component. Uncontrolled by default (minimal re-renders) | HIGH |
| Zod | `zod` ^3.x | Schema validation. Shared between client forms and server actions. Type inference with TypeScript | HIGH |
| @hookform/resolvers | `@hookform/resolvers` ^5.x | Connects Zod schemas to React Hook Form | HIGH |

## Data Fetching & State

| Technology | Package | Rationale | Confidence |
|-----------|---------|-----------|------------|
| Server Components | Built into Next.js | Default for data fetching. Direct Supabase queries in server components — no client-side fetching for initial loads | HIGH |
| Server Actions | Built into Next.js | Mutations (create/update/delete). Type-safe, progressive enhancement | HIGH |
| nuqs | `nuqs` ^2.x | URL search params state management. For filters, search, pagination on pipeline/discovery pages | MEDIUM |
| TanStack Query | `@tanstack/react-query` ^5.x | Optional — for client-side cache/polling when Realtime isn't suitable. Useful for n8n webhook status polling | MEDIUM |

**Note:** Start with Server Components + Server Actions + Supabase Realtime. Only add TanStack Query if you need complex client-side caching patterns.

## Date & Time

| Technology | Package | Rationale | Confidence |
|-----------|---------|-----------|------------|
| date-fns | `date-fns` ^4.x | Date formatting/manipulation. Better tree-shaking than dayjs. Deadline tracking is core to grant management | HIGH |

## File Handling

| Technology | Package | Rationale | Confidence |
|-----------|---------|-----------|------------|
| Supabase Storage | Built into supabase-js | Document vault storage. Replaces Google Drive as primary storage (n8n can still use Google Drive for generation, but web app reads from Supabase Storage) | MEDIUM |

**Note:** For v1, documents can remain in Google Drive with links stored in Supabase. Migration to Supabase Storage is a v2 consideration.

## What NOT to Use

| Technology | Reason |
|-----------|--------|
| `@supabase/auth-helpers-nextjs` | Deprecated. Use `@supabase/ssr` instead |
| Prisma / Drizzle ORM | Supabase client handles queries directly. Adding an ORM adds complexity without benefit when using Supabase's query builder |
| Redux / Zustand | Overkill for this app. Server components + Supabase Realtime handles state. Use React context for simple client state (sidebar open, modals) |
| Next.js API routes for n8n proxy | Don't proxy n8n webhooks through Next.js API routes — call n8n webhooks directly from server actions. Simpler, fewer moving parts |
| Moment.js | Deprecated. Use date-fns |
| Styled Components / Emotion | Conflicts with RSC. Tailwind + shadcn handles all styling needs |
| NextAuth.js | Supabase Auth handles everything. Adding NextAuth is redundant complexity |
| Custom toast library | Use Sonner (shadcn's recommended replacement) |

## Package Installation Plan

```bash
# Supabase
npm install @supabase/supabase-js @supabase/ssr

# shadcn/ui (CLI setup, then add components as needed)
npx shadcn@latest init
npx shadcn@latest add button card dialog dropdown-menu input label table tabs badge separator sheet sidebar

# Forms
npm install react-hook-form zod @hookform/resolvers

# Utilities
npm install date-fns lucide-react sonner nuqs

# shadcn dependencies (installed automatically by shadcn CLI)
# clsx, tailwind-merge, class-variance-authority, @radix-ui/*
```

## Architecture Implications

1. **Supabase client setup:** Create `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server components/actions), `lib/supabase/middleware.ts` (auth middleware)
2. **shadcn components:** Live in `components/ui/` — source-owned, fully customizable
3. **Server actions:** Live in `app/actions/` or co-located with features — handle all Supabase writes and n8n webhook triggers
4. **n8n integration:** Server actions call n8n webhook URLs, n8n writes results directly to Supabase via Supabase REST API

---
*Research completed: 2026-02-13*
