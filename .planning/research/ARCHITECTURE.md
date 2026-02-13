# Architecture Research

**Domain:** Grant Management Web Application
**Researched:** 2026-02-13
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (Browser)                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Next.js      │  │ shadcn/ui    │  │ Supabase     │              │
│  │ Pages        │  │ Components   │  │ Client       │              │
│  │ (Client)     │  │              │  │ (Realtime)   │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
├─────────┴─────────────────┴─────────────────┴───────────────────────┤
│                      NEXT.JS SERVER LAYER                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ Server          │  │ Server Actions  │  │ Route Handlers  │     │
│  │ Components      │  │ (Mutations)     │  │ (API Routes)    │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
│           │                    │                    │               │
│           └────────────────────┴────────────────────┘               │
│                               │                                     │
│                    ┌──────────┴──────────┐                          │
│                    │                     │                          │
├────────────────────┴─────────────────────┴──────────────────────────┤
│               INTEGRATION & DATA LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐      ┌──────────────────────────┐     │
│  │  Supabase Backend       │      │  n8n Automation Engine   │     │
│  ├─────────────────────────┤      ├──────────────────────────┤     │
│  │ • PostgreSQL + RLS      │◄────►│ • 14 Workflows           │     │
│  │ • Realtime (WAL)        │      │ • Webhook Triggers       │     │
│  │ • Auth (Email, OAuth)   │      │ • Database Write-back    │     │
│  │ • Storage (Documents)   │      │ • External APIs          │     │
│  └─────────────────────────┘      └──────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Next.js Pages (Server Components)** | Initial data fetching, SEO, rendering authenticated routes | App Router routes with async server components |
| **Next.js Client Components** | Interactive UI, form handling, realtime subscriptions | 'use client' components with hooks |
| **Server Actions** | Mutations, form submissions, triggering n8n webhooks | 'use server' functions with FormData |
| **Supabase Server Client** | Secure database operations, auth verification | Created in Server Components/Actions |
| **Supabase Browser Client** | Realtime subscriptions, client-side reads | Created in Client Components |
| **n8n Workflows** | Heavy processing, AI operations, external API calls | Triggered by webhooks from Next.js |
| **Supabase RLS** | Authorization layer, multi-tenant isolation | PostgreSQL policies using auth.uid() |

## Recommended Project Structure

