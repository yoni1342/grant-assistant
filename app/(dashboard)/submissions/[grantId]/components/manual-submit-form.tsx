"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { logManualSubmission } from '@/app/(dashboard)/submissions/actions'
import { FileCheck, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const manualSubmissionSchema = z.object({
  confirmation_number: z.string().min(1, 'Confirmation number required'),
  submitted_at: z.string().min(1, 'Submission date/time required'),
  notes: z.string().optional(),
})

type ManualSubmissionFormData = z.infer<typeof manualSubmissionSchema>

interface ManualSubmitFormProps {
  grantId: string
}

export function ManualSubmitForm({ grantId }: ManualSubmitFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ManualSubmissionFormData>({
    resolver: zodResolver(manualSubmissionSchema),
    defaultValues: {
      confirmation_number: '',
      submitted_at: new Date().toISOString().slice(0, 16), // Default to current date/time in datetime-local format
      notes: '',
    },
  })

  const onSubmit = async (data: ManualSubmissionFormData) => {
    setIsSubmitting(true)

    const result = await logManualSubmission(grantId, data)

    if (result.error) {
      console.error('Error logging manual submission:', result.error)
      setIsSubmitting(false)
      return
    }

    // Success - reset form and close
    form.reset({
      confirmation_number: '',
      submitted_at: new Date().toISOString().slice(0, 16),
      notes: '',
    })
    setIsSubmitting(false)
    setIsOpen(false)
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <FileCheck className="h-4 w-4" />
          <span className="font-medium text-sm">Log Manual Submission</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="confirmation_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmation Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., GRANT-2026-12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="submitted_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Submission Date/Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about the submission..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging Submission...
                </>
              ) : (
                <>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Log Submission
                </>
              )}
            </Button>
          </form>
        </Form>
      </CollapsibleContent>
    </Collapsible>
  )
}
