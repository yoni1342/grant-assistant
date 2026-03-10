"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ArrowLeft, FileText, Download, Loader2 } from "lucide-react";
import {
  approveOrganization,
  rejectOrganization,
  getAdminDocumentUrl,
} from "../actions";

interface DocumentItem {
  id: string;
  title: string | null;
  name: string | null;
  category: string | null;
  ai_category: string | null;
  file_type: string | null;
  file_size: number | null;
  file_path: string | null;
  extraction_status: string | null;
  extracted_text: string | null;
  metadata: any;
  created_at: string | null;
}

interface OrgDetailClientProps {
  organization: {
    id: string;
    name: string;
    status: string;
    sector: string | null;
    mission: string | null;
    ein: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    founding_year: number | null;
    description: string | null;
    geographic_focus: string[] | null;
    created_at: string | null;
    rejection_reason: string | null;
  };
  profiles: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    created_at: string | null;
  }>;
  grants: Array<{
    id: string;
    title: string;
    funder_name: string | null;
    stage: string | null;
    amount: string | null;
    created_at: string | null;
  }>;
  proposals: Array<{
    id: string;
    title: string | null;
    status: string | null;
    quality_score: number | null;
    created_at: string | null;
  }>;
  workflowExecutions: Array<{
    id: string;
    workflow_name: string;
    status: string | null;
    created_at: string | null;
    completed_at: string | null;
  }>;
  activityLog: Array<{
    id: string;
    action: string;
    created_at: string | null;
  }>;
  documents: DocumentItem[];
  budgets: any[];
  narratives: any[];
}

function groupByMonth(items: Array<{ created_at: string | null }>, months = 6) {
  const now = new Date();
  const result: Record<string, number> = {};

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    result[key] = 0;
  }

  for (const item of items) {
    if (!item.created_at) continue;
    const d = new Date(item.created_at);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    if (key in result) result[key]++;
  }

  return Object.entries(result).map(([month, count]) => ({ month, count }));
}

const grantsChartConfig: ChartConfig = {
  count: { label: "Grants", color: "hsl(142, 70%, 45%)" },
};

const proposalsChartConfig: ChartConfig = {
  count: { label: "Proposals", color: "hsl(280, 70%, 50%)" },
};

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400">
          Pending
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="border-green-300 text-green-700 dark:text-green-400">
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-400">
          Rejected
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function categoryBadge(category: string | null, aiCategory?: string | null) {
  const label = aiCategory || category || "other";
  const colorMap: Record<string, string> = {
    budget: "border-emerald-300 text-emerald-700 dark:text-emerald-400",
    narrative: "border-blue-300 text-blue-700 dark:text-blue-400",
    supporting: "border-gray-300 text-gray-700 dark:text-gray-400",
    mission: "border-blue-300 text-blue-700",
    impact: "border-green-300 text-green-700",
    methods: "border-purple-300 text-purple-700",
    budget_narrative: "border-pink-300 text-pink-700",
  };
  return (
    <Badge variant="outline" className={`text-xs ${colorMap[label] || ""}`}>
      {label.replace("_", " ")}
    </Badge>
  );
}

