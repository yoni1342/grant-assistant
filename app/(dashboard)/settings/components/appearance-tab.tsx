"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updatePreferences } from "../actions"

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Phoenix",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
]

const DATE_FORMATS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
] as const

function formatPreview(format: string) {
  const now = new Date()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const y = now.getFullYear()
  switch (format) {
    case "DD/MM/YYYY": return `${d}/${m}/${y}`
    case "YYYY-MM-DD": return `${y}-${m}-${d}`
    default: return `${m}/${d}/${y}`
  }
}

interface AppearanceTabProps {
  preferences: Record<string, string>
}

export function AppearanceTab({ preferences }: AppearanceTabProps) {
  const { theme, setTheme } = useTheme()
  const [timezone, setTimezone] = useState(
    preferences.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [dateFormat, setDateFormat] = useState(
    preferences.date_format || "MM/DD/YYYY"
  )

  async function handleThemeChange(value: string) {
    setTheme(value)
    const result = await updatePreferences({ theme: value as "light" | "dark" | "system" })
    if (result.error) {
      toast.error(result.error)
    }
  }

  async function handleTimezoneChange(value: string) {
    setTimezone(value)
    const result = await updatePreferences({ timezone: value })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Timezone updated")
    }
  }

  async function handleDateFormatChange(value: string) {
    setDateFormat(value)
    const result = await updatePreferences({
      date_format: value as "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD",
    })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Date format updated")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize how the application looks and displays information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Theme</Label>
            <p className="text-sm text-muted-foreground">
              Select your preferred color scheme.
            </p>
          </div>
          <Select value={theme || "system"} onValueChange={handleThemeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timezone */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Timezone</Label>
            <p className="text-sm text-muted-foreground">
              Used for displaying dates and deadlines.
            </p>
          </div>
          <Select value={timezone} onValueChange={handleTimezoneChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Format */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Date Format</Label>
            <p className="text-sm text-muted-foreground">
              Preview: {formatPreview(dateFormat)}
            </p>
          </div>
          <Select value={dateFormat} onValueChange={handleDateFormatChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
