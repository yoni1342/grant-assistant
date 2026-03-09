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
import { XCircle } from "lucide-react";

export default async function RejectedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, organizations(name, rejection_reason)")
    .eq("id", user.id)
    .single();

  type OrgData = { name: string; rejection_reason: string | null };
  const orgs = profile?.organizations as unknown as OrgData | OrgData[] | null;
  const org = Array.isArray(orgs) ? orgs[0] : orgs;
  const orgName = org?.name || "Your organization";
  const rejectionReason = org?.rejection_reason;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-semibold">
            Registration Not Approved
          </CardTitle>
          <CardDescription>
            Your organization <strong>{orgName}</strong> was not approved for
            access to Fundory.ai.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {rejectionReason && (
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground text-left">
              <p className="font-medium mb-1">Reason:</p>
              <p>{rejectionReason}</p>
            </div>
          )}
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
