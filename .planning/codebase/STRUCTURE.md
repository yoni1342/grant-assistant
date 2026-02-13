# Codebase Structure

**Analysis Date:** 2026-02-13

## Directory Layout

```
/home/ambo/grant-assistant/
├── app/                      # Next.js App Router pages and layouts
├── public/                   # Static assets served as-is
├── .claude/                  # Claude internal configuration (excluded from codebase)
├── .planning/                # Planning and documentation (excluded from codebase)
├── node_modules/             # Dependencies (generated)
├── .next/                    # Build output (generated)
├── package.json              # Node.js project metadata and dependencies
├── package-lock.json         # Locked dependency versions
├── tsconfig.json             # TypeScript compiler configuration
├── next.config.ts            # Next.js build and runtime configuration
├── postcss.config.mjs         # PostCSS plugin configuration
├── eslint.config.mjs         # ESLint linting rules
├── next-env.d.ts             # TypeScript definitions for Next.js (generated)
└── README.md                 # Project documentation
```

## Directory Purposes

**app/:**
- Purpose: Contains all routable pages and shared layouts
- Contains: React Server Components, page components, global styles
- Key files: `layout.tsx` (root layout), `page.tsx` (home route), `globals.css` (global styling)

**public/:**
- Purpose: Serves static assets directly without processing
- Contains: SVG icons and image files
- Key files: `next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`

**node_modules/:**
- Purpose: Installed npm dependencies
- Generated: Yes (delete and run `npm install` to regenerate)
- Committed: No (.gitignore)

**.next/:**
- Purpose: Next.js build output and compiled artifacts
- Generated: Yes (created by `npm run build`)
- Committed: No (.gitignore)

## Key File Locations

**Entry Points:**
- `app/page.tsx`: Home route handler - renders welcome page at `/`
- `app/layout.tsx`: Root layout wrapper - applies to all pages

**Configuration:**
- `tsconfig.json`: TypeScript compiler settings with `@/*` path alias
- `next.config.ts`: Next.js build and runtime configuration
- `package.json`: Project metadata, scripts, and dependencies
- `eslint.config.mjs`: ESLint configuration with Next.js presets
- `postcss.config.mjs`: PostCSS plugins (Tailwind CSS v4)

**Core Logic:**
- `app/layout.tsx`: Root layout component - metadata, fonts, global styles wrapper
- `app/page.tsx`: Home page component - static content and UI

**Styling:**
- `app/globals.css`: Global CSS with Tailwind imports and CSS custom properties

## Naming Conventions

**Files:**
- Page routes: `page.tsx` (required by Next.js App Router)
- Layout files: `layout.tsx` (required by Next.js App Router)
- Configuration: `*.config.ts` or `*.config.mjs` (standard convention)
- Styles: `*.css` or `globals.css` (global stylesheet at app level)

**Directories:**
- App routes: lowercase with hyphens if multi-word (e.g., `dashboard`, `user-settings`)
- Feature grouping: not yet implemented (boilerplate stage)

**Components:**
- Exported as named or default exports from `.tsx` files
- No suffix convention (e.g., `Layout`, `Home`, `Button`) yet established

**TypeScript:**
- Strict mode enabled
- All React components typed with `React.ReactNode`, `Readonly<>` for immutability
- Metadata uses `Metadata` type from `next`

## Where to Add New Code

**New Feature:**
- Primary code: Create new directory in `app/` (e.g., `app/dashboard/`) with `page.tsx`
- Tests: Not yet configured - add test files alongside source (`.test.tsx` pattern)
- Styles: Use Tailwind utility classes in JSX or create feature-scoped CSS modules in feature directory

**New Component/Module:**
- Implementation: Create as `.tsx` file in appropriate feature directory or `app/components/` (if components directory created)
- If reusable across routes: Place in `app/components/` (not yet created)
- If route-specific: Place directly in feature route directory with layout and page

**Utilities:**
- Shared helpers: Create `app/lib/` directory for utility functions
- Constants: Place in `app/lib/constants.ts` or collocate with feature
- Type definitions: Create `app/types/` directory for shared types

**Static Assets:**
- Images/SVGs: Place in `public/` directory, reference via `/filename` path

## Special Directories

**.next/:**
- Purpose: Next.js build artifacts and compiled code
- Generated: Yes
- Committed: No

**node_modules/:**
- Purpose: npm installed dependencies
- Generated: Yes (via `npm install`)
- Committed: No

**.claude/:**
- Purpose: Claude agent configuration and tooling (external to application)
- Generated: No
- Committed: No (managed separately)

**.planning/:**
- Purpose: GSD planning documents and analysis
- Generated: Yes (via GSD commands)
- Committed: Yes

## Import Path Aliases

**Base Alias:**
- `@/*` maps to root project directory
- Usage: `import { Component } from '@/app/component'`
- Configured in: `tsconfig.json`

---

*Structure analysis: 2026-02-13*
