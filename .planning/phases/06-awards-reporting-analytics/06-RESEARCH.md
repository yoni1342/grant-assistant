# Phase 6: Awards, Reporting & Analytics - Research

**Researched:** 2026-02-16
**Domain:** Award management, grant reporting automation, analytics dashboards
**Confidence:** HIGH

## Summary

Phase 6 introduces three interconnected capabilities: award tracking with reporting requirements, AI-powered report generation, and analytics dashboards for pipeline insights. The research reveals that this phase should leverage the existing stack (Recharts + shadcn/ui for charts, shadcn Calendar for deadline tracking, Tiptap for report editing, n8n for AI report generation) while introducing new patterns for analytics calculations and award lifecycle management.

**Key findings:**
- shadcn/ui provides battle-tested chart components built on Recharts (53+ pre-built components)
- Supabase aggregate functions enable server-side metrics calculation (count, sum, avg with GROUP BY)
- shadcn Calendar + date-fns combination handles reporting deadline tracking
- Existing n8n + Tiptap patterns extend naturally to report generation/editing workflows
- Award tracking follows established CRUD patterns with reporting calendar as differentiator

**Primary recommendation:** Build awards and analytics using established patterns from Phases 3-5 (TanStack Table, server actions, Realtime subscriptions, n8n workflows). Introduce shadcn charts for visualization and shadcn Calendar for reporting deadlines. Prioritize server-side aggregate queries over client-side calculations for performance.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 2.14+ | Chart rendering | Industry standard React charting library, 25k+ GitHub stars, built on D3 |
| @tanstack/react-table | 8.21+ | Data tables (already in use) | Headless UI for awards table, analytics metrics table |
| react-day-picker | 9.x | Calendar primitives | Powers shadcn Calendar, 6k+ GitHub stars, accessible |
| date-fns | 4.1+ (already in use) | Date calculations | Functional, tree-shakeable, 200+ date utilities for metrics |
| @tiptap/react | 3.19+ (already in use) | Rich text editor | Report editing, 3M+ editors deployed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui chart | Latest | Pre-styled chart components | Bar/line/area charts for analytics dashboard |
| shadcn/ui calendar | Latest | Date picker with calendar | Reporting deadline selection, award period dates |
| zod | 4.3+ (already in use) | Schema validation | Award form validation, report metadata |
| sonner | 2.0+ (already in use) | Toast notifications | Award creation, report generation status |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Victory | Victory more focused on React Native, less Next.js ecosystem fit |
| Recharts | Chart.js | Chart.js uses Canvas (better perf 5k+ points), but Recharts better DX for <100 points |
| date-fns | Day.js | Day.js smaller bundle, but date-fns already in use (Phase 5) |
| react-day-picker | react-calendar | react-day-picker better accessibility, shadcn integration |

**Installation:**
```bash
# New dependencies
npx shadcn@latest add chart calendar

# Already installed
# @tanstack/react-table, date-fns, @tiptap/react, zod, sonner, @supabase/supabase-js
```

## Architecture Patterns

### Recommended Project Structure
```
app/(dashboard)/
├── awards/                   # Award management
│   ├── page.tsx             # Awards list (TanStack Table)
│   ├── new/                 # Create award form
│   └── [id]/                # Award detail + reporting calendar
│       ├── page.tsx
│       └── components/
│           ├── award-detail-client.tsx
│           ├── reporting-calendar.tsx
│           └── report-generator.tsx
├── analytics/               # Analytics dashboard
│   ├── page.tsx             # Main dashboard (server component)
│   └── components/
│       ├── analytics-charts.tsx   # Recharts visualizations
│       ├── metrics-cards.tsx      # KPI cards
│       └── pipeline-breakdown.tsx
lib/
├── actions/
│   ├── awards.ts            # Award CRUD server actions
│   └── analytics.ts         # Metrics calculation actions
└── utils/
    ├── analytics.ts         # Win rate, time-to-submission calculations
    └── calendar.ts          # Reporting deadline helpers
```

