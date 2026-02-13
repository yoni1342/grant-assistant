'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { triggerAICustomization } from '../actions'
import { Sparkles } from 'lucide-react'

interface AICustomizeButtonProps {
  narrativeId: string
  grants: { id: string; title: string }[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AICustomizeButton({ narrativeId, grants, open, onOpenChange }: AICustomizeButtonProps) {
  const [selectedGrantId, setSelectedGrantId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleCustomize = async () => {
    if (!selectedGrantId) {
      setError('Please select a grant')
      return
    }

    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        await triggerAICustomization(narrativeId, selectedGrantId)
        setSuccess(true)
        // Close dialog after a brief success message
        setTimeout(() => {
          onOpenChange(false)
          setSuccess(false)
          setSelectedGrantId('')
        }, 1500)
      } catch (err) {
        setError('Failed to trigger AI customization. Please try again.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Customize Narrative
          </DialogTitle>
          <DialogDescription>
            Customize this narrative for a specific grant or funder using AI. The customized version will update in your library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="grant">Select Grant</Label>
            <Select value={selectedGrantId} onValueChange={setSelectedGrantId}>
              <SelectTrigger id="grant">
                <SelectValue placeholder="Choose a grant to customize for..." />
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

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI customization started! The narrative will update when complete.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleCustomize} disabled={isPending || grants.length === 0}>
            {isPending ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Triggering...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Customize
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
