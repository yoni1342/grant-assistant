"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { BudgetTable, Budget } from "./budget-table"

interface BudgetPageClientProps {
  initialBudgets: Budget[]
}

export function BudgetPageClient({ initialBudgets }: BudgetPageClientProps) {
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets)
  const router = useRouter()

  // Realtime subscription for live updates
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('budget-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'budgets' },
        () => {
          // Refresh server data on any change
          router.refresh()
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'budgets' },
        () => {
          router.refresh()
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'budgets' },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  // Update budgets when initialBudgets changes (after router.refresh())
  useEffect(() => {
    setBudgets(initialBudgets)
  }, [initialBudgets])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Budgets</h1>
        <Button asChild>
          <Link href="/budgets/new">
            <Plus className="h-4 w-4 mr-2" />
            New Budget
          </Link>
        </Button>
      </div>

      {/* Table */}
      <BudgetTable initialData={budgets} />
    </div>
  )
}
