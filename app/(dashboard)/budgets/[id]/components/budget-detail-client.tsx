"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { BudgetForm } from "../../components/budget-form"
import { WorkflowProgress } from "@/app/(dashboard)/pipeline/[id]/components/workflow-progress"
import {
  updateBudget,
  deleteBudget,
  saveBudgetAsTemplate,
  triggerBudgetNarrative,
} from "../../actions"
import {
  ArrowLeft,
  FileText,
  Save,
  Trash2,
  Pencil,
  ExternalLink,
  DollarSign,
} from "lucide-react"

interface Budget {
  id: string
  name: string
  narrative: string | null
  total_amount: number | null
  created_at: string | null
  updated_at: string | null
}

interface LineItem {
  id: string
  category: string | null
  description: string
  amount: number
  justification: string | null
  sort_order: number | null
}

interface Grant {
  id: string
  title: string
  deadline: string | null
  funder_name: string | null
  amount: number | null
}

interface BudgetDetailClientProps {
  budget: Budget
  lineItems: LineItem[]
  grant: Grant | null
}

const categoryLabels: Record<string, string> = {
  personnel: "Personnel",
  fringe: "Fringe Benefits",
  travel: "Travel",
  equipment: "Equipment",
  supplies: "Supplies",
  contractual: "Contractual",
  other: "Other",
  indirect: "Indirect Costs",
}

function BudgetViewer({ budget, lineItems }: { budget: Budget; lineItems: LineItem[] }) {
  const total = lineItems.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="h-full flex flex-col gap-6 overflow-auto">
      {/* Line Items Table */}
      <div className="rounded-lg border">
        <div className="bg-muted/50 px-4 py-3 border-b">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Budget Line Items
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Description</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Justification</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No line items yet
                  </td>
                </tr>
              ) : (
                lineItems.map((item, index) => (
                  <tr key={item.id} className={index < lineItems.length - 1 ? "border-b" : ""}>
                    <td className="px-4 py-3">
                      <Badge variant="outline">
                        {categoryLabels[item.category || "other"] || item.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{item.description}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      ${item.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.justification || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {lineItems.length > 0 && (
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td className="px-4 py-3" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-right font-mono">
                    ${total.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Narrative Section */}
      <div className="rounded-lg border">
        <div className="bg-muted/50 px-4 py-3 border-b">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Budget Narrative
          </h3>
        </div>
        <div className="p-4">
          {budget.narrative ? (
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {budget.narrative}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No narrative generated yet. Click &ldquo;Generate Narrative&rdquo; to create one.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function BudgetDetailClient({
  budget,
  lineItems,
  grant,
}: BudgetDetailClientProps) {
  const [workflowId, setWorkflowId] = useState<string | null>(null)
  const [workflowStatus, setWorkflowStatus] = useState<'pending' | 'running' | 'completed' | 'failed'>('pending')
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const router = useRouter()

  // Realtime subscription for budget updates (narrative generation)
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`budget-${budget.id}`)
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: `id=eq.${budget.id}`,
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [budget.id, router])

  const handleFormSubmit = async (data: { name?: string; line_items?: { category: string; description: string; amount: number; justification?: string }[] }) => {
    const { error } = await updateBudget(budget.id, {
      name: data.name,
      line_items: data.line_items,
    })

    if (error) {
      toast.error(error)
      return
    }

    toast.success("Budget updated successfully")
    setEditDialogOpen(false)
    router.refresh()
  }

  const handleGenerateNarrative = async () => {
    const result = await triggerBudgetNarrative(budget.id)

    if (result.error) {
      toast.error(result.error)
      return
    }

    if (result.workflowId) {
      setWorkflowId(result.workflowId)
      setWorkflowStatus('running')
      toast.success("AI is generating your budget narrative")
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Template name is required")
      return
    }

    const { error } = await saveBudgetAsTemplate(budget.id, templateName)

    if (error) {
      toast.error(error)
      return
    }

    toast.success("Budget saved as template")
    setTemplateDialogOpen(false)
    setTemplateName("")
  }

  const handleDelete = async () => {
    const { error } = await deleteBudget(budget.id)

    if (error) {
      toast.error(error)
      return
    }

    toast.success("Budget deleted")
    router.push("/budgets")
  }

  const total = lineItems.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/budgets")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <DollarSign className="h-5 w-5 text-green-500" />
          <h1 className="text-xl font-semibold truncate">{budget.name}</h1>
        </div>
      </div>

      {/* Workflow Progress */}
      {workflowId && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Narrative generation:</span>
          <WorkflowProgress
            workflowId={workflowId}
            workflowName="Generating narrative"
            initialStatus={workflowStatus}
          />
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Left: Budget Viewer (2/3) */}
        <div className="lg:col-span-2 min-h-[500px]">
          <BudgetViewer budget={budget} lineItems={lineItems} />
        </div>

        {/* Right: Metadata Sidebar (1/3) */}
        <div className="space-y-6">
          <div className="rounded-lg border p-4 space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Details</h2>

            {/* Total Amount */}
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-lg font-bold mt-1">${total.toLocaleString()}</p>
            </div>

            {/* Line Items Count */}
            <div>
              <p className="text-sm text-muted-foreground">Line Items</p>
              <p className="text-sm mt-1">{lineItems.length} item{lineItems.length !== 1 ? "s" : ""}</p>
            </div>

            {/* Narrative Status */}
            <div>
              <p className="text-sm text-muted-foreground">Narrative</p>
              <Badge variant={budget.narrative ? "default" : "secondary"} className="mt-1">
                {budget.narrative ? "Generated" : "Pending"}
              </Badge>
            </div>

            {/* Linked Grant */}
            {grant && (
              <div>
                <p className="text-sm text-muted-foreground">Linked Grant</p>
                <Link
                  href={`/pipeline/${grant.id}`}
                  className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  {grant.title}
                  <ExternalLink className="h-3 w-3" />
                </Link>
                {grant.funder_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">{grant.funder_name}</p>
                )}
              </div>
            )}

            {/* Created Date */}
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-sm mt-1">
                {budget.created_at
                  ? new Date(budget.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Unknown"}
              </p>
            </div>

            {/* Updated Date */}
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="text-sm mt-1">
                {budget.updated_at
                  ? new Date(budget.updated_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Unknown"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Budget
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleGenerateNarrative}
              disabled={!!workflowId && workflowStatus === 'running'}
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Narrative
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setTemplateDialogOpen(true)}
            >
              <Save className="mr-2 h-4 w-4" />
              Save as Template
            </Button>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Budget
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Budget</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &ldquo;{budget.name}&rdquo;? This action cannot be undone.
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
        </div>
      </div>

      {/* Edit Budget Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
            <DialogDescription>
              Update budget name and line items
            </DialogDescription>
          </DialogHeader>
          <BudgetForm
            grantId={grant?.id}
            defaultValues={{
              name: budget.name,
              lineItems: lineItems.map((item) => ({
                category: item.category || "other",
                description: item.description,
                amount: item.amount,
                justification: item.justification,
              })),
            }}
            onSubmit={handleFormSubmit}
            isEdit={true}
          />
        </DialogContent>
      </Dialog>

      {/* Save as Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save this budget structure as a reusable template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., Standard Project Budget"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTemplateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveAsTemplate}>
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
