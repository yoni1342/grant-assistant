import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock } from "lucide-react";

export default async function PendingApprovalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, organizations(name)")
    .eq("id", user.id)
    .single();

  const orgs = profile?.organizations as unknown as { name: string } | { name: string }[] | null;
  const orgName = (Array.isArray(orgs) ? orgs[0]?.name : orgs?.name) || "Your organization";

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl font-semibold">
            Registration Pending
          </CardTitle>
          <CardDescription>
            Your organization <strong>{orgName}</strong> is under review. You
            will be granted access once an administrator approves your
            registration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/auth/signout" method="POST">
            <Button variant="outline" type="submit" className="w-full">
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