### Pattern 1: Server-Side Analytics with Supabase Aggregates
**What:** Calculate metrics (win rate, pipeline value) in PostgreSQL using aggregate functions, not client-side
**When to use:** Always for analytics queries - server-side aggregation scales better and prevents data exposure
**Example:**
```typescript
// lib/actions/analytics.ts
'use server'
import { createClient } from '@/lib/supabase/server'

export async function getAnalytics() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Win rate: awards / submissions
  const { count: submissions } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', user!.id)

  const { count: awards } = await supabase
    .from('awards')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', user!.id)

  const winRate = submissions > 0 ? (awards / submissions) * 100 : 0

  // Pipeline value: sum of pending grant amounts
  const { data: grants } = await supabase
    .from('grants')
    .select('amount')
    .eq('org_id', user!.id)
    .in('stage', ['discovery', 'screening', 'drafting', 'submission'])

  const pipelineValue = grants?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0

  // Avg time discovery -> submission (use date-fns)
  const { data: submittedGrants } = await supabase
    .from('grants')
    .select('created_at, submissions(submitted_at)')
    .eq('org_id', user!.id)
    .not('submissions', 'is', null)

  // Calculate in-memory (already filtered dataset)
  const times = submittedGrants
    ?.filter(g => g.submissions?.[0]?.submitted_at)
    .map(g => {
      const created = new Date(g.created_at)
      const submitted = new Date(g.submissions[0].submitted_at)
      return differenceInDays(submitted, created)
    }) || []

  const avgTimeToSubmission = times.length > 0
    ? times.reduce((a, b) => a + b, 0) / times.length
    : 0

  return { winRate, pipelineValue, avgTimeToSubmission, submissions, awards }
}
```

### Pattern 2: shadcn Chart with Recharts
**What:** Use shadcn chart components for consistent, accessible visualizations
**When to use:** For all dashboard charts (bar, line, area) with <100 data points
**Example:**
```typescript
// Source: https://ui.shadcn.com/docs/components/radix/chart
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const chartData = [
  { funderType: "Federal", successRate: 45 },
  { funderType: "Foundation", successRate: 62 },
  { funderType: "Corporate", successRate: 38 },
]

const chartConfig = {
  successRate: {
    label: "Success Rate",
    color: "hsl(var(--chart-1))",
  },
}

export function SuccessRateChart() {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px]">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="funderType"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="successRate" fill="var(--color-successRate)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
```

### Pattern 3: Reporting Calendar with shadcn Calendar + date-fns
**What:** Display reporting deadlines in calendar view with color-coded urgency
**When to use:** Award detail page to show interim/final report due dates
**Example:**
```typescript
// Source: https://ui.shadcn.com/docs/components/radix/calendar
import { Calendar } from "@/components/ui/calendar"
import { isWithinInterval, parseISO } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface ReportingCalendarProps {
  reportingDates: Array<{
    date: string
    type: 'interim' | 'final'
    title: string
  }>
}

export function ReportingCalendar({ reportingDates }: ReportingCalendarProps) {
  const [selected, setSelected] = useState<Date>()

  // Mark reporting dates
  const reportDates = reportingDates.map(r => parseISO(r.date))

  return (
    <div className="space-y-4">
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        modifiers={{
          reportDue: reportDates,
        }}
        modifiersStyles={{
          reportDue: {
            backgroundColor: 'hsl(var(--destructive))',
            color: 'white',
            fontWeight: 'bold',
          }
        }}
      />

      {/* Report list */}
      <div className="space-y-2">
        {reportingDates.map((report, i) => (
          <div key={i} className="flex items-center justify-between p-2 border rounded">
            <span className="text-sm">{report.title}</span>
            <Badge variant={report.type === 'final' ? 'destructive' : 'secondary'}>
              {report.type}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Pattern 4: AI Report Generation with n8n + Tiptap Editing
**What:** Trigger n8n workflow to generate report, store in DB, allow Tiptap editing before submission
**When to use:** Award detail page "Generate Report" button
**Example:**
```typescript
// Server action
'use server'
export async function triggerReportGeneration(awardId: string) {
  const supabase = await createClient()

  // Create workflow execution record
  const { data: execution } = await supabase
    .from('workflow_executions')
    .insert({
      workflow_type: 'report_generation',
      status: 'pending',
      metadata: { award_id: awardId },
    })
    .select()
    .single()

  // Fire-and-forget webhook to n8n
  fetch(process.env.N8N_WEBHOOK_URL + '/draft-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      executionId: execution.id,
      awardId,
      // n8n fetches award details, generates report via AI, updates DB
    }),
  }).catch(console.error) // Don't await

  return { executionId: execution.id }
}

