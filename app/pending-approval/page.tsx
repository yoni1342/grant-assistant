import { redirect } from "next/navigation";

// The admin-approval flow has been removed; new orgs are auto-active. If a
// legacy bookmarked link or a stuck session lands here, bounce to /dashboard
// (middleware will resolve from there based on the user's actual state).
export default function PendingApprovalPage() {
  redirect("/dashboard");
}
