"use client"

import { useState } from "react"
import { UseFormReturn } from "react-hook-form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { loadBudgetTemplate } from "../actions"
import { toast } from "sonner"

interface Template {
  id: string
  name: string
}

interface TemplateSelectorProps {
  templates: Template[]
  form: UseFormReturn<any>
}

export function TemplateSelector({ templates, form }: TemplateSelectorProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleTemplateSelect = async (templateId: string) => {
    if (!templateId) return

    setIsLoading(true)
    try {
      const { data, error } = await loadBudgetTemplate(templateId)

      if (error || !data) {
        toast.error(error || "Failed to load template")
        return
      }

      // Populate form with template data
      form.reset({
        grant_id: form.getValues("grant_id"), // Preserve grant_id
        name: `${data.name} (Copy)`,
        line_items: data.lineItems.map((item) => ({
          category: item.category,
          description: item.description,
          amount: item.amount,
          justification: item.justification || "",
        })),
      })

      toast.success(`${data.name} has been loaded into the form`)
    } catch (err) {
      toast.error("Failed to load template")
    } finally {
      setIsLoading(false)
    }
  }

  if (templates.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <Label>Load from Template</Label>
      <Select onValueChange={handleTemplateSelect} disabled={isLoading}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a template..." />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Load a saved budget template to pre-populate line items
      </p>
    </div>
  )
}
