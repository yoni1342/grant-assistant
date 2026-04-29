"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ProposalSections,
  type ProposalSectionsHandle,
} from "@/app/(dashboard)/proposals/[id]/components/proposal-sections";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  proposal: any;
  sections: any[];
  grant: any;
  orgId: string;
  orgName: string;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function AdminProposalDetailClient({
  proposal,
  sections,
  grant,
  orgId,
  orgName,
}: Props) {
  const sectionsRef = useRef<ProposalSectionsHandle>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<"pdf" | "docx" | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportPdf = useCallback(async () => {
    if (!sectionsRef.current) return;
    setIsExporting(true);
    setExportType("pdf");
    setShowExportMenu(false);
    try {
      await sectionsRef.current.exportPdf();
      toast.success("PDF exported successfully");
    } catch {
      toast.error("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  }, []);

  const handleExportDocx = useCallback(async () => {
    if (!sectionsRef.current) return;
    setIsExporting(true);
    setExportType("docx");
    setShowExportMenu(false);
    try {
      await sectionsRef.current.exportDocx();
      toast.success("Word document exported successfully");
    } catch {
      toast.error("Failed to export Word document. Please try again.");
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  }, []);

  const statusVariant = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary" as const;
      case "generating":
      case "ready":
      case "submitted":
        return "default" as const;
      default:
        return "secondary" as const;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href={`/admin/organizations/${orgId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {orgName}
          </Button>
        </Link>
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-3xl font-bold">
            {proposal.title || "Untitled Proposal"}
          </h1>
          <Badge variant={statusVariant(proposal.status)}>
            {proposal.status || "draft"}
          </Badge>
          {proposal.quality_score != null && (
            <Badge
              variant={
                proposal.quality_score >= 80
                  ? "default"
                  : proposal.quality_score >= 60
                    ? "secondary"
                    : "destructive"
              }
            >
              Quality: {proposal.quality_score}%
            </Badge>
          )}
          <Badge variant="outline" className="ml-1">
            Admin · read-only
          </Badge>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-muted-foreground">
            For: {grant?.title || "Unknown Grant"}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isExporting || sections.length === 0}
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isExporting
                  ? exportType === "docx"
                    ? "Exporting Word..."
                    : "Exporting PDF..."
                  : "Export"}
                <ChevronDown className="h-3 w-3" />
              </Button>
              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[160px]">
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={handleExportPdf}
                    >
                      <Download className="h-4 w-4" />
                      Export as PDF
                    </button>
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={handleExportDocx}
                    >
                      <FileText className="h-4 w-4" />
                      Export as Word
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">
        <ProposalSections
          ref={sectionsRef}
          sections={sections}
          proposalId={proposal.id}
          proposalTitle={proposal.title}
        />
      </div>
    </div>
  );
}