```
grant-assistant/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth route group
│   │   ├── login/
│   │   │   └── page.tsx        # Login page
│   │   └── signup/
│   │       └── page.tsx        # Signup page
│   ├── (dashboard)/            # Protected route group
│   │   ├── layout.tsx          # Dashboard layout with auth check
│   │   ├── page.tsx            # Dashboard home
│   │   ├── grants/             # Grant management
│   │   │   ├── _components/    # Grant-specific components
│   │   │   ├── [id]/           # Individual grant detail
│   │   │   └── page.tsx        # Grants list
│   │   ├── documents/          # Document vault
│   │   │   ├── _components/
│   │   │   └── page.tsx
│   │   ├── narratives/         # Narrative library
│   │   │   ├── _components/
│   │   │   └── page.tsx
│   │   ├── budgets/            # Budget management
│   │   │   ├── _components/
│   │   │   └── page.tsx
│   │   ├── submissions/        # Submission tracking
│   │   │   ├── _components/
│   │   │   └── page.tsx
│   │   ├── awards/             # Award management
│   │   │   ├── _components/
│   │   │   └── page.tsx
│   │   └── reports/            # Report drafting
│   │       ├── _components/
│   │       └── page.tsx
│   ├── api/                    # Route handlers (webhooks from n8n)
│   │   ├── webhooks/
│   │   │   ├── grant-fetched/
│   │   │   │   └── route.ts    # Receives grant data from n8n
│   │   │   ├── screening-complete/
│   │   │   │   └── route.ts    # Receives screening results
│   │   │   ├── proposal-generated/
│   │   │   │   └── route.ts    # Receives generated proposals
│   │   │   ├── award-received/
│   │   │   │   └── route.ts    # Receives award notifications
│   │   │   └── report-drafted/
│   │   │       └── route.ts    # Receives drafted reports
│   │   └── n8n/
│   │       └── trigger/
│   │           └── route.ts    # Generic n8n trigger endpoint
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Landing page
│
├── lib/                        # Shared utilities
│   ├── supabase/               # Supabase client creation
│   │   ├── client.ts           # Browser client (for Client Components)
│   │   ├── server.ts           # Server client (for Server Components)
│   │   └── middleware.ts       # Middleware client (for auth refresh)
│   ├── actions/                # Server Actions organized by domain
│   │   ├── grants.ts           # Grant CRUD operations
│   │   ├── documents.ts        # Document operations
│   │   ├── narratives.ts       # Narrative operations
│   │   ├── budgets.ts          # Budget operations
│   │   ├── submissions.ts      # Submission operations
│   │   └── n8n.ts              # n8n webhook triggers
│   ├── db/                     # Database utilities
│   │   ├── schema.ts           # TypeScript types from database
│   │   └── queries.ts          # Reusable query functions
│   ├── validations/            # Zod schemas for validation
│   │   ├── grants.ts
│   │   ├── documents.ts
│   │   └── forms.ts
│   └── utils/
│       ├── constants.ts
│       └── helpers.ts
│
├── components/                 # Shared components
│   ├── ui/                     # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── primitives/             # Organization-specific wrappers
│   │   ├── app-button.tsx      # Styled button with defaults
│   │   ├── data-table.tsx      # Reusable data table
│   │   └── status-badge.tsx    # Grant status badges
│   ├── blocks/                 # Composed multi-component blocks
│   │   ├── grant-card.tsx      # Complete grant display card
│   │   ├── document-uploader.tsx
│   │   ├── narrative-editor.tsx
│   │   └── budget-table.tsx
│   └── layout/                 # Layout components
│       ├── nav.tsx
│       ├── sidebar.tsx
│       └── header.tsx
│
├── types/                      # TypeScript type definitions
│   ├── database.types.ts       # Generated from Supabase
│   ├── grants.ts
│   ├── workflows.ts
│   └── index.ts
│
├── middleware.ts               # Next.js middleware for auth
├── supabase/                   # Supabase migrations & config
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_realtime_config.sql
│   └── seed.sql
│
└── n8n/                        # n8n workflow documentation
    ├── README.md
    └── webhook-endpoints.md    # Document all webhook URLs
```

### Structure Rationale

- **Route Groups `(auth)` and `(dashboard)`:** Clean URL structure without affecting paths, allows different layouts
- **`_components/` folders:** Route-specific components that aren't shared, kept close to usage
- **Separate `lib/supabase/`:** Critical to have distinct client/server clients for Next.js App Router
- **`lib/actions/` for Server Actions:** Keeps 'use server' code organized by domain, not scattered in components
- **Layered component structure:** ui/ → primitives/ → blocks/ enables scaling without shadcn/ui chaos
- **`types/database.types.ts`:** Generated from Supabase CLI, never hand-written
- **`api/webhooks/` organized by workflow:** Each n8n workflow has a dedicated endpoint for clarity

## Architectural Patterns

### Pattern 1: Server-First with Client Islands

**What:** Default to Server Components for all routes and data fetching. Use Client Components only for interactivity (forms, realtime, user events).

**When to use:** Always. This is the default Next.js App Router pattern for 2026.

**Trade-offs:**
- **Pros:** Reduced JavaScript bundle, better initial load, server-side data security
- **Cons:** Requires understanding client/server boundary, can't use hooks in server components

**Example:**
```typescript
// app/(dashboard)/grants/page.tsx - Server Component
import { createClient } from '@/lib/supabase/server'
import { GrantsList } from './_components/grants-list'

export default async function GrantsPage() {
  const supabase = await createClient()

  // Fetch on server
  const { data: grants } = await supabase
    .from('grants')
    .select('*')
    .order('created_at', { ascending: false })

  return <GrantsList initialGrants={grants} />
}

// app/(dashboard)/grants/_components/grants-list.tsx - Client Component
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function GrantsList({ initialGrants }) {
  const [grants, setGrants] = useState(initialGrants)
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to realtime updates
    const channel = supabase
      .channel('grants-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'grants' },
        (payload) => {
          // Update local state when n8n writes back
          setGrants(current => [...current, payload.new])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return <div>{/* render grants */}</div>
}
```

### Pattern 2: Server Actions for Mutations + n8n Trigger

