"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { BudgetForm } from "../components/budget-form"
import { createBudget } from "../actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Grant {
  id: string
  title: string
}

interface Template {
  id: string
  name: string
}

interface NewBudgetClientProps {
  grants: Grant[]
  templates: Template[]
}

export function NewBudgetClient({ grants, templates }: NewBudgetClientProps) {
  const [selectedGrantId, setSelectedGrantId] = useState<string>("")
  const router = useRouter()

  const handleSubmit = async (data: any) => {
    if (!selectedGrantId) {
      toast.error("Please select a grant")
      return
    }

    const { data: budget, error } = await createBudget({
      grant_id: selectedGrantId,
      name: data.name,
      line_items: data.line_items,
    })

    if (error) {
      toast.error(error)
      return
    }

    toast.success("Budget created successfully")

    router.push("/budgets")
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/budgets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">New Budget</h1>
      </div>

      {/* Grant Selector */}
      <div className="space-y-2">
        <Label>Grant</Label>
        <Select onValueChange={setSelectedGrantId} value={selectedGrantId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a grant for this budget" />
          </SelectTrigger>
          <SelectContent>
            {grants.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">
                No grants available
              </div>
            ) : (
              grants.map((grant) => (
                <SelectItem key={grant.id} value={grant.id}>
                  {grant.title}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Budget Form */}
      {selectedGrantId && (
        <BudgetForm
          grantId={selectedGrantId}
          templates={templates}
          onSubmit={handleSubmit}
          isEdit={false}
        />
      )}

      {!selectedGrantId && (
        <div className="text-center py-12 text-muted-foreground">
          Select a grant to start creating a budget
        </div>
      )}
    </div>
  )
}
