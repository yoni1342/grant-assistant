"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { completeAgencySetup } from "./actions";

export function AgencySetupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Agency name is required.");
      return;
    }

    setLoading(true);
    const result = await completeAgencySetup({ name: name.trim() });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/agency");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Agency Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="agency-name" className="text-sm font-medium">
              Agency Name
            </label>
            <Input
              id="agency-name"
              placeholder="e.g. Acme Grant Consulting"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              This is the name that will appear on your agency dashboard and to
              your organizations.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Complete Setup
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
