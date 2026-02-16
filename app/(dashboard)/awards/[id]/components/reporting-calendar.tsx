"use client"

import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { parseISO, isSameDay, isBefore } from "date-fns"
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react"

interface Report {
  id: string
  title: string
  report_type: 'interim' | 'final'
  due_date: string
  status: string
  submitted_at: string | null
}

interface ReportingCalendarProps {
  reports: Report[]
  onSelectReport: (reportId: string) => void
}

export function ReportingCalendar({ reports, onSelectReport }: ReportingCalendarProps) {
  const today = new Date()

  // Extract dates and categorize reports
  const deadlineDates = reports.map(r => parseISO(r.due_date))
  const overdueDates = reports
    .filter(r => (r.status === 'draft' || r.status === 'pending') && isBefore(parseISO(r.due_date), today))
    .map(r => parseISO(r.due_date))
  const completedDates = reports
    .filter(r => r.status === 'submitted')
    .map(r => parseISO(r.due_date))

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return

    // Find report on this date
    const report = reports.find(r => isSameDay(parseISO(r.due_date), date))
    if (report) {
      onSelectReport(report.id)
    }
  }

  const getStatusIcon = (report: Report) => {
    if (report.status === 'submitted') {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    }
    if ((report.status === 'draft' || report.status === 'pending') && isBefore(parseISO(report.due_date), today)) {
      return <AlertTriangle className="h-4 w-4 text-destructive" />
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <div className="space-y-4">
      <Calendar
        mode="single"
        onSelect={handleDateSelect}
        modifiers={{
          deadline: deadlineDates,
          overdue: overdueDates,
          completed: completedDates,
        }}
        modifiersStyles={{
          deadline: {
            fontWeight: 'bold',
            textDecoration: 'underline',
          },
          overdue: {
            backgroundColor: 'hsl(var(--destructive))',
            color: 'white',
            fontWeight: 'bold',
          },
          completed: {
            backgroundColor: 'hsl(142.1 76.2% 36.3%)',
            color: 'white',
            fontWeight: 'bold',
          },
        }}
      />

      {/* Report list below calendar */}
      <div className="space-y-2">
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No reports yet. Add a report above.
          </p>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectReport(report.id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getStatusIcon(report)}
                <span className="text-sm truncate">{report.title}</span>
              </div>
              <Badge
                variant={report.report_type === 'final' ? 'destructive' : 'secondary'}
                className="ml-2 flex-shrink-0"
              >
                {report.report_type}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
