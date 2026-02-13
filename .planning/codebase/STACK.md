# Technology Stack

**Analysis Date:** 2026-02-13

## Languages

**Primary:**
- TypeScript 5.x - Application code, type safety
- JavaScript - Build configuration, ESLint config
- JSX/TSX - React components and pages

**Secondary:**
- CSS - Styling (Tailwind CSS)

## Runtime

**Environment:**
- Node.js 22.20.0+

**Package Manager:**
- npm 10.9.3+
- Lockfile: `package-lock.json` (present, lockfileVersion 3)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with App Router
- React 19.2.3 - UI component library
- React DOM 19.2.3 - DOM rendering

**Styling:**
- Tailwind CSS 4.x - Utility-first CSS framework
- @tailwindcss/postcss 4.x - PostCSS plugin for Tailwind

**Build/Dev:**
- Next.js built-in build system (Webpack)
- PostCSS - CSS transformation pipeline (`postcss.config.mjs`)

## Key Dependencies

**Core Frontend:**
- `next` 16.1.6 - Server-side rendering, routing, API routes
- `react` 19.2.3 - Component library
- `react-dom` 19.2.3 - React DOM bindings

**DevDependencies:**
- `eslint` 9.x - Linting
- `eslint-config-next` 16.1.6 - Next.js ESLint configuration
- `@types/node` 20.x - Node.js type definitions
- `@types/react` 19.x - React type definitions
- `@types/react-dom` 19.x - React DOM type definitions
- `typescript` 5.x - TypeScript compiler

## Configuration

**TypeScript:**
- Config: `tsconfig.json`
- Target: ES2017
- Module: ESNext
- Strict mode: Enabled
- JSX: react-jsx
- Path aliases: `@/*` → `./*` (root-relative imports)
- Incremental compilation: Enabled

**ESLint:**
- Config: `eslint.config.mjs` (new flat config format)
- Extends: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

**PostCSS:**
- Config: `postcss.config.mjs`
- Plugins: `@tailwindcss/postcss`

**Next.js:**
- Config: `next.config.ts`
- No custom configuration applied (uses defaults)

**Environment:**
- No `.env` file present in repository (configuration expected via environment variables)
- Environment configuration follows Next.js conventions (`NEXT_PUBLIC_*` for client-side vars)

## Build & Dev Scripts

```bash
npm run dev      # Start development server (next dev)
npm run build    # Build for production (next build)
npm start        # Start production server (next start)
npm run lint     # Run ESLint
```

## Platform Requirements

**Development:**
- Node.js 22.20.0+
- npm 10.9.3+
- Git
- Code editor with TypeScript support recommended

**Production:**
- Node.js 22.20.0+ (or compatible version)
- Environment: Vercel (recommended per docs) or any Node.js-compatible host
- Port: 3000 (default for Next.js development and standalone mode)

## File Structure

- App code: `/app` - Next.js App Router structure
- Public assets: `/public` - Static files
- Configuration: Root directory - `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`
- Build output: `/.next` - Auto-generated (not committed)

## Dependency Characteristics

**Minimal dependencies:** This is a fresh Next.js project with only essential framework dependencies. No database clients, ORM libraries, or external API SDKs are installed. All external integrations are currently handled via HTTP/Webhook calls at the n8n workflow layer.

**Lock file:** `package-lock.json` (v3) ensures reproducible installs across environments.

---

*Stack analysis: 2026-02-13*
