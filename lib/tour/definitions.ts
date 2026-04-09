import type { DriveStep } from "driver.js";

// Each step includes a `page` field so the tour provider knows
// when to navigate before highlighting the element.

export interface TourStep extends DriveStep {
  /** The pathname the user must be on for this step. */
  page: string;
}

// ─── Base Tour (all tiers) ───────────────────────────────────────────────────

export const BASE_TOUR: TourStep[] = [
  // ── Welcome ──
  {
    page: "/dashboard",
    popover: {
      title: "Welcome to Fundory!",
      description:
        "Let's walk through every feature of the platform so you can start discovering and winning grants. This will only take a couple of minutes.",
      side: "over" as const,
      align: "center" as const,
    },
  },

  // ── Dashboard ──
  {
    page: "/dashboard",
    element: "[data-tour='nav-dashboard']",
    popover: {
      title: "Dashboard",
      description:
        "This is your home base. It gives you a bird's-eye view of everything happening in your grant pipeline.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/dashboard",
    element: "[data-tour='dashboard-metrics']",
    popover: {
      title: "Key Metrics",
      description:
        "These cards show your total grants, active deadlines, grants without deadlines, past deadlines, and your daily grant usage. Click any card to drill into the details.",
      side: "bottom" as const,
    },
  },
  {
    page: "/dashboard",
    element: "[data-tour='dashboard-pipeline']",
    popover: {
      title: "Pipeline Overview",
      description:
        "A visual breakdown of how your grants are distributed across stages \u2014 from Discovery through Closed. The progress bars show the proportion in each stage.",
      side: "top" as const,
    },
  },
  {
    page: "/dashboard",
    element: "[data-tour='dashboard-deadlines']",
    popover: {
      title: "Upcoming Deadlines",
      description:
        "Never miss a deadline. This panel shows your soonest grant deadlines with urgency labels \u2014 Critical (< 24h), Urgent (< 48h), and Soon (< 1 week). Click any grant to view its details.",
      side: "left" as const,
    },
  },
  {
    page: "/dashboard",
    element: "[data-tour='dashboard-activity']",
    popover: {
      title: "Recent Activity",
      description:
        "A live feed of everything happening in your account \u2014 grants added, screenings completed, proposals generated, and more.",
      side: "top" as const,
    },
  },

  // ── Discovery ──
  {
    page: "/dashboard",
    element: "[data-tour='nav-discovery']",
    popover: {
      title: "Grant Discovery",
      description:
        "This is where you search for new grant opportunities across Grants.gov, ProPublica, USAspending, CFDA, and more. Click Next to visit the Discovery page.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/discovery",
    element: "[data-tour='discovery-search']",
    popover: {
      title: "Search Bar",
      description:
        "Type keywords like \"health\", \"education\", or \"community development\" and results will stream in from multiple databases in real time.",
      side: "bottom" as const,
    },
  },
  {
    page: "/discovery",
    element: "[data-tour='discovery-filters']",
    popover: {
      title: "Advanced Filters",
      description:
        "Narrow your search by location (state), organization type, nonprofit/for-profit status, industry, and funding category. Combine filters to find exactly what you need.",
      side: "bottom" as const,
    },
  },
  {
    page: "/discovery",
    element: "[data-tour='discovery-discover-btn']",
    popover: {
      title: "Discover Button",
      description:
        "Hit this button (or press Enter) to start your search. Results appear in real time as each database responds. You can add any grant directly to your pipeline from the results.",
      side: "bottom" as const,
    },
  },

  // ── Pipeline ──
  {
    page: "/discovery",
    element: "[data-tour='nav-pipeline']",
    popover: {
      title: "Pipeline",
      description:
        "Your pipeline tracks every grant from discovery through submission. Click Next to visit the Pipeline page.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/pipeline",
    element: "[data-tour='pipeline-add-btn']",
    popover: {
      title: "Add Grant Manually",
      description:
        "Found a grant outside of Fundory? Use this button to manually add it to your pipeline with a title, funder, amount, and deadline.",
      side: "bottom" as const,
    },
  },
  {
    page: "/pipeline",
    element: "[data-tour='pipeline-filters']",
    popover: {
      title: "Search & Filter",
      description:
        "Search your pipeline by grant title or funder name. Use the stage dropdown to filter by pipeline stage \u2014 Discovered, Screened, Waiting for Approval, Drafted, or Closed.",
      side: "bottom" as const,
    },
  },
  {
    page: "/pipeline",
    element: "[data-tour='pipeline-view-toggle']",
    popover: {
      title: "Kanban / List View",
      description:
        "Toggle between a Kanban board (drag grants between stages) and a compact list view. The Kanban view lets you visually manage your workflow by dragging cards.",
      side: "bottom" as const,
    },
  },
  {
    page: "/pipeline",
    element: "[data-tour='pipeline-board']",
    popover: {
      title: "Grant Pipeline Board",
      description:
        "Each column is a stage: Discovery \u2192 Screening \u2192 Waiting for Approval \u2192 Drafting \u2192 Closed. Drag grants between columns to advance them. Click any grant card to see full details, eligibility scores, and generate proposals.",
      side: "top" as const,
    },
  },

  // ── Documents ──
  {
    page: "/pipeline",
    element: "[data-tour='nav-documents']",
    popover: {
      title: "Documents",
      description:
        "Your document vault for all supporting files — budgets, letters of support, org charts, and more. Click Next to visit the Documents page.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/documents",
    element: "[data-tour='documents-upload-btn']",
    popover: {
      title: "Upload Documents",
      description:
        "Upload PDFs, Word docs, Excel files, and presentations. Categorize them as narratives, supporting documents, or budgets so they're easy to find when building proposals.",
      side: "bottom" as const,
    },
  },
  {
    page: "/documents",
    element: "[data-tour='documents-area']",
    popover: {
      title: "Document Library",
      description:
        "All your uploaded files appear here in a searchable table. You can view, download, or delete documents. These files are available when generating proposals.",
      side: "top" as const,
    },
  },

  // ── Narratives ──
  {
    page: "/documents",
    element: "[data-tour='nav-narratives']",
    popover: {
      title: "Narratives",
      description:
        "Reusable content blocks — mission statements, impact narratives, methodology descriptions — that speed up proposal writing. Click Next to visit the Narratives page.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/narratives",
    element: "[data-tour='narratives-new-btn']",
    popover: {
      title: "Create New Narrative",
      description:
        "Click here to create a new narrative block. Write your mission statement, impact description, methodology, budget narrative, or any reusable section once.",
      side: "bottom" as const,
    },
  },
  {
    page: "/narratives",
    element: "[data-tour='narratives-area']",
    popover: {
      title: "Narrative Library",
      description:
        "Your saved narratives live here. Each one can be dropped into any proposal. Edit or update them anytime \u2014 changes are available across all future proposals.",
      side: "top" as const,
    },
  },

  // ── Proposals ──
  {
    page: "/narratives",
    element: "[data-tour='nav-proposals']",
    popover: {
      title: "Proposals",
      description:
        "AI-generated grant proposals built from your narratives and grant details. Click Next to visit the Proposals page.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/proposals",
    element: "[data-tour='proposals-area']",
    popover: {
      title: "Proposal Management",
      description:
        "When you move a grant to the \"Drafting\" stage, Fundory generates a proposal using AI, pulling from your narratives and document library. Review, edit, and export proposals here.",
      side: "top" as const,
    },
  },

  // ── Notifications ──
  {
    page: "/proposals",
    element: "[data-tour='nav-notifications']",
    popover: {
      title: "Notifications",
      description:
        "Real-time alerts about screening results, proposal completions, and deadline reminders. Click Next to visit Notifications.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/notifications",
    element: "[data-tour='notifications-area']",
    popover: {
      title: "Notification Center",
      description:
        "All your notifications in one place \u2014 screening results, proposal completions, eligibility alerts, and deadline reminders. Grouped by time (Now, Today, This Week, etc.) so you never miss anything.",
      side: "top" as const,
    },
  },

  // ── Billing ──
  {
    page: "/notifications",
    element: "[data-tour='nav-billing']",
    popover: {
      title: "Billing",
      description:
        "Manage your subscription, view your current plan, and upgrade when you're ready. Click Next to visit Billing.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/billing",
    element: "[data-tour='billing-area']",
    popover: {
      title: "Subscription & Billing",
      description:
        "See your current plan, daily grant usage, and trial status. Compare plans side by side and upgrade to Professional for unlimited grants and the full content library.",
      side: "top" as const,
    },
  },

  // ── Settings ──
  {
    page: "/billing",
    element: "[data-tour='nav-settings']",
    popover: {
      title: "Settings",
      description:
        "Configure your account, organization, team members, and preferences. Click Next to visit Settings.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/settings",
    element: "[data-tour='settings-tabs']",
    popover: {
      title: "Settings Tabs",
      description:
        "Profile \u2014 update your name, email, and avatar. Organization \u2014 manage org details, team members, and invite new users. Appearance \u2014 switch themes, set timezone, date format, and replay this tour anytime.",
      side: "bottom" as const,
    },
  },

  // ── Wrap up ──
  {
    page: "/dashboard",
    popover: {
      title: "You're All Set!",
      description:
        "Start by heading to Discovery to find your first grant. From there, add it to your pipeline, upload supporting documents, and let Fundory help you build proposals. You can replay this tour anytime from Settings > Appearance.",
      side: "over" as const,
      align: "center" as const,
    },
  },
];

// ─── Professional Tour (new pro signups) ─────────────────────────────────────
// Includes everything in base + highlights pro-only features

export const PROFESSIONAL_TOUR: TourStep[] = [
  // ── Welcome ──
  {
    page: "/dashboard",
    popover: {
      title: "Welcome to Fundory Professional!",
      description:
        "You have unlimited grants, RFP parsing, and the full content library. Let's walk through every feature of the platform.",
      side: "over" as const,
      align: "center" as const,
    },
  },

  // ── Dashboard ──
  {
    page: "/dashboard",
    element: "[data-tour='nav-dashboard']",
    popover: {
      title: "Dashboard",
      description:
        "Your command center. See your entire grant pipeline, deadlines, and activity at a glance.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/dashboard",
    element: "[data-tour='dashboard-metrics']",
    popover: {
      title: "Key Metrics",
      description:
        "Total grants, active deadlines, grants without deadlines, past deadlines \u2014 all at a glance. Click any card to drill in.",
      side: "bottom" as const,
    },
  },
  {
    page: "/dashboard",
    element: "[data-tour='dashboard-pipeline']",
    popover: {
      title: "Pipeline Overview",
      description:
        "See how your grants are distributed across stages. The bars show the proportion in each stage from Discovery through Closed.",
      side: "top" as const,
    },
  },
  {
    page: "/dashboard",
    element: "[data-tour='dashboard-deadlines']",
    popover: {
      title: "Upcoming Deadlines",
      description:
        "Your soonest deadlines with urgency labels. Critical (< 24h), Urgent (< 48h), and Soon (< 1 week). Click any to view details.",
      side: "left" as const,
    },
  },
  {
    page: "/dashboard",
    element: "[data-tour='dashboard-activity']",
    popover: {
      title: "Recent Activity",
      description:
        "A live feed of grants added, screenings, proposals generated, and pipeline changes.",
      side: "top" as const,
    },
  },

  // ── Discovery (unlimited) ──
  {
    page: "/dashboard",
    element: "[data-tour='nav-discovery']",
    popover: {
      title: "Grant Discovery \u2014 Unlimited",
      description:
        "Search unlimited grants across all databases. No daily limits on your Professional plan. Click Next to visit the Discovery page.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/discovery",
    element: "[data-tour='discovery-search']",
    popover: {
      title: "Unlimited Search",
      description:
        "Type keywords and results stream in from Grants.gov, ProPublica, USAspending, CFDA, and more. No daily cap \u2014 search as much as you need.",
      side: "bottom" as const,
    },
  },
  {
    page: "/discovery",
    element: "[data-tour='discovery-filters']",
    popover: {
      title: "Advanced Filters",
      description:
        "Filter by location, organization type, nonprofit/for-profit, industry, and funding category to find exactly the right opportunities.",
      side: "bottom" as const,
    },
  },
  {
    page: "/discovery",
    element: "[data-tour='discovery-discover-btn']",
    popover: {
      title: "Discover",
      description:
        "Launch your search. Results stream in real time from multiple databases. Add grants directly to your pipeline from results.",
      side: "bottom" as const,
    },
  },

  // ── Pipeline ──
  {
    page: "/discovery",
    element: "[data-tour='nav-pipeline']",
    popover: {
      title: "Pipeline",
      description:
        "Track every grant from discovery through submission. Click Next to visit the Pipeline page.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/pipeline",
    element: "[data-tour='pipeline-add-btn']",
    popover: {
      title: "Add Grant Manually",
      description:
        "Add grants from outside Fundory manually with title, funder, amount, and deadline. No limits on your plan.",
      side: "bottom" as const,
    },
  },
  {
    page: "/pipeline",
    element: "[data-tour='pipeline-filters']",
    popover: {
      title: "Search & Filter",
      description:
        "Find specific grants by title or funder. Filter by stage to focus on what needs attention.",
      side: "bottom" as const,
    },
  },
  {
    page: "/pipeline",
    element: "[data-tour='pipeline-view-toggle']",
    popover: {
      title: "Kanban / List View",
      description:
        "Switch between a drag-and-drop Kanban board and a compact list. The Kanban view lets you drag grants between stages.",
      side: "bottom" as const,
    },
  },
  {
    page: "/pipeline",
    element: "[data-tour='pipeline-board']",
    popover: {
      title: "Grant Pipeline",
      description:
        "Stages: Discovery \u2192 Screening \u2192 Approval \u2192 Drafting \u2192 Closed. Drag grants between columns. Click a card for details, eligibility scores, and to generate proposals.",
      side: "top" as const,
    },
  },

  // ── Documents (full content library) ──
  {
    page: "/pipeline",
    element: "[data-tour='nav-documents']",
    popover: {
      title: "Documents \u2014 Full Content Library",
      description:
        "Your Professional plan includes the full content library for all your supporting files. Click Next to visit the Documents page.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/documents",
    element: "[data-tour='documents-upload-btn']",
    popover: {
      title: "Upload Documents",
      description:
        "Upload PDFs, Word docs, spreadsheets, and presentations. Categorize as narratives, supporting docs, or budgets.",
      side: "bottom" as const,
    },
  },
  {
    page: "/documents",
    element: "[data-tour='documents-area']",
    popover: {
      title: "Document Vault",
      description:
        "Your complete file library. All documents are available when generating proposals.",
      side: "top" as const,
    },
  },

  // ── Narratives ──
  {
    page: "/documents",
    element: "[data-tour='nav-narratives']",
    popover: {
      title: "Narratives",
      description:
        "Reusable content blocks for faster proposal writing. Write once, use everywhere. Click Next to visit the Narratives page.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/narratives",
    element: "[data-tour='narratives-new-btn']",
    popover: {
      title: "Create Narrative",
      description:
        "Create mission statements, impact narratives, methodology descriptions, budget narratives \u2014 any reusable section.",
      side: "bottom" as const,
    },
  },
  {
    page: "/narratives",
    element: "[data-tour='narratives-area']",
    popover: {
      title: "Narrative Library",
      description:
        "Your saved narratives. Drop them into any proposal. Edit anytime \u2014 updates apply to all future proposals.",
      side: "top" as const,
    },
  },

  // ── Proposals ──
  {
    page: "/narratives",
    element: "[data-tour='nav-proposals']",
    popover: {
      title: "Proposals",
      description:
        "AI-generated proposals built from your narratives, documents, and grant details. Click Next to visit the Proposals page.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/proposals",
    element: "[data-tour='proposals-area']",
    popover: {
      title: "Proposal Management",
      description:
        "Move a grant to \"Drafting\" and Fundory generates a full proposal using AI. Review, edit, and export from here.",
      side: "top" as const,
    },
  },

  // ── Notifications ──
  {
    page: "/proposals",
    element: "[data-tour='nav-notifications']",
    popover: {
      title: "Notifications",
      description:
        "Real-time alerts for screening results, proposals, and deadlines. Click Next to visit Notifications.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/notifications",
    element: "[data-tour='notifications-area']",
    popover: {
      title: "Notification Center",
      description:
        "Screening results, proposal completions, eligibility alerts, deadline reminders \u2014 grouped by time so you never miss anything.",
      side: "top" as const,
    },
  },

  // ── Billing ──
  {
    page: "/notifications",
    element: "[data-tour='nav-billing']",
    popover: {
      title: "Billing",
      description:
        "Manage your Professional subscription and payment details. Click Next to visit Billing.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/billing",
    element: "[data-tour='billing-area']",
    popover: {
      title: "Subscription Management",
      description:
        "View your plan details, trial status, and manage your payment method through the Stripe portal.",
      side: "top" as const,
    },
  },

  // ── Settings ──
  {
    page: "/billing",
    element: "[data-tour='nav-settings']",
    popover: {
      title: "Settings",
      description:
        "Configure your account, organization, and preferences. Click Next to visit Settings.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/settings",
    element: "[data-tour='settings-tabs']",
    popover: {
      title: "Settings Tabs",
      description:
        "Profile \u2014 name, email, avatar, password. Organization \u2014 org details, team members, invitations. Appearance \u2014 theme, timezone, date format, and replay this tour.",
      side: "bottom" as const,
    },
  },

  // ── Wrap up ──
  {
    page: "/dashboard",
    popover: {
      title: "You're Ready to Go!",
      description:
        "Head to Discovery to start finding grants \u2014 no limits on your Professional plan. Build up your pipeline, upload documents, create narratives, and let Fundory generate proposals for you. Replay this tour anytime from Settings > Appearance.",
      side: "over" as const,
      align: "center" as const,
    },
  },
];

// ─── Upgrade Tour (free \u2192 professional) ──────────────────────────────────────
// Only highlights the new features unlocked by upgrading

export const UPGRADE_TOUR: TourStep[] = [
  {
    page: "/dashboard",
    popover: {
      title: "Welcome to Professional!",
      description:
        "You've upgraded \u2014 here's what's new. Let's walk through the features you just unlocked.",
      side: "over" as const,
      align: "center" as const,
    },
  },
  {
    page: "/dashboard",
    element: "[data-tour='dashboard-metrics']",
    popover: {
      title: "No More Daily Limit",
      description:
        "The daily grant usage card is gone. You now have unlimited grants every day \u2014 no restrictions.",
      side: "bottom" as const,
    },
  },
  {
    page: "/dashboard",
    element: "[data-tour='nav-discovery']",
    popover: {
      title: "Unlimited Discovery",
      description:
        "Search and add as many grants as you need. No daily cap.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/discovery",
    element: "[data-tour='discovery-search']",
    popover: {
      title: "Search Without Limits",
      description:
        "Run as many searches as you want across all databases. Add every matching grant to your pipeline.",
      side: "bottom" as const,
    },
  },
  {
    page: "/discovery",
    element: "[data-tour='nav-documents']",
    popover: {
      title: "Full Content Library",
      description:
        "Your document vault and narrative library are fully unlocked for comprehensive proposal building. Click Next to visit the Documents page.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/documents",
    element: "[data-tour='documents-upload-btn']",
    popover: {
      title: "Upload Everything You Need",
      description:
        "Upload all your supporting documents \u2014 budgets, letters of support, org charts. No storage limits.",
      side: "bottom" as const,
    },
  },
  {
    page: "/documents",
    element: "[data-tour='nav-narratives']",
    popover: {
      title: "Narratives Fully Unlocked",
      description:
        "Create unlimited narrative blocks to speed up proposal writing. Click Next to visit the Narratives page.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/narratives",
    element: "[data-tour='narratives-new-btn']",
    popover: {
      title: "Build Your Content Library",
      description:
        "Start creating reusable narrative sections \u2014 mission, impact, methodology, budget \u2014 to drop into any proposal.",
      side: "bottom" as const,
    },
  },
  {
    page: "/dashboard",
    popover: {
      title: "That's Everything!",
      description:
        "Enjoy unlimited grants, the full content library, and AI-powered proposals. Replay this tour anytime from Settings > Appearance.",
      side: "over" as const,
      align: "center" as const,
    },
  },
];

// ─── Agency Tour ────────────────────────────────────────────────────────────

export const AGENCY_TOUR: TourStep[] = [
  // ── Welcome ──
  {
    page: "/agency",
    popover: {
      title: "Welcome to Your Agency Dashboard!",
      description:
        "Let's walk through your agency command center. You'll learn how to manage multiple organizations, track grants across all of them, and keep everything running smoothly.",
      side: "over" as const,
      align: "center" as const,
    },
  },

  // ── Dashboard ──
  {
    page: "/agency",
    element: "[data-tour='agency-nav-dashboard']",
    popover: {
      title: "Agency Dashboard",
      description:
        "Your home base. See a snapshot of all your organizations, total grants, and subscription status at a glance.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/agency",
    element: "[data-tour='agency-metrics']",
    popover: {
      title: "Key Metrics",
      description:
        "These cards show your total organizations, grants across all orgs, and your current subscription status. Keep an eye on these to monitor your agency's health.",
      side: "bottom" as const,
    },
  },
  {
    page: "/agency",
    element: "[data-tour='agency-add-org-btn']",
    popover: {
      title: "Add New Organization",
      description:
        "Quickly create a new client organization from the dashboard. Each org gets its own separate grants, proposals, documents, and pipeline.",
      side: "bottom" as const,
    },
  },
  {
    page: "/agency",
    element: "[data-tour='agency-org-cards']",
    popover: {
      title: "Your Organizations",
      description:
        "Each card represents a client organization. You can see the org name, sector, status, and grant count. Click any card to switch into that org's full dashboard.",
      side: "top" as const,
    },
  },

  // ── Organizations page ──
  {
    page: "/agency",
    element: "[data-tour='agency-nav-organizations']",
    popover: {
      title: "Organizations Management",
      description:
        "The full organization management page. Let's take a look.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/agency/organizations",
    element: "[data-tour='agency-new-org-btn']",
    popover: {
      title: "Create Organization",
      description:
        "Click here to onboard a new client organization. You'll fill in their name, sector, and mission \u2014 then they'll appear in your agency.",
      side: "bottom" as const,
    },
  },
  {
    page: "/agency/organizations",
    element: "[data-tour='agency-org-table']",
    popover: {
      title: "Organization Table",
      description:
        "A detailed table of every organization. See their sector, status (Active, Suspended, Pending), grant count, and creation date. You can suspend or unsuspend orgs, and click Open to switch into any org's dashboard.",
      side: "top" as const,
    },
  },

  // ── Analytics ──
  {
    page: "/agency/organizations",
    element: "[data-tour='agency-nav-analytics']",
    popover: {
      title: "Cross-Org Analytics",
      description:
        "Your bird's-eye view of grant performance across every organization. Let's explore.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/agency/analytics",
    element: "[data-tour='agency-analytics-summary']",
    popover: {
      title: "Agency Metrics",
      description:
        "At a glance: total organizations, total grants, pending deadlines, and combined pipeline value across your entire agency.",
      side: "bottom" as const,
    },
  },
  {
    page: "/agency/analytics",
    element: "[data-tour='agency-analytics-pipeline']",
    popover: {
      title: "Pipeline & Deadlines",
      description:
        "The pipeline overview shows how grants are distributed across stages (Discovered, Screened, Drafted, etc.) across all orgs. The deadlines panel shows upcoming grant deadlines so nothing slips through.",
      side: "top" as const,
    },
  },
  {
    page: "/agency/analytics",
    element: "[data-tour='agency-analytics-breakdown']",
    popover: {
      title: "Organization Breakdown",
      description:
        "A per-organization table showing each org's sector, status, grant count, total pipeline value, and upcoming deadlines. Compare performance across your client base.",
      side: "top" as const,
    },
  },
  {
    page: "/agency/analytics",
    element: "[data-tour='agency-analytics-activity']",
    popover: {
      title: "Recent Activity",
      description:
        "A live feed of actions across all organizations \u2014 grants added, proposals created, documents uploaded. Stay informed without switching between orgs.",
      side: "top" as const,
    },
  },

  // ── Billing ──
  {
    page: "/agency/analytics",
    element: "[data-tour='agency-nav-billing']",
    popover: {
      title: "Billing",
      description:
        "Manage your agency subscription and payment details.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/agency/billing",
    element: "[data-tour='agency-billing-plan']",
    popover: {
      title: "Your Agency Plan",
      description:
        "View your current plan, pricing, trial status, and included features. The Agency plan covers unlimited organizations and unlimited grants per org \u2014 all under a single bill. You can manage your payment method here too.",
      side: "bottom" as const,
    },
  },

  // ── Settings ──
  {
    page: "/agency/billing",
    element: "[data-tour='agency-nav-settings']",
    popover: {
      title: "Settings",
      description:
        "Configure your agency account. Let's take a look.",
      side: "right" as const,
      popoverClass: "fundory-tour-popover fundory-tour-sidebar",
    },
  },
  {
    page: "/agency/settings",
    element: "[data-tour='agency-settings-tabs']",
    popover: {
      title: "Agency Settings",
      description:
        "Three tabs here: Profile & Account for your personal info and password, Agency Details for your agency name and info, and Appearance for theme, timezone, date format, and restarting this tour.",
      side: "bottom" as const,
    },
  },

  // ── Final: point to an org ──
  {
    page: "/agency",
    element: "[data-tour='agency-org-cards']",
    popover: {
      title: "Ready to Go!",
      description:
        "That's your agency in a nutshell. Now click any organization card to open its dashboard \u2014 you'll get a guided tour of the organization features when you enter. Happy grant hunting!",
      side: "top" as const,
    },
  },
];

export type TourId = "base" | "professional" | "upgrade_pro" | "agency";

export const TOUR_MAP: Record<TourId, TourStep[]> = {
  base: BASE_TOUR,
  professional: PROFESSIONAL_TOUR,
  upgrade_pro: UPGRADE_TOUR,
  agency: AGENCY_TOUR,
};
