# UI/UX Optimization Log

**Project:** Fundory Grant Intelligence Platform
**Date:** April 7, 2026
**Branch:** `google-auth-implementation`

---

## Overview

A comprehensive UI/UX optimization pass was performed across the entire Fundory platform to improve mobile responsiveness, dark mode consistency, and general usability — without altering the existing desktop layout or design language.

The changes span three portal areas: **User Dashboard**, **Admin Panel**, and **Agency Panel**.

---

## Phase 1: Mobile Responsiveness (Core App)

### 1.1 Sidebar Navigation — All Portals

- **Before:** Sidebar was always visible, pushing content off-screen on mobile.
- **After:** Sidebar is hidden on mobile and replaced with a **hamburger menu** in a fixed top bar. Tapping it opens a **slide-out drawer** with a dark overlay. The drawer auto-closes on navigation and locks body scroll while open.
- **Affected files:** `components/sidebar.tsx`, `components/admin-sidebar.tsx`, `components/agency-sidebar.tsx`, `app/(admin)/layout.tsx`, `app/(agency)/layout.tsx`, `app/(dashboard)/layout.tsx`

### 1.2 Page Layouts — Responsive Padding and Viewport

- All page containers switched to `p-4 sm:p-6` for tighter padding on small screens.
- Root layout uses `h-[100dvh]` instead of `h-screen` to respect mobile browser chrome (Safari address bar, etc.).
- Main content area set to `overflow-x-hidden` to prevent horizontal scroll bleed.

### 1.3 Discovery Page

- Search bar and location filter stack vertically on mobile (`flex-col sm:flex-row`).
- Filter grid uses single column on small screens.
- Result cards stack metadata and action buttons vertically instead of side-by-side.

### 1.4 Pipeline — List View and Kanban

- **List view:** Added a dedicated mobile card layout (`sm:hidden`) that shows grant title, stage badge, score, amount, and deadline in a compact card. The desktop table layout is hidden on mobile.
- **Kanban view:** Columns use `75vw` width on mobile for better horizontal touch scrolling.

### 1.5 Dashboard — Metric Cards and Deadline Overflow

- Metric cards use a 2-column grid on mobile instead of 4.
- Pipeline overview and upcoming deadlines cards: Added `min-w-0` and `overflow-hidden` to prevent content from overflowing the viewport.
- Reduced grid gap on mobile for tighter spacing.

### 1.6 Grant Detail Page

- Form grids switch from multi-column to single column on mobile.
- Header action buttons stack vertically on small screens.

### 1.7 Data Tables — Horizontal Scroll

All data tables across the app were wrapped with `overflow-x-auto` and given a `min-width` to enable horizontal scrolling on mobile instead of clipping or overflowing:

- Deadlines table
- Archive table
- Awards table
- Pipeline list view table

### 1.8 Settings Tabs

- Settings tab labels shortened on mobile (e.g., "Profile" instead of "Profile & Account") with smaller text and padding.
- Full labels remain visible on desktop (responsive via `sm:` prefix classes).

### 1.9 Button Touch Targets

- All button sizes increased slightly on mobile for better tap targets:
  - Default: `h-10` on mobile, `h-9` on desktop
  - Small: `h-9` on mobile, `h-8` on desktop
  - Icon: `size-10` on mobile, `size-9` on desktop
- Applied via the shared `button.tsx` component, affecting all buttons platform-wide.

### 1.10 Appearance Settings

- Theme, timezone, and date format selectors use `flex-col sm:flex-row` layout so the label and dropdown stack on mobile and sit side-by-side on desktop.

---

## Phase 2: Admin Panel Fixes

### 2.1 Source Analytics Table

- Table now scrolls horizontally with `min-w-[700px]` instead of being squished.
- Date filter inputs go full-width on mobile.
- Page padding made responsive.

### 2.2 Admin Organizations — Action Buttons Overflow

- **Before:** Each organization row had 3–5 inline buttons (View, Approve, Reject, Suspend, Delete) causing horizontal overflow.
- **After:** Replaced inline action buttons with a compact **View** button + a **dropdown menu** (`...` icon) containing all actions (Approve, Reject, Suspend/Unsuspend, Delete) with proper icons and color coding.

### 2.3 Admin Organizations — Filter Layout

- **Before:** Status filters and billing filters were crammed into a single `flex-wrap` row separated by a pipe character (`|`), which lost meaning when items wrapped on mobile.
- **After:** Filters are split into **two separate rows** — status filters on top, billing filters below — each wrapping independently.

### 2.4 Admin Overview — Billing Stats Grid

- **Before:** `grid-cols-2 md:grid-cols-5` left the 5th card (Canceled) orphaned in its own row on mobile.
- **After:** Changed to `grid-cols-2 sm:grid-cols-3 md:grid-cols-5` so the 5 cards distribute more evenly at all breakpoints.

### 2.5 Admin Grants — Dark Mode Stage Badges

