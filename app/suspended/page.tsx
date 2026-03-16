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
import { Ban } from "lucide-react";

export default async function SuspendedPage() {
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

  type OrgData = { name: string };
  const orgs = profile?.organizations as unknown as OrgData | OrgData[] | null;
  const org = Array.isArray(orgs) ? orgs[0] : orgs;
  const orgName = org?.name || "Your organization";

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
            <Ban className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-2xl font-semibold">
            Account Suspended
          </CardTitle>
          <CardDescription>
            Your organization <strong>{orgName}</strong> has been suspended.
            Please contact support for more information.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
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
