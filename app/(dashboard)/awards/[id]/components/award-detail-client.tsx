"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { format, parseISO } from "date-fns"
import { ArrowLeft, Plus, Sparkles, Trash2, CalendarIcon } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils/analytics"
import { deleteAward } from "../../actions"
import { createReport, triggerReportGeneration } from "../../reports-actions"
import { ReportingCalendar } from "./reporting-calendar"
import { ReportList } from "./report-list"
import { ReportEditor } from "./report-editor"
import { WorkflowProgress } from "@/app/(dashboard)/pipeline/[id]/components/workflow-progress"

interface Award {
  id: string
  amount: number
  award_date: string | null
  start_date: string
  end_date: string
  requirements: string | null
}

interface Report {
  id: string
  title: string
  report_type: 'interim' | 'final'
  due_date: string
  status: string
  content: string | null
  submitted_at: string | null
}

interface Grant {
  id: string
  title: string
  funder_name: string | null
}

interface AwardDetailClientProps {
  award: Award
  reports: Report[]
  grant: Grant | null
}

export function AwardDetailClient({
  award,
  reports: initialReports,
  grant,
}: AwardDetailClientProps) {
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [addReportDialogOpen, setAddReportDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [workflowId, setWorkflowId] = useState<string | null>(null)
  const [workflowStatus, setWorkflowStatus] = useState<'pending' | 'running' | 'completed' | 'failed'>('pending')

  // Add Report form state
  const [newReportType, setNewReportType] = useState<'interim' | 'final'>('interim')
  const [newReportTitle, setNewReportTitle] = useState("")
  const [newReportDueDate, setNewReportDueDate] = useState<Date>()

  // Generate Report state
  const [selectedReportForGeneration, setSelectedReportForGeneration] = useState("")

  const router = useRouter()

  // Realtime subscriptions on awards and reports tables
  useEffect(() => {
    const supabase = createClient()

    const awardsChannel = supabase
      .channel(`award-${award.id}`)
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'awards',
          filter: `id=eq.${award.id}`,
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    const reportsChannel = supabase
      .channel(`reports-${award.id}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
          filter: `award_id=eq.${award.id}`,
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(awardsChannel)
      supabase.removeChannel(reportsChannel)
    }
  }, [award.id, router])

  // Update reports when initialReports changes (after router.refresh())
  useEffect(() => {
    setReports(initialReports)
  }, [initialReports])

  const handleAddReport = async () => {
    if (!newReportTitle.trim()) {
      toast.error("Report title is required")
      return
    }
    if (!newReportDueDate) {
      toast.error("Due date is required")
      return
    }
    if (!grant) {
      toast.error("Grant information not found")
      return
    }

    const result = await createReport({
      award_id: award.id,
      grant_id: grant.id,
      report_type: newReportType,
      title: newReportTitle,
      due_date: newReportDueDate.toISOString(),
    })

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success("Report created successfully")
    setAddReportDialogOpen(false)
    setNewReportTitle("")
    setNewReportDueDate(undefined)
    setNewReportType('interim')
    router.refresh()
  }

  const handleGenerateReport = async () => {
    if (!selectedReportForGeneration) {
      toast.error("Select a report to generate")
      return
    }

    const result = await triggerReportGeneration(award.id, selectedReportForGeneration)

    if (result.error) {
      toast.error(result.error)
      return
    }

    if (result.workflowId) {
      setWorkflowId(result.workflowId)
      setWorkflowStatus('running')
      toast.success("AI is generating your report")
    }
  }

  const handleDelete = async () => {
    const { error } = await deleteAward(award.id)

    if (error) {
      toast.error(error)
      return
    }

    toast.success("Award deleted")
    router.push("/awards")
  }

  const selectedReport = reports.find(r => r.id === selectedReportId)
  const draftReports = reports.filter(r => r.status === 'draft')

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/awards">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{grant?.title || "Award"}</h1>
            <p className="text-sm text-muted-foreground">
              {grant?.funder_name || "N/A"}
            </p>
          </div>
        </div>

        {/* Delete Button */}
        <Button
          variant="destructive"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Award
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Award Info Card */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4">Award Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Amount:</span>
                <p className="font-medium text-lg">{formatCurrency(award.amount)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Award Date:</span>
                <p className="font-medium">
                  {award.award_date ? format(parseISO(award.award_date), 'MMM d, yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Period:</span>
                <p className="font-medium">
                  {format(parseISO(award.start_date), 'MMM yyyy')} - {format(parseISO(award.end_date), 'MMM yyyy')}
                </p>
              </div>
            </div>
            {award.requirements && (
              <div className="mt-4">
                <span className="text-sm text-muted-foreground">Requirements:</span>
                <p className="mt-1 text-sm whitespace-pre-wrap">{award.requirements}</p>
              </div>
            )}
          </Card>

          {/* Report List */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4">Reports</h2>
            <ReportList
              reports={reports}
              selectedReportId={selectedReportId}
              onSelectReport={setSelectedReportId}
            />
          </Card>

          {/* Report Editor (if a report is selected) */}
          {selectedReport && (
            <Card className="p-6">
              <ReportEditor report={selectedReport} />
            </Card>
          )}
        </div>

        {/* Right column (col-span-1) */}
        <div className="space-y-6">
          {/* Reporting Calendar */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4">Reporting Calendar</h2>
            <ReportingCalendar
              reports={reports}
              onSelectReport={setSelectedReportId}
            />
          </Card>

          {/* Actions */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4">Actions</h2>
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => setAddReportDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Report
              </Button>

              <div className="space-y-2">
                <Label>Generate Report</Label>
                <Select
                  value={selectedReportForGeneration}
                  onValueChange={setSelectedReportForGeneration}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a draft report" />
                  </SelectTrigger>
                  <SelectContent>
                    {draftReports.map((report) => (
                      <SelectItem key={report.id} value={report.id}>
                        {report.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleGenerateReport}
                  disabled={!selectedReportForGeneration || (!!workflowId && workflowStatus === 'running')}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate with AI
                </Button>
              </div>

              {/* Workflow Progress */}
              {workflowId && (
                <div className="pt-2">
                  <WorkflowProgress
                    workflowId={workflowId}
                    workflowName="Generating report"
                    initialStatus={workflowStatus}
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Add Report Dialog */}
      <Dialog open={addReportDialogOpen} onOpenChange={setAddReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Report</DialogTitle>
            <DialogDescription>
              Create a new report record for this award
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select
                value={newReportType}
                onValueChange={(value: 'interim' | 'final') => setNewReportType(value)}
              >
                <SelectTrigger id="report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interim">Interim Report</SelectItem>
                  <SelectItem value="final">Final Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-title">Title</Label>
              <Input
                id="report-title"
                placeholder="e.g., Q1 Progress Report"
                value={newReportTitle}
                onChange={(e) => setNewReportTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !newReportDueDate && "text-muted-foreground"
                    )}
                  >
                    {newReportDueDate ? (
                      format(newReportDueDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newReportDueDate}
                    onSelect={setNewReportDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddReportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddReport}>
              Create Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Award</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this award? This action cannot be undone and will also delete all associated reports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