- **Before:** Stage badges used light-only colors (e.g., `bg-blue-100 text-blue-800`) that appeared washed out in dark mode.
- **After:** Added `dark:` variants to all stage badges (e.g., `dark:bg-blue-950 dark:text-blue-300`) across both the admin grants table and the pipeline list view.

### 2.6 Admin Overview — Dark Mode Approve Button

- Added `dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950` to the quick-approve button on the overview page.

---

## Phase 3: Agency Panel Fixes

### 3.1 Agency Organizations Table — Horizontal Scroll and Responsive Columns

- **Before:** The agency org table used a raw `<table>` without horizontal scroll protection. All columns were always visible regardless of screen size.
- **After:** Added `overflow-x-auto` wrapper with `min-w-[600px]`. Sector column hidden below `md` breakpoint. Created column hidden below `lg` breakpoint.

### 3.2 Agency Page Headers — Responsive Stacking

- **Before:** Title and "New Organization" button sat in a rigid `flex justify-between` row, colliding on narrow screens.
- **After:** Changed to `flex-col gap-3 sm:flex-row sm:items-center sm:justify-between` — stacks vertically on mobile, side-by-side on desktop.
- Applied to both the agency dashboard page and the agency organizations page.

---

## Phase 4: Cross-Cutting Table Improvements

### 4.1 Document Table — Horizontal Scroll

- Added `overflow-x-auto` to the document table wrapper to prevent clipping on narrow viewports.

### 4.2 Proposal Table — Horizontal Scroll

- Added `overflow-x-auto` to the proposal table wrapper for the same reason.

### 4.3 Pipeline List View — Dark Mode Stage Colors

- Added `dark:` variants to all stage color definitions (`discovery`, `screening`, `pending_approval`, `drafting`).

---

## Files Modified

| Area | File | Changes |
|------|------|---------|
| Dashboard Sidebar | `components/sidebar.tsx` | Mobile hamburger menu, slide-out drawer, body scroll lock |
| Admin Sidebar | `components/admin-sidebar.tsx` | Same mobile menu pattern as dashboard |
| Agency Sidebar | `components/agency-sidebar.tsx` | Same mobile menu pattern as dashboard |
| Button Component | `components/ui/button.tsx` | Larger mobile touch targets across all sizes |
| Admin Layout | `app/(admin)/layout.tsx` | Mobile top-bar spacer for fixed header |
| Agency Layout | `app/(agency)/layout.tsx` | Mobile top-bar spacer for fixed header |
| Dashboard Layout | `app/(dashboard)/layout.tsx` | Responsive padding, 100dvh viewport |
| Admin Overview | `app/(admin)/admin/overview-client.tsx` | Billing grid fix, dark mode approve button |
| Admin Organizations | `app/(admin)/admin/organizations/organizations-client.tsx` | Dropdown actions, split filter rows |
| Admin Grants | `app/(admin)/admin/grants/grants-client.tsx` | Dark mode stage + score badges |
| Source Analytics | `app/(admin)/admin/source-analytics/source-analytics-client.tsx` | Horizontal scroll, responsive date filter |
| Agency Dashboard | `app/(agency)/agency/page.tsx` | Responsive header stacking |
| Agency Organizations | `app/(agency)/agency/organizations/page.tsx` | Responsive header stacking |
| Agency Org Table | `app/(agency)/agency/organizations/org-table.tsx` | Horizontal scroll, responsive column hiding |
| Discovery | `app/(dashboard)/discovery/page.tsx` | Responsive search, filters, result cards |
| Pipeline List | `app/(dashboard)/pipeline/list-view.tsx` | Mobile card layout, dark mode badges |
| Pipeline Kanban | `app/(dashboard)/pipeline/kanban-view.tsx` | Mobile-friendly column widths |
| Dashboard Home | `app/(dashboard)/dashboard/page.tsx` | Overflow fix, responsive grid gap |
| Settings | `app/(dashboard)/settings/components/settings-client.tsx` | Shortened mobile tab labels |
| Appearance | `app/(dashboard)/settings/components/appearance-tab.tsx` | Responsive select layout |
| Documents | `app/(dashboard)/documents/components/document-table.tsx` | Horizontal scroll wrapper |
| Proposals | `app/(dashboard)/proposals/components/proposal-table.tsx` | Horizontal scroll wrapper |
| Login | `app/login/page.tsx` | Google OAuth button |

---

## Design Principles Followed

1. **Mobile-first corrections, desktop preserved** — No desktop layouts were changed. All improvements target screens below `md` (768px) or `sm` (640px).
2. **Progressive disclosure** — Less critical table columns are hidden at smaller breakpoints rather than squishing everything.
3. **Dark mode parity** — Every color-coded element (badges, buttons, hover states) now has explicit `dark:` variants.
4. **Touch-friendly** — Button tap targets meet minimum 44px on mobile. Navigation items have increased vertical padding.
5. **Horizontal scroll over truncation** — Data tables scroll horizontally with a minimum width rather than cutting off content.