**What:** Use Server Actions for all data mutations. Validate input, write to Supabase, then trigger n8n webhook for heavy processing. n8n writes results back to Supabase, which triggers realtime update to UI.

**When to use:** Any workflow that requires AI processing, external API calls, or complex logic (proposal generation, screening, budget creation).

**Trade-offs:**
- **Pros:** Type-safe, progressive enhancement, single roundtrip, separates concerns
- **Cons:** Asynchronous completion (UI must handle pending state), requires webhook infrastructure

**Example:**
```typescript
// lib/actions/grants.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ScreenGrantSchema = z.object({
  grantId: z.string().uuid(),
  organizationProfile: z.object({
    mission: z.string(),
    budget: z.number(),
    location: z.string(),
  })
})

export async function screenGrant(formData: FormData) {
  const supabase = await createClient()

  // Validate input
  const input = ScreenGrantSchema.parse({
    grantId: formData.get('grantId'),
    organizationProfile: JSON.parse(formData.get('profile') as string)
  })

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Update grant status to 'screening'
  const { error: updateError } = await supabase
    .from('grants')
    .update({ status: 'screening' })
    .eq('id', input.grantId)
    .eq('user_id', user.id) // RLS check

  if (updateError) throw updateError

  // Trigger n8n screening workflow
  await fetch(process.env.N8N_WEBHOOK_SCREENING_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grantId: input.grantId,
      profile: input.organizationProfile,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/screening-complete`
    })
  })

  revalidatePath('/grants')

  return { success: true, message: 'Screening started' }
}

// app/api/webhooks/screening-complete/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const payload = await request.json()

  // Validate webhook signature (important!)
  const signature = request.headers.get('x-n8n-signature')
  if (!verifySignature(signature, payload)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Write n8n results back to Supabase
  const { error } = await supabase
    .from('grants')
    .update({
      status: payload.eligible ? 'eligible' : 'rejected',
      screening_score: payload.score,
      screening_notes: payload.notes,
      screened_at: new Date().toISOString()
    })
    .eq('id', payload.grantId)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Realtime will automatically notify subscribed clients
  return Response.json({ success: true })
}
```

### Pattern 3: Layered Component Architecture (shadcn/ui at Scale)

**What:** Organize shadcn/ui components into layers: `ui/` (raw shadcn), `primitives/` (org-specific wrappers), `blocks/` (composed features).

**When to use:** From day one. Prevents shadcn sprawl as the app grows.

**Trade-offs:**
- **Pros:** Scalable, consistent styling, easier refactoring, clear component boundaries
- **Cons:** Extra abstraction layer, team must understand the layers

**Example:**
```typescript
// components/ui/button.tsx - Raw shadcn/ui component
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva("inline-flex items-center justify-center...")
export { Button, buttonVariants }

// components/primitives/app-button.tsx - Organization wrapper
import { Button, buttonVariants } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export function AppButton({
  isLoading,
  children,
  ...props
}: { isLoading?: boolean } & React.ComponentProps<typeof Button>) {
  return (
    <Button disabled={isLoading} {...props}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
}

// components/blocks/grant-screening-form.tsx - Feature block
'use client'

import { useActionState } from 'react'
import { screenGrant } from '@/lib/actions/grants'
import { AppButton } from '@/components/primitives/app-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function GrantScreeningForm({ grantId }: { grantId: string }) {
  const [state, formAction, isPending] = useActionState(screenGrant, null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Screen Grant</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <input type="hidden" name="grantId" value={grantId} />
          {/* form fields */}
          <AppButton type="submit" isLoading={isPending}>
            Start Screening
          </AppButton>
        </form>
      </CardContent>
    </Card>
  )
}
```

### Pattern 4: RLS-First Authorization

**What:** Use Supabase Row Level Security as the primary authorization layer. Never bypass RLS in client code. Use service_role only in Server Actions when needed.

**When to use:** All database tables. Enable RLS by default, create policies for each operation.

**Trade-offs:**
- **Pros:** Authorization at database level, impossible to bypass from client, multi-tenant safe
- **Cons:** Policies can be complex, harder to debug, potential performance issues if not indexed

**Example:**
```sql
-- supabase/migrations/002_rls_policies.sql

