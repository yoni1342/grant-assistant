"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Loader2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { GenerateProposalButton } from "./components/generate-proposal-button";
import { FunderAnalysisButton } from "./components/funder-analysis-button";

type Grant = Tables<"grants">;

const STAGES = [
  "discovery",
  "screening",
  "drafting",
  // "submission",
  // "awarded",
  // "reporting",
  "closed",
] as const;

export function GrantDetail({
  grant,
  activities,
  workflows,
  proposals,
}: {
  grant: Grant;
  activities: Tables<"activity_log">[];
  workflows: Tables<"workflow_executions">[];
  proposals: Array<{ id: string; title: string; status: string }>;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(grant.title);
  const [funderName, setFunderName] = useState(grant.funder_name || "");
  const [amount, setAmount] = useState(grant.amount?.toString() || "");
  const [deadline, setDeadline] = useState(() => {
    if (!grant.deadline) return "";
    const d = new Date(grant.deadline);
    return isNaN(d.getTime()) ? grant.deadline : d.toISOString().split("T")[0];
  });
  const [stage, setStage] = useState<string>(grant.stage || "discovery");

  const eligibility = grant.eligibility as {
    score?: string;
    indicator?: string;
    confidence?: number;
  } | null;
  const concerns = grant.concerns as string[] | null;
  const recommendations = grant.recommendations as { text?: string }[] | string[] | null;

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    await supabase
      .from("grants")
      .update({
        title,
        funder_name: funderName || null,
        amount: amount || null,
        deadline: deadline || null,
        stage,
      })
      .eq("id", grant.id);

    setSaving(false);
    router.refresh();
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/pipeline">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Pipeline
          </Button>
        </Link>
      </div>

      {/* Section 1: Grant Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Grant Details</CardTitle>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Funder</Label>
              <Input
                value={funderName}
                onChange={(e) => setFunderName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Not specified"
              />
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="Not specified"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <p className="text-sm text-muted-foreground leading-relaxed rounded-lg border p-3 bg-muted/30">
              {grant.description || "No description available"}
            </p>
          </div>

          {/* Source Link */}
          {grant.source_url && (
            <div className="flex items-center gap-2">
              <Label>Source</Label>
              <a
                href={grant.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                {grant.source_url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Screening Report */}
      {(grant.screening_score != null || grant.screening_notes || eligibility || concerns?.length || recommendations?.length) && (
        <Card>
          <CardHeader>
            <CardTitle>Screening Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Score */}
            {grant.screening_score != null && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Score:</span>
                <Badge
                  variant={
                    grant.screening_score >= 70
                      ? "default"
                      : grant.screening_score >= 40
                        ? "secondary"
                        : "destructive"
                  }
                  className="text-sm"
                >
                  {grant.screening_score}%
                </Badge>
                {eligibility?.score && (
                  <span className="text-sm text-muted-foreground">
                    ({eligibility.score})
                  </span>
                )}
              </div>
            )}

            {/* Screening Notes */}
            {grant.screening_notes && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Assessment</p>
                <p className="text-sm text-muted-foreground leading-relaxed rounded-lg border p-3 bg-muted/30">
                  {grant.screening_notes}
                </p>
              </div>
            )}

            {/* Concerns */}
            {concerns && concerns.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Concerns
                </p>
                <ul className="space-y-1">
                  {concerns.map((concern, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-yellow-500 mt-0.5">-</span>
                      {concern}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  Recommendations
                </p>
                <ul className="space-y-1">
                  {recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">-</span>
                      {typeof rec === "string" ? rec : rec.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Tools */}
      <Card>
        <CardHeader>
          <CardTitle>AI Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Proposals */}
          {proposals.length > 0 && (
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-medium">Existing Proposals:</p>
              <div className="flex flex-col gap-2">
                {proposals.map((proposal) => (
                  <Link
                    key={proposal.id}
                    href={`/proposals/${proposal.id}`}
                    className="text-sm hover:underline flex items-center gap-2"
                  >
                    {proposal.title}
                    <Badge variant="outline" className="text-xs">
                      {proposal.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Generate Proposal */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Proposal Generation</p>
            <GenerateProposalButton
              grantId={grant.id}
              grantTitle={grant.title}
              existingProposalId={proposals.length > 0 ? proposals[0].id : undefined}
            />
          </div>

          {/* Funder Analysis */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Funder Research</p>
            <FunderAnalysisButton
              grantId={grant.id}
              funderName={grant.funder_name || undefined}
              ein={(grant.metadata as { ein?: string })?.ein}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Workflow History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflow History</CardTitle>
          </CardHeader>
          <CardContent>
            {workflows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No workflows run yet
              </p>
            ) : (
              <div className="space-y-3">
                {workflows.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-medium">{w.workflow_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(w.created_at!).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        w.status === "completed"
                          ? "default"
                          : w.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {w.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activity yet
              </p>
            ) : (
              <div className="space-y-3">
                {activities.map((a) => (
                  <div key={a.id} className="text-sm">
                    <p>{a.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at!).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
