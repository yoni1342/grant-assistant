"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Zap } from "lucide-react"

export function GrantUsageCard() {
  const [usage, setUsage] = useState<{ used: number; limit: number | null; plan: string } | null>(null)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch("/api/grants/usage")
        if (res.ok) setUsage(await res.json())
      } catch { /* silent */ }
    }
    fetchUsage()
  }, [])

  if (!usage || usage.limit === null) return null

  const atLimit = usage.used >= usage.limit
  const pct = Math.min((usage.used / usage.limit) * 100, 100)

  return (
    <Card className={atLimit ? "border-red-500/50" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Daily Grants</CardTitle>
        <Zap className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {usage.used}
          <span className="text-sm font-normal text-muted-foreground">/{usage.limit}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
          <div
            className={`h-1.5 rounded-full transition-all ${
              atLimit
                ? "bg-red-500"
                : usage.used >= usage.limit - 1
                  ? "bg-amber-500"
                  : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {atLimit ? (
          <a href="/billing" className="block mt-3">
            <Button size="sm" variant="outline" className="w-full gap-1 text-xs">
              <ArrowUpRight className="h-3 w-3" />
              Upgrade for Unlimited
            </Button>
          </a>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">
            {usage.limit - usage.used} grant{usage.limit - usage.used === 1 ? "" : "s"} remaining today
          </p>
        )}
      </CardContent>
    </Card>
  )
}
