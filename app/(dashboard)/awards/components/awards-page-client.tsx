"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { AwardTable, Award } from "./award-table"

interface AwardsPageClientProps {
  initialAwards: Award[]
}

export function AwardsPageClient({ initialAwards }: AwardsPageClientProps) {
  const [awards, setAwards] = useState<Award[]>(initialAwards)
  const router = useRouter()

  // Realtime subscription for live updates
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('award-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'awards' },
        () => {
          // Refresh server data on any change
          router.refresh()
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'awards' },
        () => {
          router.refresh()
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'awards' },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  // Update awards when initialAwards changes (after router.refresh())
  useEffect(() => {
    setAwards(initialAwards)
  }, [initialAwards])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Awards</h1>
        <Button asChild>
          <Link href="/awards/new">
            <Plus className="h-4 w-4 mr-2" />
            Record Award
          </Link>
        </Button>
      </div>

      {/* Table */}
      <AwardTable initialData={awards} />
    </div>
  )
}
