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
import { ArrowLeft, FileText, Save, Trash2 } from "lucide-react"
import Link from "next/link"

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
          table: 'budgets',
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

  const handleFormSubmit = async (data: any) => {
    const { error } = await updateBudget(budget.id, {
      name: data.name,
      line_items: data.line_items,
    })

    if (error) {
      toast.error(error)
      return
    }

    toast.success("Budget updated successfully")

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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/budgets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{budget.name}</h1>
            {grant && (
              <p className="text-sm text-muted-foreground">
                Grant: {grant.title}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateNarrative}
            disabled={!!workflowId && workflowStatus === 'running'}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Narrative
          </Button>
          <Button
            variant="outline"
            onClick={() => setTemplateDialogOpen(true)}
          >
            <Save className="h-4 w-4 mr-2" />
            Save as Template
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Workflow Progress */}
      {workflowId && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Narrative generation:</span>
          <WorkflowProgress
            workflowId={workflowId}
            workflowName="Generating narrative"
            initialStatus={workflowStatus}
          />
        </div>
      )}

      {/* Budget Form */}
      <Card className="p-6">
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
      </Card>

      {/* Narrative Display */}
      <Card className="p-6">
        <h2 className="text-lg font-medium mb-4">Budget Narrative</h2>
        {budget.narrative ? (
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {budget.narrative}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No narrative generated yet. Click "Generate Narrative" to create one.
          </div>
        )}
      </Card>

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this budget? This action cannot be undone.
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