// Document Viewer component with side panel
function DocumentViewer({ documents }: { documents: DocumentItem[] }) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    documents[0]?.id || null
  );
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || null;

  // Load signed URL when selected document changes
  useEffect(() => {
    setSignedUrl(null);
    if (!selectedDoc?.file_path) return;

    setUrlLoading(true);
    getAdminDocumentUrl(selectedDoc.file_path).then((result) => {
      if (result.url) setSignedUrl(result.url);
      setUrlLoading(false);
    });
  }, [selectedDoc?.id, selectedDoc?.file_path]);

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No documents uploaded
      </div>
    );
  }

  const isPdf = selectedDoc?.file_type === "application/pdf";
  const isImage = selectedDoc?.file_type?.startsWith("image/");

  return (
    <div className="flex gap-4 min-h-[600px]">
      {/* Side panel - document list */}
      <div className="w-64 shrink-0 border rounded-lg overflow-hidden">
        <div className="p-3 border-b bg-muted/50">
          <p className="text-sm font-medium">
            Documents ({documents.length})
          </p>
        </div>
        <div className="divide-y overflow-y-auto max-h-[560px]">
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDocId(doc.id)}
              className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${
                selectedDocId === doc.id
                  ? "bg-primary/5 border-l-2 border-l-primary"
                  : ""
              }`}
            >
              <p className="text-sm font-medium truncate">
                {doc.title || doc.name || "Untitled"}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {categoryBadge(doc.category, doc.ai_category)}
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(doc.file_size)}
                </span>
              </div>
              {doc.extraction_status && (
                <Badge
                  variant="outline"
                  className={`text-xs mt-1 ${
                    doc.extraction_status === "completed"
                      ? "border-green-300 text-green-700"
                      : doc.extraction_status === "failed"
                        ? "border-red-300 text-red-700"
                        : "border-amber-300 text-amber-700"
                  }`}
                >
                  {doc.extraction_status}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main content area - document preview */}
      <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
        {selectedDoc ? (
          <>
            {/* Document header */}
            <div className="p-4 border-b bg-muted/50 flex items-center justify-between">
              <div>
                <h3 className="font-medium">
                  {selectedDoc.title || selectedDoc.name || "Untitled"}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {categoryBadge(selectedDoc.category, selectedDoc.ai_category)}
                  <span className="text-xs text-muted-foreground">
                    {selectedDoc.file_type?.split("/").pop()?.toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(selectedDoc.file_size)}
                  </span>
                </div>
              </div>
              {signedUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer" download>
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download
                  </a>
                </Button>
              )}
            </div>

            {/* Document content */}
            <div className="flex-1 overflow-auto">
              {urlLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : signedUrl && isPdf ? (
                <iframe
                  src={signedUrl}
                  className="w-full h-full min-h-[500px]"
                  title={selectedDoc.title || selectedDoc.name || "Document"}
                />
              ) : signedUrl && isImage ? (
                <div className="p-4 flex items-center justify-center">
                  <img
                    src={signedUrl}
                    alt={selectedDoc.title || selectedDoc.name || "Document"}
                    className="max-w-full max-h-[500px] rounded-md"
                  />
                </div>
              ) : selectedDoc.extracted_text ? (
                <div className="p-4">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedDoc.extracted_text}
                  </p>
                </div>
              ) : !selectedDoc.file_path ? (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground italic">
                    This document was created from questionnaire input (no file uploaded).
                  </p>
                  {selectedDoc.extracted_text && (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed mt-2">
                      {selectedDoc.extracted_text}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm">Unable to preview this file type. Use download button.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Select a document to preview</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function OrgDetailClient({
  organization,
  profiles,
  grants,
  proposals,
  workflowExecutions,
  activityLog,
  documents,
}: OrgDetailClientProps) {
  const [loading, setLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const owner = profiles.find((p) => p.role === "owner") || profiles[0];

  const grantsData = useMemo(() => groupByMonth(grants), [grants]);
  const proposalsData = useMemo(() => groupByMonth(proposals), [proposals]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of grants) {
      const stage = g.stage || "unknown";
      counts[stage] = (counts[stage] || 0) + 1;
    }
    return Object.entries(counts).map(([stage, count]) => ({ stage, count }));
  }, [grants]);

  const proposalStatusCounts = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0, other: 0 };
    for (const p of proposals) {
      const s = p.status || "other";
      if (s in counts) counts[s as keyof typeof counts]++;
      else counts.other++;
    }
    return counts;
  }, [proposals]);

  const avgQualityScore = useMemo(() => {
    const scored = proposals.filter((p) => p.quality_score != null);
    if (scored.length === 0) return null;
    return (
      scored.reduce((sum, p) => sum + (p.quality_score || 0), 0) / scored.length
    ).toFixed(1);
  }, [proposals]);

  const workflowStats = useMemo(() => {
    const counts = { running: 0, completed: 0, failed: 0 };
    for (const w of workflowExecutions) {
      const s = w.status || "running";
      if (s in counts) counts[s as keyof typeof counts]++;
    }
    const lastExecution = workflowExecutions[0]?.completed_at || workflowExecutions[0]?.created_at;
    return { ...counts, lastExecution };
  }, [workflowExecutions]);

  const stageChartConfig: ChartConfig = {
    count: { label: "Grants", color: "hsl(220, 70%, 50%)" },
  };

  async function handleApprove() {
    setLoading(true);
    await approveOrganization(organization.id);
    setLoading(false);
  }

  async function handleReject() {
    setLoading(true);
    await rejectOrganization(organization.id, rejectReason || undefined);
    setRejectDialogOpen(false);
    setLoading(false);
  }

  const orgFields = [
    { label: "Mission", value: organization.mission },
    { label: "Sector", value: organization.sector },
    { label: "EIN", value: organization.ein },
    { label: "Address", value: organization.address },
    { label: "Phone", value: organization.phone },
    { label: "Email", value: organization.email },
    { label: "Website", value: organization.website },
    { label: "Founding Year", value: organization.founding_year?.toString() },
    { label: "Geographic Focus", value: organization.geographic_focus?.join(", ") },
    { label: "Description", value: organization.description },
  ];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Organizations
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold">{organization.name}</h2>
            {statusBadge(organization.status)}
          </div>
          <div className="flex items-center gap-2">
            {owner && (
              <span className="text-sm text-muted-foreground">
                Registered{" "}
                {organization.created_at
                  ? new Date(organization.created_at).toLocaleDateString()
                  : ""}
                {owner.full_name && ` by ${owner.full_name}`}
                {owner.email && ` (${owner.email})`}
              </span>
            )}
            {organization.status === "pending" && (
              <div className="flex gap-2 ml-4">
                <Button
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                  onClick={handleApprove}
                  disabled={loading}
                >
                  {loading ? "..." : "Approve"}
                </Button>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={loading}
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
          {organization.status === "rejected" && organization.rejection_reason && (
            <p className="text-sm text-red-600">
              Reason: {organization.rejection_reason}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Organization Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Organization Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            {orgFields.map(
              (field) =>
                field.value && (
                  <div key={field.label}>
                    <p className="text-muted-foreground">{field.label}</p>
                    <p className="font-medium">{field.value}</p>
                  </div>
                )
            )}
          </div>
          {orgFields.every((f) => !f.value) && (
            <p className="text-sm text-muted-foreground">
              No profile details available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Documents Viewer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentViewer documents={documents} />
        </CardContent>
      </Card>

      {/* Usage Graphs */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Grants Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={grantsChartConfig} className="h-[200px] w-full">
              <BarChart data={grantsData}>
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Proposals Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={proposalsChartConfig} className="h-[200px] w-full">
              <BarChart data={proposalsData}>
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Grants Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Grants Overview ({grants.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stageCounts.length > 0 && (
            <ChartContainer config={stageChartConfig} className="h-[150px] w-full">
              <BarChart data={stageCounts} layout="vertical">
                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="stage" type="category" fontSize={12} tickLine={false} axisLine={false} width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          )}
          {grants.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Funder</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grants.slice(0, 10).map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.title}</TableCell>
                    <TableCell>{g.funder_name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{g.stage || "-"}</Badge>
                    </TableCell>
                    <TableCell>{g.amount || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {grants.length === 0 && (
            <p className="text-sm text-muted-foreground">No grants</p>
          )}
        </CardContent>
      </Card>

      {/* Proposals Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Proposals Summary ({proposals.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Avg Quality Score</p>
              <p className="text-lg font-semibold">
                {avgQualityScore || "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Pending</p>
              <p className="text-lg font-semibold text-amber-600">
                {proposalStatusCounts.pending}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Approved</p>
              <p className="text-lg font-semibold text-green-600">
                {proposalStatusCounts.approved}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Rejected</p>
              <p className="text-lg font-semibold text-red-600">
                {proposalStatusCounts.rejected}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Running</p>
              <p className="text-lg font-semibold text-blue-600">
                {workflowStats.running}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Completed</p>
              <p className="text-lg font-semibold text-green-600">
                {workflowStats.completed}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Failed</p>
              <p className="text-lg font-semibold text-red-600">
                {workflowStats.failed}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Execution</p>
              <p className="text-sm font-medium">
                {workflowStats.lastExecution
                  ? new Date(workflowStats.lastExecution).toLocaleString()
                  : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Team Members ({profiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                    No team members
                  </TableCell>
                </TableRow>
              ) : (
                profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.full_name || "-"}
                    </TableCell>
                    <TableCell>{p.email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.role || "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {activityLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate">{entry.action}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {entry.created_at
                      ? new Date(entry.created_at).toLocaleDateString()
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Organization</DialogTitle>
            <DialogDescription>
              Provide an optional reason for rejecting this organization.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading}
            >
              {loading ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
