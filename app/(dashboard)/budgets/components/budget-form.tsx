"use client"

import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2, Plus } from "lucide-react"
import { TemplateSelector } from "./template-selector"
import { useState } from "react"

// Budget category enum values
const budgetCategories = [
  "personnel",
  "fringe",
  "travel",
  "equipment",
  "supplies",
  "contractual",
  "other",
  "indirect",
] as const

// Zod schemas
const lineItemSchema = z.object({
  category: z.enum(budgetCategories, {
    message: "Category is required",
  }),
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0, "Amount must be 0 or greater"),
  justification: z.string().optional(),
})

const budgetSchema = z.object({
  grant_id: z.string().uuid("Invalid grant ID"),
  name: z.string().min(1, "Budget name is required"),
  line_items: z.array(lineItemSchema).min(1, "At least one line item is required"),
})

type BudgetFormData = z.infer<typeof budgetSchema>
type LineItemData = z.infer<typeof lineItemSchema>

interface Template {
  id: string
  name: string
}

interface BudgetFormProps {
  grantId?: string
  defaultValues?: {
    name: string
    lineItems: Array<{
      category: string
      description: string
      amount: number
      justification?: string | null
    }>
  }
  templates?: Template[]
  onSubmit: (data: BudgetFormData) => Promise<void>
  isEdit?: boolean
}

export function BudgetForm({
  grantId,
  defaultValues,
  templates = [],
  onSubmit,
  isEdit = false,
}: BudgetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: defaultValues
      ? {
          grant_id: grantId || "",
          name: defaultValues.name,
          line_items: defaultValues.lineItems.map((item) => ({
            category: item.category as (typeof budgetCategories)[number],
            description: item.description,
            amount: item.amount,
            justification: item.justification || "",
          })),
        }
      : {
          grant_id: grantId || "",
          name: "",
          line_items: [
            {
              category: "personnel" as (typeof budgetCategories)[number],
              description: "",
              amount: 0,
              justification: "",
            },
          ],
        },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "line_items",
  })

  // Use useWatch for reactive total calculation (NOT watch() in useEffect)
  const lineItems = useWatch({
    control: form.control,
    name: "line_items",
  })

  const total = lineItems?.reduce((sum, item) => {
    const amount = typeof item?.amount === "number" ? item.amount : 0
    return sum + amount
  }, 0) || 0

  const handleSubmit = async (data: BudgetFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Budget Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Budget Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., FY 2024 Project Budget" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Template Selector (only in create mode) */}
        {!isEdit && templates.length > 0 && (
          <TemplateSelector templates={templates} form={form} />
        )}

        {/* Line Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Line Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  category: "personnel",
                  description: "",
                  amount: 0,
                  justification: "",
                })
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Line Item
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-12 gap-4 p-4 border rounded-lg"
              >
                {/* Category */}
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name={`line_items.${index}.category`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="personnel">Personnel</SelectItem>
                            <SelectItem value="fringe">Fringe Benefits</SelectItem>
                            <SelectItem value="travel">Travel</SelectItem>
                            <SelectItem value="equipment">Equipment</SelectItem>
                            <SelectItem value="supplies">Supplies</SelectItem>
                            <SelectItem value="contractual">Contractual</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="indirect">Indirect Costs</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <div className="col-span-4">
                  <FormField
                    control={form.control}
                    name={`line_items.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Item description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Amount */}
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`line_items.${index}.amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Justification */}
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`line_items.${index}.justification`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Justification</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Remove Button */}
                <div className="col-span-1 flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">${total.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : isEdit
                ? "Save Changes"
                : "Create Budget"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
