# Architecture

**Analysis Date:** 2026-02-13

## Pattern Overview

**Overall:** Server-Side Rendering (SSR) with App Router - Next.js 16 full-stack framework

**Key Characteristics:**
- Next.js App Router architecture (file-based routing in `/app`)
- React Server Components (RSC) as default rendering strategy
- TypeScript strict mode with type safety
- Tailwind CSS for styling with PostCSS processing
- Minimal initial setup - boilerplate from create-next-app

## Layers

**Presentation Layer:**
- Purpose: UI rendering and user interaction
- Location: `app/`
- Contains: Server and Client React components, layout definitions, page routes
- Depends on: React, Next.js framework APIs
- Used by: Browser clients

**Styling Layer:**
- Purpose: Visual presentation and responsive design
- Location: `app/globals.css`
- Contains: Tailwind CSS imports and CSS custom properties for theme variables
- Depends on: Tailwind CSS v4, PostCSS
- Used by: All UI components via className attributes

**Configuration Layer:**
- Purpose: Compilation, bundling, and tooling setup
- Location: `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`
- Contains: Next.js config, TypeScript compiler options, PostCSS plugins, ESLint rules
- Depends on: Next.js, TypeScript, PostCSS, ESLint
- Used by: Build system and development environment

## Data Flow

**Page Rendering Flow (Home Page):**

1. Browser requests `/`
2. Next.js App Router matches to `app/page.tsx`
3. `RootLayout` from `app/layout.tsx` wraps page content
4. Layout applies global styles, fonts (Geist Sans/Mono), and metadata
5. `Home` component renders static HTML with Tailwind-styled JSX
6. Static assets (SVG images) loaded from `public/`
7. HTML sent to browser with styling applied

**Component Composition:**
- `app/layout.tsx` provides root layout wrapper with metadata and font configuration
- `app/page.tsx` is the home page entry point with static content
- No state management layer currently present (boilerplate stage)

**Asset Flow:**
- Static assets in `public/` directory served via Next.js static asset handling
- SVG images optimized and embedded via `next/image` component

## Key Abstractions

**Root Layout:**
- Purpose: Provides consistent wrapper for all pages with metadata, fonts, and global styles
- Examples: `app/layout.tsx`
- Pattern: Next.js Layout component with `children` prop for page content injection

**Page Component:**
- Purpose: Route-specific UI rendered at path
- Examples: `app/page.tsx`
- Pattern: Default export React component matching file path in `/app` directory

**CSS Theme Variables:**
- Purpose: Centralized color and font system for consistent theming
- Examples: `--background`, `--foreground`, `--font-geist-sans`, `--font-geist-mono` in `app/globals.css`
- Pattern: CSS custom properties with media query for dark mode support

## Entry Points

**Home Page:**
- Location: `app/page.tsx`
- Triggers: HTTP GET `/`
- Responsibilities: Renders welcome page with Next.js boilerplate content, navigation links to templates and documentation

**Root Layout:**
- Location: `app/layout.tsx`
- Triggers: Wraps all pages
- Responsibilities: Sets page metadata, loads Google Fonts (Geist), applies global CSS, structures HTML document with body and children

## Error Handling

**Strategy:** Default Next.js error handling

**Patterns:**
- No custom error boundaries currently implemented
- Next.js handles server errors with default error page
- Client-side errors fall back to browser default behavior

## Cross-Cutting Concerns

**Logging:** Not implemented - boilerplate stage

**Validation:** Not implemented - boilerplate stage

**Authentication:** Not implemented - boilerplate stage

**Styling System:**
- Tailwind CSS utility classes applied directly to JSX elements
- CSS custom properties for theme tokens
- Dark mode support via `@media (prefers-color-scheme: dark)`

---

*Architecture analysis: 2026-02-13*
