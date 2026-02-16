"use client"

import { Badge } from "@/components/ui/badge"
import { format, parseISO, isBefore } from "date-fns"
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Report {
  id: string
  title: string
  report_type: 'interim' | 'final'
  due_date: string
  status: string
  submitted_at: string | null
}

interface ReportListProps {
  reports: Report[]
  selectedReportId: string | null
  onSelectReport: (reportId: string) => void
}

export function ReportList({ reports, selectedReportId, onSelectReport }: ReportListProps) {
  const today = new Date()

  const getStatusBadge = (report: Report) => {
    if (report.status === 'submitted') {
      return (
        <Badge className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Submitted
        </Badge>
      )
    }
    if ((report.status === 'draft' || report.status === 'pending') && isBefore(parseISO(report.due_date), today)) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      )
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Draft
      </Badge>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No reports yet. Add a report above.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => (
        <div
          key={report.id}
          className={cn(
            "p-4 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
            selectedReportId === report.id && "ring-2 ring-primary"
          )}
          onClick={() => onSelectReport(report.id)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{report.title}</h3>
                <Badge
                  variant={report.report_type === 'final' ? 'destructive' : 'secondary'}
                  className="flex-shrink-0"
                >
                  {report.report_type}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Due: {format(parseISO(report.due_date), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="flex-shrink-0">
              {getStatusBadge(report)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