-- Enable RLS on all tables
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Grants table policies
CREATE POLICY "Users can view their own grants"
  ON grants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own grants"
  ON grants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grants"
  ON grants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grants"
  ON grants FOR DELETE
  USING (auth.uid() = user_id);

-- Index for RLS performance (CRITICAL)
CREATE INDEX idx_grants_user_id ON grants(user_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_narratives_user_id ON narratives(user_id);

-- Don't use FOR ALL - separate policies are faster
```

### Pattern 5: Realtime-First State Synchronization

**What:** Use Supabase Realtime subscriptions to sync state when n8n completes work. Client subscribes to table changes, updates UI automatically.

**When to use:** Any long-running operation (proposal generation, screening, report drafting).

**Trade-offs:**
- **Pros:** Instant UI updates, no polling, works across tabs/devices
- **Cons:** Connection management complexity, requires cleanup, adds to Realtime billing

**Example:**
```typescript
// app/(dashboard)/grants/[id]/_components/grant-status.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export function GrantStatus({ grantId, initialStatus }: {
  grantId: string
  initialStatus: string
}) {
  const [status, setStatus] = useState(initialStatus)
  const supabase = createClient()

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel(`grant-${grantId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'grants',
          filter: `id=eq.${grantId}`
        },
        (payload) => {
          // n8n wrote back results, update UI
          setStatus(payload.new.status)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [grantId])

  return (
    <div>
      Status: {status}
      {status === 'screening' && <Spinner />}
    </div>
  )
}
```

## Data Flow

### Request Flow: User Action → n8n → Database → UI

```
1. USER SUBMITS FORM
   ↓
2. Server Action validates + writes to Supabase
   ↓
3. Server Action triggers n8n webhook
   ↓
4. n8n workflow executes (AI processing, external APIs)
   ↓
5. n8n calls Next.js webhook with results
   ↓
6. Next.js webhook writes results to Supabase
   ↓
7. Supabase Realtime broadcasts change
   ↓
8. Client subscription receives update
   ↓
9. UI updates automatically
```

### Authentication Flow

```
1. User logs in (email/password or Google OAuth)
   ↓
2. Supabase Auth creates session cookie
   ↓
3. Next.js middleware refreshes session on each request
   ↓
4. Server Components/Actions read user from cookie
   ↓
5. RLS policies enforce authorization at database level
```

### Document Upload Flow

```
1. User uploads file in Client Component
   ↓
2. File uploads to Supabase Storage (direct from browser)
   ↓
3. Server Action writes document metadata to database
   ↓
4. Server Action triggers n8n "Document Vault Manager" workflow
   ↓
5. n8n extracts text, generates embeddings, stores in vector DB
   ↓
6. n8n writes back processed status to Supabase
   ↓
7. UI updates via Realtime subscription
```

### Key Data Flows

1. **Grant Discovery → Screening → Drafting Flow:**
   - User manually adds grant OR n8n fetches grants automatically
   - User triggers screening → n8n Eligibility Screener workflow
   - If eligible → User triggers proposal draft → n8n Proposal Generator workflow
   - Proposal generated → User reviews → Optional AI Critic workflow
   - Finalized → Submission workflow

2. **n8n Bidirectional Communication:**
   - Next.js → n8n: HTTP POST to workflow webhook URL
   - n8n → Next.js: HTTP POST to `/api/webhooks/{workflow-name}` endpoint
   - n8n → Supabase: Direct database write using Supabase connection in n8n

3. **Realtime Sync Pattern:**
   - Client subscribes to specific table/row on mount
   - n8n or Server Action updates database
   - Postgres WAL → Supabase Realtime → Client subscription
   - Client updates local state → React re-renders

## Supabase Schema Design Recommendations

### Core Tables

```sql
-- Users (managed by Supabase Auth)
-- auth.users table is built-in

-- User profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name TEXT,
  mission TEXT,
  annual_budget NUMERIC,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grants
CREATE TABLE grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Grant details
  funder_name TEXT NOT NULL,
  grant_name TEXT NOT NULL,
  grant_url TEXT,
  deadline DATE,
  amount_min NUMERIC,
  amount_max NUMERIC,

  -- Lifecycle status
  status TEXT NOT NULL DEFAULT 'discovery',
  -- Status values: discovery, screening, eligible, rejected, drafting,
  --                reviewing, ready, submitted, awarded, reporting, closed

  -- Screening results (from n8n workflow 2)
  screening_score NUMERIC,
  screening_notes TEXT,
  screened_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_grants_user_id ON grants(user_id);
CREATE INDEX idx_grants_status ON grants(status);
CREATE INDEX idx_grants_deadline ON grants(deadline);

-- Documents (from n8n workflow 4)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File details
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_size BIGINT,
  mime_type TEXT,

  -- Document type
  document_type TEXT, -- '990', 'financials', 'board_list', 'certificate', etc.

  -- Processing status (from n8n)
  processing_status TEXT DEFAULT 'pending',
  extracted_text TEXT,
  embeddings_generated BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_type ON documents(document_type);

-- Narratives (from n8n workflow 5)
CREATE TABLE narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Narrative details
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT, -- 'mission', 'impact', 'methods', 'evaluation', etc.

  -- Versioning
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES narratives(id),

  -- AI metadata
  ai_customized BOOLEAN DEFAULT FALSE,
  source_documents UUID[], -- Array of document IDs used as source

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_narratives_user_id ON narratives(user_id);
CREATE INDEX idx_narratives_category ON narratives(category);

-- Budgets (from n8n workflow 7)
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_id UUID REFERENCES grants(id) ON DELETE SET NULL,

  -- Budget details
  budget_name TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  budget_items JSONB, -- Array of line items

  -- Template or specific
  is_template BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_grant_id ON budgets(grant_id);

-- Proposals (from n8n workflow 6)
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,

  -- Proposal content
  proposal_content JSONB, -- Structured sections
  word_count INTEGER,

  -- Generation metadata
  narratives_used UUID[], -- Array of narrative IDs
  budget_id UUID REFERENCES budgets(id),

  -- Review status
  ai_review_score NUMERIC,
  ai_review_feedback TEXT,
  reviewed_at TIMESTAMPTZ,

  -- Versioning
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES proposals(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_proposals_user_id ON proposals(user_id);
CREATE INDEX idx_proposals_grant_id ON proposals(grant_id);

-- Submissions (from n8n workflows 10, 11, 12)
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id),

  -- Submission details
  submitted_at TIMESTAMPTZ,
  submission_method TEXT, -- 'auto', 'manual'
  confirmation_number TEXT,

  -- Checklist
  checklist_items JSONB, -- Array of checklist items with status

  -- Tracking
  tracking_status TEXT DEFAULT 'pending',
  tracking_notes TEXT,
  last_checked_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_grant_id ON submissions(grant_id);

-- Awards (from n8n workflow 13)
CREATE TABLE awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES submissions(id),

  -- Award details
  award_amount NUMERIC NOT NULL,
  award_date DATE,
  award_period_start DATE,
  award_period_end DATE,

  -- Requirements
  reporting_requirements JSONB,
  payment_schedule JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_awards_user_id ON awards(user_id);
CREATE INDEX idx_awards_grant_id ON awards(grant_id);

-- Reports (from n8n workflow 14)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  award_id UUID NOT NULL REFERENCES awards(id) ON DELETE CASCADE,

  -- Report details
  report_type TEXT, -- 'interim', 'final', 'financial'
  due_date DATE,
  report_content JSONB,

  -- Status
  status TEXT DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,

  -- AI draft metadata
  ai_drafted BOOLEAN DEFAULT FALSE,
  draft_sources UUID[], -- Documents/data used

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_award_id ON reports(award_id);

-- Workflow execution tracking
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Workflow details
  workflow_name TEXT NOT NULL,
  workflow_status TEXT DEFAULT 'running',

  -- Related entity
  entity_type TEXT, -- 'grant', 'proposal', 'report', etc.
  entity_id UUID,

  -- Execution metadata
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- n8n execution ID (for debugging)
  n8n_execution_id TEXT
);

CREATE INDEX idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_entity ON workflow_executions(entity_type, entity_id);
```

### Schema Design Principles

1. **User isolation via user_id:** Every table has user_id for RLS
2. **Timestamps everywhere:** created_at, updated_at for audit trail
3. **JSONB for flexible data:** proposal_content, budget_items, checklist_items allow schema evolution
4. **UUID primary keys:** Better for distributed systems, harder to enumerate
5. **Index columns used in RLS policies:** Avoid performance pitfalls
6. **Separate policies per operation:** Don't use FOR ALL, use SELECT/INSERT/UPDATE/DELETE
7. **Soft relationships:** Use ON DELETE SET NULL for optional relationships, CASCADE for required

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-100 users** | Current architecture is optimal. Single Supabase instance, standard n8n workflows, no special optimization needed. |
| **100-1K users** | Add database connection pooling in Supabase (already included). Consider adding indexes on frequently queried columns. Monitor n8n workflow execution times. |
| **1K-10K users** | Implement caching layer (Next.js built-in caching + Redis for hot data). Consider splitting n8n workflows into smaller sub-workflows for better parallelization. Add database read replicas for reporting queries. |
| **10K-100K users** | Move to Supabase Pro plan for higher connection limits. Implement background job queue (BullMQ) for non-critical n8n triggers. Consider edge functions for geographically distributed users. Implement rate limiting on n8n webhooks. |
| **100K+ users** | Evaluate dedicated Postgres instance vs Supabase. Consider microservices architecture for high-load workflows. Implement CQRS pattern (separate read/write databases). Horizontal scaling of n8n workers. |

### Scaling Priorities

1. **First bottleneck: Supabase Realtime connections**
   - **Symptom:** Users report delayed updates, connection errors
   - **Fix:** Limit subscriptions to active pages only, unsubscribe on unmount, use connection pooling, upgrade Supabase plan

2. **Second bottleneck: n8n workflow execution queue**
   - **Symptom:** Long wait times for proposal generation, screening
   - **Fix:** Scale n8n horizontally (multiple workers), optimize workflows (reduce nodes), implement priority queue

3. **Third bottleneck: Database query performance**
   - **Symptom:** Slow page loads, timeouts on large data sets
   - **Fix:** Add indexes (especially on RLS policy columns), implement pagination, use materialized views for complex queries, cache frequently accessed data

## Anti-Patterns

### Anti-Pattern 1: Using RLS for Everything + Client-Only Mutations

**What people do:** Route all mutations through client-side Supabase calls, relying entirely on RLS for authorization and validation.

**Why it's wrong:**
- Complex business logic in RLS policies destroys performance (n+1 query problem)
- Validation logic is harder to test in SQL than TypeScript
- Can't trigger n8n workflows or external APIs from RLS
- RLS error messages are cryptic for users

**Do this instead:**
- Use RLS for SELECT operations (authorization)
- Route INSERT/UPDATE/DELETE through Server Actions (business logic, validation, n8n triggers)
- Server Actions can use service_role key when complex logic needs to bypass RLS temporarily

### Anti-Pattern 2: Dumping Everything in page.tsx

**What people do:** Put all logic—data fetching, mutations, components, forms—in a single `page.tsx` file.

**Why it's wrong:**
- Impossible to maintain as app grows
- Can't reuse components across pages
- Server/client boundaries get confused
- Hard to test individual pieces

**Do this instead:**
- `page.tsx` should only fetch data and compose components
- Extract forms, cards, tables to `_components/` folder
- Move mutations to `lib/actions/`
- Keep components small and focused

### Anti-Pattern 3: Bypassing Supabase SSR Package

**What people do:** Use deprecated auth-helpers or create a single Supabase client for both server and client.

**Why it's wrong:**
- Auth sessions expire unexpectedly
- Server-side rendering breaks
- Security vulnerabilities (service_role key exposed to client)
- Middleware doesn't refresh tokens

**Do this instead:**
- Use `@supabase/ssr` package (not auth-helpers)
- Create separate clients: `lib/supabase/client.ts` for browser, `lib/supabase/server.ts` for server
- Use middleware to refresh sessions: `middleware.ts`

### Anti-Pattern 4: Testing RLS Policies in SQL Editor

**What people do:** Write RLS policies, test them in Supabase SQL Editor, assume they work in the app.

**Why it's wrong:**
- SQL Editor runs as `postgres` role, which bypasses RLS entirely
- Policies may look correct but fail in real client requests
- False confidence in security

**Do this instead:**
- Test RLS policies using client SDK (from Next.js or Postman)
- Create test users with different roles
- Write integration tests that actually make authenticated requests

### Anti-Pattern 5: Forgetting to Index RLS Policy Columns

**What people do:** Write RLS policies using `user_id` or `tenant_id` without adding indexes.

**Why it's wrong:**
- Every query becomes a table scan
- Performance degrades linearly with data size
- App feels slow even with small datasets

**Do this instead:**
- **Always** add indexes on columns used in RLS policies
- Run `CREATE INDEX idx_{table}_{column} ON {table}({column});`
- Use Supabase Performance Advisors to catch missing indexes

### Anti-Pattern 6: Synchronous n8n Workflows

**What people do:** Trigger n8n webhook and wait for response in Server Action before returning to user.

**Why it's wrong:**
- Long-running workflows timeout Next.js Server Actions (default 60s)
- User sees loading spinner for minutes
- Workflow failure blocks UI

**Do this instead:**
- Trigger n8n asynchronously, return immediately to user
- Update UI via Realtime subscription when n8n completes
- Store workflow execution status in `workflow_executions` table
- Show "in progress" state in UI with estimated time

### Anti-Pattern 7: No Webhook Signature Verification

**What people do:** Accept n8n webhook callbacks without verifying they came from n8n.

**Why it's wrong:**
- Anyone can POST to `/api/webhooks/` endpoints
- Malicious actor could inject fake data
- No way to ensure data integrity

**Do this instead:**
- Implement webhook signature verification
- Use shared secret between n8n and Next.js
- Validate signature in every webhook route handler
- Reject unauthenticated webhook calls

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **n8n Automation Engine** | HTTP webhooks (bidirectional) | Next.js → n8n: POST to workflow webhook URL. n8n → Next.js: POST to `/api/webhooks/{name}`. Always verify signatures. |
| **Supabase Auth** | Built-in Next.js middleware | Use `@supabase/ssr` package. Refresh tokens on each request. Never use service_role key in client code. |
| **Supabase Database** | Server/Client separation | Server Components/Actions use server client. Client Components use browser client for realtime only. |
| **Supabase Storage** | Direct browser upload | Upload files directly from client to reduce server load. Write metadata to database via Server Action. |
| **Supabase Realtime** | Postgres WAL streaming | Subscribe in Client Components only. Always unsubscribe on unmount to prevent memory leaks. |
| **OpenAI / Anthropic APIs** | Via n8n workflows | Never call AI APIs directly from Next.js. Route through n8n for rate limiting, retries, cost tracking. |
| **Grant databases (Grants.gov, etc.)** | Via n8n workflows | Scheduled n8n workflows fetch grants. Write results to Supabase. UI updates via Realtime. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Next.js ↔ Supabase** | Direct database queries | Server Components: direct queries. Server Actions: mutations + revalidation. Client: realtime subscriptions only. |
| **Next.js ↔ n8n** | HTTP webhooks | Next.js triggers n8n. n8n calls back when done. Always include callbackUrl in trigger payload. |
| **n8n ↔ Supabase** | Direct database writes | n8n has Supabase node with connection. Writes results directly to database. Triggers Realtime broadcasts. |
| **Client Components ↔ Server Actions** | Form submissions | Use `useActionState` for form handling. Progressive enhancement works without JavaScript. |
| **Route Groups** | Shared layouts | `(auth)` and `(dashboard)` groups share nothing. Dashboard layout checks auth in middleware. |

## Build Order Recommendations

Based on component dependencies, build in this order:

### Phase 1: Foundation (Week 1)
1. **Supabase setup:** Database schema, RLS policies, auth configuration
2. **Next.js structure:** Create folder structure, Supabase clients (server/client/middleware)
3. **Authentication:** Login, signup, middleware, protected routes
4. **Base components:** shadcn/ui installation, primitives layer

### Phase 2: Grant Discovery & Management (Week 2)
5. **Grants CRUD:** Create, read, update, delete grants (Server Actions + UI)
6. **Grant list/detail pages:** Server Components with Realtime subscriptions
7. **n8n integration foundation:** Webhook signature verification, error handling
8. **First n8n workflow:** Grant Fetcher (scheduled) → writes to Supabase → UI updates

### Phase 3: Document & Narrative System (Week 3)
9. **Document upload:** Supabase Storage integration, metadata tracking
10. **Document vault:** List, view, delete documents
11. **n8n Document Vault workflow:** Trigger on upload → process → write back status
12. **Narrative library:** CRUD operations, versioning

### Phase 4: Screening & Proposal Generation (Week 4)
13. **Screening workflow:** Server Action triggers n8n → webhook callback → Realtime update
14. **Proposal generator workflow:** Same pattern, different n8n workflow
15. **Proposal review UI:** Display generated proposals, version history
16. **AI Critic workflow:** Optional review step

### Phase 5: Submission & Tracking (Week 5)
17. **Submission checklist:** Generate and display checklist
18. **Submission tracking:** Manual submission recording + auto-submission workflow
19. **Post-submission tracker:** Polling workflow updates submission status

### Phase 6: Awards & Reporting (Week 6)
20. **Award notification handler:** Webhook from n8n when award detected
21. **Award management:** Display awards, requirements, payment schedule
22. **Report drafting:** n8n workflow generates draft, user edits, submits

### Dependencies

```
Foundation → All other phases
Grants CRUD → Screening, Proposals
Document system → Narrative library → Proposal generation
Screening → Proposal generation
Proposals → Submissions
Submissions → Awards
Awards → Reports
```

## Sources

**Next.js + Supabase Architecture:**
- [Use Supabase with Next.js | Supabase Docs](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Build a User Management App with Next.js | Supabase Docs](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
- [Supabase + Next.js Guide… The Real Way | Medium](https://medium.com/@iamqitmeeer/supabase-next-js-guide-the-real-way-01a7f2bd140c)
- [Next.js Architecture in 2026 — Server-First, Client-Islands](https://www.yogijs.tech/blog/nextjs-project-architecture-app-router)
- [Building for Scale: Why Next.js and Supabase are the Gold Standard](https://theyellowflashlight.com/building-for-scale-why-next-js-and-supabase-are-the-gold-standard-for-modern-saas/)

**Supabase RLS & Security:**
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Row Level Security (RLS): Complete Guide (2026) | DesignRevision](https://designrevision.com/blog/supabase-row-level-security)
- [RLS Performance and Best Practices | Supabase Docs](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Fixing Row-Level Security Misconfigurations | ProsperaSoft](https://prosperasoft.com/blog/database/supabase/supabase-rls-issues/)

**Supabase Realtime:**
- [Using Realtime with Next.js | Supabase Docs](https://supabase.com/docs/guides/realtime/realtime-with-nextjs)
- [Building a Real-time Notification System | Makerkit](https://makerkit.dev/blog/tutorials/real-time-notifications-supabase-nextjs)

**n8n Integration:**
- [Webhook node documentation | n8n Docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [Respond to Webhook | n8n Docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/)
- [5 n8n Workflow Mistakes That Quietly Break Automation | Medium](https://medium.com/@connect.hashblock/5-n8n-workflow-mistakes-that-quietly-break-automation-f1a4cfdac8bc)
- [Seven N8N Workflow Best Practices for 2026](https://michaelitoback.com/n8n-workflow-best-practices/)

**Next.js Server Actions & Forms:**
- [Next.js: The Complete Guide for 2026 | DevToolbox Blog](https://devtoolbox.dedyn.io/blog/nextjs-complete-guide)
- [Getting Started: Updating Data | Next.js](https://nextjs.org/docs/app/getting-started/updating-data)
- [Next.js Server Actions: The Complete Guide (2026)](https://makerkit.dev/blog/tutorials/nextjs-server-actions)

**shadcn/ui Component Architecture:**
- [Shadcn UI Best Practices for 2026 | Medium](https://medium.com/write-a-catalyst/shadcn-ui-best-practices-for-2026-444efd204f44)
- [shadcn at Scale: Architecture Patterns for Large Applications | ShadcnStore](https://www.shadcnstore.com/blog/marketing/shadcn-at-scale-architecture-patterns-for-large-applications)

**Anti-Patterns & Common Mistakes:**
- [Next.js + Supabase app in production: what would I do differently](https://catjam.fi/articles/next-supabase-what-do-differently)
- [Supabase Next.js Guide: Build Scalable Full-Stack Apps](https://anotherwrapper.com/blog/supabase-next-js)

---
*Architecture research for: Grant Management Web Application (Next.js + Supabase + n8n)*
*Researched: 2026-02-13*
*Confidence: HIGH - Based on official documentation, verified 2026 best practices, and multiple authoritative sources*
