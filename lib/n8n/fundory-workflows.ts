// Allowlist of n8n workflow names that belong to the Fundory product.
// Used by:
//   - app/(admin)/admin/system-errors/page.tsx (filter the dashboard query)
//   - The "Error Notification Handler" workflow on n8n (gates Slack + DB log)
//
// Keep this list in sync with the JSON files under /workflows AND the inlined
// array in the Error Notification Handler Code node on the n8n host. Other
// workflows on the same n8n instance (Email Classifier Capital City, Competitor
// Scraper, k-Post Fetching, etc.) belong to unrelated projects and must NOT
// surface here or in the Fundory Slack channel.

export const FUNDORY_WORKFLOWS: readonly string[] = [
  "5. Narrative Library with AI Customization",
  "6. Grant Proposal Generator",
  "add new grants to pipeline",
  "AI Proposal Critic 8",
  "Auto-Submit 11",
  "Award Notification Handler My workflow 13",
  "Budget Generator 7",
  "Central Grants Description Backfill",
  "Centralized Scheduled Grant fetch",
  "Centralized Scheduled Grant fetch - Enrich Description",
  "Daily Org Grant Fetch Scheduler",
  "Discovery Cleanup Replay",
  "Enrich Throttle Queue",
  "_Error Handler Test",
  "Error Notification Handler",
  "funder Analyzer 9",
  "Grant Automation 4: Document Vault Manager",
  "Grant Eligibility Screener + Tracker 2/3",
  "Grant fetch",
  "Grant fetch - Process Chunk",
  "Grant Report Auto-Drafter 14",
  "Org Website Narrative Generator",
  "plane state router15",
  "Process Chunk Throttle Queue",
  "Screening Throttle Queue",
  "search for grants using query",
  "Submission Checklist GeneratorMy workflow 10",
  "Support Request Notifier",
  "WF12 - Post Submission Tracker",
];

export function isFundoryWorkflow(name: string | null | undefined): boolean {
  if (!name) return false;
  return FUNDORY_WORKFLOWS.includes(name);
}