// Client component - Tiptap editor for editing AI-generated report
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export function ReportEditor({ initialContent }: { initialContent: string }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[400px] p-4',
      },
    },
  })

  const handleSave = async () => {
    const html = editor?.getHTML()
    await saveReport(awardId, html)
    toast.success('Report saved')
  }

  return (
    <div className="border rounded-lg">
      <EditorContent editor={editor} />
      <Button onClick={handleSave}>Save Draft</Button>
    </div>
  )
}
```

### Pattern 5: Award CRUD with TanStack Table (Follows Phase 5 Patterns)
**What:** Awards list page with table, filters, search - same pattern as budgets/submissions
**When to use:** Awards index page
**Example:**
```typescript
// app/(dashboard)/awards/components/award-table.tsx
import { ColumnDef, useReactTable } from "@tanstack/react-table"

export interface Award {
  id: string
  grant_id: string
  amount: number
  period_start: string
  period_end: string
  reporting_requirements: string
  created_at: string
  grant: { title: string }
}

const columns: ColumnDef<Award>[] = [
  {
    accessorKey: "grant.title",
    header: "Grant",
    cell: ({ row }) => (
      <Link href={`/awards/${row.original.id}`}>
        {row.original.grant.title}
      </Link>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => `$${row.getValue<number>("amount").toLocaleString()}`,
  },
  {
    accessorKey: "period_start",
    header: "Period",
    cell: ({ row }) => {
      const start = format(parseISO(row.original.period_start), 'MMM d, yyyy')
      const end = format(parseISO(row.original.period_end), 'MMM d, yyyy')
      return `${start} - ${end}`
    },
  },
]

export function AwardTable({ initialData }: { initialData: Award[] }) {
  const table = useReactTable({
    data: initialData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // Same table rendering as budgets/submissions
  return <Table>...</Table>
}
```

### Anti-Patterns to Avoid
- **Client-side metric aggregation:** Don't fetch all grants and calculate win rate in browser - use Supabase aggregate queries
- **Recharts with 1k+ data points:** SVG rendering creates 1k+ DOM nodes, freezes browser - aggregate/bin data first
- **Inline calendar styling:** Don't customize calendar with inline styles - use modifiers and modifiersStyles
- **Blocking on n8n webhooks:** Don't await n8n webhook responses - fire-and-forget, poll workflow_executions table
- **Missing calendar accessibility:** Always use accessibilityLayer prop on Recharts charts for keyboard/screen reader support

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart rendering | Custom SVG/Canvas charting | shadcn/ui charts (Recharts) | Recharts handles responsive containers, tooltips, legends, accessibility, theming - 53+ pre-built shadcn components |
| Date picking | Custom calendar UI | shadcn Calendar (react-day-picker) | Handles keyboard nav, timezone, RTL, screen readers, month/year dropdowns - 6k stars |
| Date math | Manual date calculations | date-fns | 200+ battle-tested functions (differenceInDays, formatDistanceToNow, etc.) - already in use |
| Report templates | String concatenation | AI generation via n8n + LLM | LLM generates context-aware reports from structured data, handles formatting, tone |
| Analytics caching | Client-side state management | Supabase query, React Server Components | RSC fetches fresh data on page load, no stale client cache issues |
| Calendar recurring events | Custom recurrence logic | Store reporting_requirements as JSON array | Reporting dates are finite (interim + final), not complex recurrence patterns |

**Key insight:** Charts and calendars have deceptively complex edge cases (timezones, accessibility, responsive sizing, data formatting). shadcn/ui + underlying libraries (Recharts, react-day-picker, date-fns) provide production-ready solutions. Don't rebuild - leverage existing patterns from Phases 3-5.

## Common Pitfalls

### Pitfall 1: Recharts Performance Degradation with Large Datasets
**What goes wrong:** Rendering 500+ data points in a BarChart creates 500+ SVG DOM elements, causing browser freeze
**Why it happens:** Recharts uses SVG rendering, which becomes slow with high-cardinality data (e.g., daily metrics for 1 year = 365 points)
**How to avoid:**
- Aggregate data before charting (e.g., weekly averages instead of daily)
- Use ResponsiveContainer with explicit min-height
- For >1k points, switch to Chart.js (Canvas rendering) or bin data
**Warning signs:**
- Chart takes >1s to render
- Browser DevTools shows thousands of SVG nodes
- User reports "page freezing" on analytics dashboard

### Pitfall 2: Client-Side Analytics Calculations Exposing Data
**What goes wrong:** Fetching all grants to client and calculating win rate exposes other users' data if RLS misconfigured
**Why it happens:** Client-side aggregation requires fetching full dataset, RLS only filters what's accessible but can leak counts
**How to avoid:**
- Always calculate metrics server-side (server actions or Supabase functions)
- Use Supabase aggregate queries with RLS applied
- Never trust client-calculated metrics for security-sensitive data
**Warning signs:**
- Server action fetches data, sends to client for calculation
- Analytics queries without `.eq('org_id', user.id)` filters
- Console shows full dataset being logged

### Pitfall 3: Timezone Mismatches in Reporting Deadlines
**What goes wrong:** Reporting deadline shows "Feb 15" in calendar but award requires submission by "Feb 15 11:59 PM EST", user is in PST
**Why it happens:** Date storage in DB as string without timezone, client interprets in local timezone
**How to avoid:**
- Store reporting deadlines as timestamptz in PostgreSQL
- Use date-fns with explicit timezone handling
- Display timezone in UI ("Due: Feb 15, 2026 11:59 PM EST")
**Warning signs:**
- Date shows different day in different timezones
- Users report "deadline already passed" but calendar shows today
- Date calculations off by one day

### Pitfall 4: n8n Report Generation Webhook Timeout
**What goes wrong:** User clicks "Generate Report", waits 30 seconds, gets timeout error, but report is actually generating
**Why it happens:** Blocking on n8n webhook response, AI generation takes 20-30 seconds
**How to avoid:**
- Fire-and-forget pattern (existing from Phase 4)
- Create workflow_executions record, return immediately
- Use Realtime subscription to update UI when report ready
- Show WorkflowProgress component (existing from Phase 4)
**Warning signs:**
- Server action has `await fetch(n8n_url)`
- User sees loading spinner for >10 seconds
- Duplicate report generation attempts

### Pitfall 5: Missing Report Editing State Management
**What goes wrong:** User edits AI-generated report, clicks away, loses all changes
**Why it happens:** Tiptap editor state not synced to DB, no auto-save
**How to avoid:**
- Implement auto-save with useDebouncedCallback (from use-debounce, already installed)
- Store draft in `reports` table with status='draft'
- Show "Saving..." indicator
- Warn user on navigation if unsaved changes
**Warning signs:**
- No save button visible
- Editor content lost on page reload
- No unsaved changes warning

### Pitfall 6: Chart Color Accessibility Issues
**What goes wrong:** Win rate chart uses red/green for bad/good, colorblind users can't distinguish
**Why it happens:** Relying solely on color to convey meaning
**How to avoid:**
- Use shadcn chart color variables (built-in accessible palette)
- Add patterns/textures for colorblind users
- Include text labels for key data points
- Test with colorblind simulators
**Warning signs:**
- Custom color hex codes instead of CSS variables
- Charts fail WCAG 2.1 contrast requirements
- No text labels on critical metrics

## Code Examples

Verified patterns from official sources:

### Analytics Dashboard with Server-Side Metrics
```typescript
// app/(dashboard)/analytics/page.tsx
// Pattern: Server Component fetches analytics, client renders charts
import { createClient } from '@/lib/supabase/server'
import { AnalyticsCharts } from './components/analytics-charts'
import { MetricsCards } from './components/metrics-cards'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Server-side aggregations
  const [
    { count: submissions },
    { count: awards },
    { data: grants },
    { data: awardsByFunder },
  ] = await Promise.all([
    supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('org_id', user!.id),
    supabase.from('awards').select('*', { count: 'exact', head: true }).eq('org_id', user!.id),
    supabase.from('grants').select('amount, stage').eq('org_id', user!.id),
    supabase.from('awards')
      .select('amount, grants(funder_type)')
      .eq('org_id', user!.id),
  ])

  const winRate = submissions > 0 ? Math.round((awards / submissions) * 100) : 0
  const pipelineValue = grants
    ?.filter(g => ['discovery', 'screening', 'drafting'].includes(g.stage))
    .reduce((sum, g) => sum + (g.amount || 0), 0) || 0

  // Group by funder type for chart
  const funderStats = awardsByFunder?.reduce((acc, a) => {
    const type = a.grants?.funder_type || 'Other'
    if (!acc[type]) acc[type] = { count: 0, total: 0 }
    acc[type].count++
    acc[type].total += a.amount
    return acc
  }, {} as Record<string, { count: number, total: number }>)

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      <MetricsCards
        winRate={winRate}
        pipelineValue={pipelineValue}
        submissions={submissions}
        awards={awards}
      />

      <AnalyticsCharts funderStats={funderStats} />
    </div>
  )
}
```

### Reporting Calendar with Deadline Highlighting
```typescript
// Source: https://ui.shadcn.com/docs/components/radix/calendar
import { Calendar } from "@/components/ui/calendar"
import { parseISO, isSameDay } from "date-fns"

interface ReportDeadline {
  date: string
  type: 'interim' | 'final'
  title: string
  completed: boolean
}

export function ReportingCalendar({ deadlines }: { deadlines: ReportDeadline[] }) {
  const [selected, setSelected] = useState<Date>()

  const deadlineDates = deadlines.map(d => parseISO(d.date))
  const overdueDates = deadlines
    .filter(d => !d.completed && new Date(d.date) < new Date())
    .map(d => parseISO(d.date))

  return (
    <div className="space-y-4">
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        modifiers={{
          deadline: deadlineDates,
          overdue: overdueDates,
        }}
        modifiersStyles={{
          deadline: {
            fontWeight: 'bold',
            textDecoration: 'underline',
          },
          overdue: {
            backgroundColor: 'hsl(var(--destructive))',
            color: 'white',
          },
        }}
        className="rounded-lg border"
      />

      {selected && (
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-2">
            {format(selected, 'MMMM d, yyyy')}
          </h4>
          {deadlines
            .filter(d => isSameDay(parseISO(d.date), selected))
            .map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <Badge variant={d.type === 'final' ? 'destructive' : 'secondary'}>
                  {d.type}
                </Badge>
                <span className="text-sm">{d.title}</span>
                {d.completed && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
```

### Win Rate Bar Chart with shadcn
```typescript
// Source: https://ui.shadcn.com/docs/components/radix/chart
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const chartConfig = {
  winRate: {
    label: "Win Rate",
    color: "hsl(var(--chart-1))",
  },
}

export function WinRateByFunder({ data }: {
  data: { funderType: string; winRate: number }[]
}) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[300px]">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="funderType"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 10)} // Truncate long names
        />
        <YAxis
          tickFormatter={(value) => `${value}%`}
        />
        <ChartTooltip
          content={<ChartTooltipContent />}
          formatter={(value) => [`${value}%`, 'Win Rate']}
        />
        <Bar
          dataKey="winRate"
          fill="var(--color-winRate)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}
```

### Award Creation Form with Date Pickers
```typescript
// app/(dashboard)/awards/new/components/award-form.tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"

const awardSchema = z.object({
  grant_id: z.string().uuid(),
  amount: z.number().min(1),
  period_start: z.date(),
  period_end: z.date(),
  reporting_requirements: z.string(),
})

export function AwardForm({ grantId }: { grantId: string }) {
  const form = useForm({
    resolver: zodResolver(awardSchema),
    defaultValues: {
      grant_id: grantId,
      amount: 0,
      period_start: new Date(),
      period_end: addMonths(new Date(), 12),
      reporting_requirements: '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="period_start"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Award Period Start</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className="pl-3 text-left font-normal">
                      {field.value ? format(field.value, "PPP") : "Pick a date"}
                      <CalendarIcon className="ml-auto h-4 w-4" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                  />
                </PopoverContent>
              </Popover>
            </FormItem>
          )}
        />

        {/* Similar for period_end */}

        <FormField
          control={form.control}
          name="reporting_requirements"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reporting Requirements</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="e.g., Interim report due 6 months, final report due 30 days after period end"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit">Create Award</Button>
      </form>
    </Form>
  )
}
```

### Time-to-Submission Metric Calculation
```typescript
// lib/utils/analytics.ts
import { differenceInDays, differenceInHours } from 'date-fns'

export function calculateAvgTimeToSubmission(grants: Array<{
  created_at: string
  submissions?: Array<{ submitted_at: string }>
}>) {
  const times = grants
    .filter(g => g.submissions?.[0]?.submitted_at)
    .map(g => {
      const created = new Date(g.created_at)
      const submitted = new Date(g.submissions![0].submitted_at)
      return differenceInDays(submitted, created)
    })

  if (times.length === 0) return 0

  return Math.round(times.reduce((a, b) => a + b, 0) / times.length)
}

export function calculateSuccessRateByFunder(awards: Array<{
  grants?: { funder_type: string }
}>, submissions: Array<{
  grants?: { funder_type: string }
}>) {
  const funderTypes = new Set([
    ...awards.map(a => a.grants?.funder_type).filter(Boolean),
    ...submissions.map(s => s.grants?.funder_type).filter(Boolean),
  ])

  return Array.from(funderTypes).map(type => {
    const typeAwards = awards.filter(a => a.grants?.funder_type === type).length
    const typeSubmissions = submissions.filter(s => s.grants?.funder_type === type).length

    return {
      funderType: type,
      successRate: typeSubmissions > 0
        ? Math.round((typeAwards / typeSubmissions) * 100)
        : 0,
    }
  })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom SVG charts | shadcn/ui charts (Recharts) | shadcn v2 (2024) | 53+ pre-built components, theming, accessibility |
| Client-side analytics | Server Components + aggregates | Next.js 13+ (2023) | Faster load, better security, no client bundle bloat |
| Moment.js for dates | date-fns | Moment maintenance mode (2020) | Tree-shakeable, immutable, 200+ functions |
| react-calendar | react-day-picker v9 | 2024 | Better accessibility, RSC-compatible, shadcn integration |
| Tiptap v2 | Tiptap v3 | Jan 2024 | React 19 support, improved extensions, better performance |
| Manual n8n polling | Realtime subscriptions | Phases 3-4 | Live updates for workflow status without polling |

**Deprecated/outdated:**
- Moment.js: In maintenance mode since 2020, replaced by date-fns
- react-calendar: Less accessible than react-day-picker, no shadcn components
- Chart.js v2: v4+ has better TypeScript, tree-shaking, but Recharts better for React ecosystems
- Supabase PostgREST aggregate syntax without enabling: Must enable with `pgrst.db_aggregates_enabled = 'true'`

## Open Questions

1. **Should we support CSV export of analytics data?**
   - What we know: TanStack Table has export plugins, common feature request
   - What's unclear: Requirements don't specify, adds complexity
   - Recommendation: Defer to user feedback post-launch, not in Phase 6 MVP

2. **How granular should reporting calendar be (daily vs hourly deadlines)?**
   - What we know: Grant reports typically due by end-of-day, not specific times
   - What's unclear: Some funders require specific times (e.g., 5 PM EST)
   - Recommendation: Store timestamptz (supports time), UI shows date only, add time picker if user requests

3. **Should analytics have date range filters (last 30 days, YTD, all time)?**
   - What we know: Common analytics pattern, Phase 5 uses date-fns
   - What's unclear: Requirements don't specify, adds UI complexity
   - Recommendation: Include in MVP - simple dropdown with 3 options (30d, YTD, All)

4. **Do we need real-time analytics updates via Realtime subscriptions?**
   - What we know: Existing pattern from Phase 3-4, analytics page is less time-critical than workflows
   - What's unclear: Whether stale analytics (fetched on page load) acceptable
   - Recommendation: Start without Realtime, add if users report needing live updates

5. **Should we generate reports for multiple reporting periods at once?**
   - What we know: n8n workflow generates one report per request
   - What's unclear: Whether batch generation needed (e.g., all interim reports)
   - Recommendation: Single report per trigger in MVP, batch feature if requested

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Chart documentation](https://ui.shadcn.com/docs/components/radix/chart) - Chart component installation, features, Recharts integration
- [shadcn/ui Calendar documentation](https://ui.shadcn.com/docs/components/radix/calendar) - Calendar component, react-day-picker integration, modifiers
- [Recharts performance guide](https://recharts.github.io/en-US/guide/performance/) - Performance optimization, memoization, dataKey stability
- [Supabase PostgREST aggregate functions](https://supabase.com/blog/postgrest-aggregate-functions) - count, sum, avg, min, max with GROUP BY
- [Supabase Realtime subscriptions](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) - Database change subscriptions for live updates
- [date-fns documentation](https://date-fns.org/) - 200+ date utility functions, tree-shakeable, immutable
- [TanStack Table v8 docs](https://tanstack.com/table/latest) - Headless table library, sorting, filtering
- [Tiptap documentation](https://tiptap.dev/docs) - Rich text editor, extensions, collaboration features

### Secondary (MEDIUM confidence)
- [n8n Workflow Automation 2026 Guide](https://medium.com/@aksh8t/n8n-workflow-automation-the-2026-guide-to-building-ai-powered-workflows-that-actually-work-cd62f22afcc8) - Webhook support, AI integration
- [Grant reporting best practices 2026](https://www.claconnect.com/en/resources/articles/25/grant-reporting-strategies-for-nonprofits) - Reporting calendar, compliance tracking
- [Analytics dashboard design anti-patterns](https://kevingee.biz/?p=144) - Seven anti-patterns, alternatives, usability considerations
- [Top React chart libraries 2026](https://www.syncfusion.com/blogs/post/top-5-react-chart-libraries) - Recharts vs alternatives, modern requirements
- [Post-award grant management best practices](https://www.instrumentl.com/blog/post-award-grant-management-best-practices) - Award tracking, reporting calendar, compliance
- [Supabase analytics dashboard tools](https://www.draxlr.com/blogs/supabase-analytics-tools/) - Real-time metrics, dashboard features
- [shadcn/ui chart community discussion](https://github.com/shadcn-ui/ui/discussions/4133) - Community recommendations for chart libraries with shadcn

### Tertiary (LOW confidence)
- WebSearch results for "AI report generation grant reporting OpenAI structured output 2026" - AI report generation trends, flagged for validation
- WebSearch results for "draft edit workflow approval process UI patterns 2026" - Approval workflow UI patterns, needs official source verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries officially documented, widely adopted, battle-tested
- Architecture: HIGH - Patterns based on existing Phase 3-5 implementations + official shadcn/Recharts docs
- Pitfalls: MEDIUM-HIGH - Performance issues verified by Recharts docs, timezone/n8n issues from existing codebase patterns

**Research date:** 2026-02-16
**Valid until:** ~30 days (2026-03-18) - Recharts/shadcn stable, date-fns stable, Supabase API stable
