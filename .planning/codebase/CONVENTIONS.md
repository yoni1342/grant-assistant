# Coding Conventions

**Analysis Date:** 2026-02-13

## Naming Patterns

**Files:**
- TSX/TS files use PascalCase for React components and camelCase for utilities/configs
  - Example: `layout.tsx`, `page.tsx` for app routes (Next.js convention)
  - Config files: `next.config.ts`, `postcss.config.mjs`
- CSS modules not used; global CSS via `globals.css`

**Functions:**
- React components use PascalCase: `RootLayout()`, `Home()`
- Regular exported functions use camelCase
- No function name prefixes or decorators observed

**Variables:**
- camelCase for local variables and constants
  - Example: `geistSans`, `geistMono`, `nextConfig`
- CSS custom properties use kebab-case with `--` prefix
  - Example: `--font-geist-sans`, `--background`, `--foreground`
- React prop types use Readonly pattern for immutable props

**Types:**
- Metadata type imported from `"next"`: `Metadata`
- Types are imported with `type` keyword: `import type { Metadata } from "next"`
- JSX.Element implicitly used in component returns

## Code Style

**Formatting:**
- No Prettier configuration detected; relies on ESLint formatting
- Indentation: 2 spaces (inferred from ESLint Next.js config)
- Line length: No explicit limit observed
- Trailing commas used in imports and objects

**Linting:**
- Tool: ESLint 9.x with Next.js configuration
- Config file: `eslint.config.mjs` (new flat config format)
- Rules applied:
  - ESLint Next.js core-web-vitals rules for performance/best practices
  - ESLint Next.js TypeScript rules for type safety
  - Ignored directories: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- Run command: `npm run lint` (eslint only, no additional flags)

## Import Organization

**Order:**
1. Next.js built-in imports: `import ... from "next"`
2. React imports: `import React from "react"` or type imports
3. Image/assets: `import Image from "next/image"`
4. Local types/utilities: imported via path aliases
5. CSS files: imported last

**Path Aliases:**
- Single alias defined: `@/*` maps to root directory
  - Location: `tsconfig.json` under `compilerOptions.paths`
  - Usage example: `@/component` refers to root-level component
  - Currently minimal usage; files are co-located in `app/` directory

**Import style:**
- Named imports preferred: `import type { Metadata } from "next"`
- Default exports used for React components in app directory
- Type-only imports explicitly marked with `type` keyword

## Error Handling

**Patterns:**
- No explicit error handling observed in current codebase
- App routes (Next.js) implicitly handle 404s via not-found boundary
- No try-catch blocks present in analyzed files

## Logging

**Framework:** Not configured

- No logging library detected (console not used in analyzed files)
- Logging decisions deferred to future development phases

## Comments

**When to Comment:**
- Minimal comments in codebase
- `next-env.d.ts` includes explanatory comments for auto-generated content
- Configuration comments rare; code is self-documenting where possible

**JSDoc/TSDoc:**
- Not currently in use
- Type annotations provide sufficient documentation for React components

## Function Design

**Size:**
- Functions are minimal; layout and page components are 10-20 lines
- No large functions observed

**Parameters:**
- React component parameters use destructured Readonly objects
  - Example: `function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {}`
  - Props are immutable by design

**Return Values:**
- React components return JSX.Element implicitly
- All function returns are typed or inferred

## Module Design

**Exports:**
- Default exports for app route components (`export default function RootLayout()`)
- Default exports used consistently for page and layout components per Next.js convention
- No named exports from route segments

**Barrel Files:**
- Not used; files are small and directly imported
- App directory structure provides implicit organization

## CSS & Styling

**Approach:**
- Tailwind CSS 4.x for utility-first styling
- Global CSS via `globals.css` with Tailwind imports
- CSS custom properties (CSS variables) for theming
- No CSS-in-JS libraries detected
- Responsive classes used: `sm:`, `md:`, `dark:` prefixes in className strings

**CSS Custom Properties:**
- Defined in `:root` and `@media (prefers-color-scheme: dark)`
- Referenced as `var(--variable-name)` in CSS

## Package Manager

**Tool:** npm
- Lockfile: `package-lock.json` present
- Exact versions pinned for dependencies
- Development dependencies separated by intent

---

*Convention analysis: 2026-02-13*
