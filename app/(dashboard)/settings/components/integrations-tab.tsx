"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { testWebhookConnection } from "../actions"
import type { Tables } from "@/lib/supabase/database.types"

type WorkflowExecution = Tables<"workflow_executions">

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  running: "secondary",
  pending: "outline",
  failed: "destructive",
}

interface IntegrationsTabProps {
  workflows: WorkflowExecution[]
}

export function IntegrationsTab({ workflows }: IntegrationsTabProps) {
  const router = useRouter()
  const [testing, setTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean
    latency: number
    error?: string | null
  } | null>(null)

  async function handleTestConnection() {
    setTesting(true)
    const result = await testWebhookConnection()
    setTesting(false)
    setConnectionStatus(result)

    if (result.connected) {
      toast.success(`Connected (${result.latency}ms)`)
    } else {
      toast.error(result.error || "Connection failed")
    }
  }

  return (
    <div className="space-y-6">
      {/* Webhook Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Connection</CardTitle>
          <CardDescription>
            Test connectivity to your n8n automation server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {connectionStatus ? (
                connectionStatus.connected ? (
                  <Wifi className="size-5 text-green-500" />
                ) : (
                  <WifiOff className="size-5 text-red-500" />
                )
              ) : (
                <Wifi className="size-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">n8n Webhook</p>
                <p className="text-sm text-muted-foreground">
                  {connectionStatus
                    ? connectionStatus.connected
                      ? `Connected — ${connectionStatus.latency}ms latency`
                      : connectionStatus.error || "Connection failed"
                    : "Click test to check connectivity"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connectionStatus && (
                <Badge variant={connectionStatus.connected ? "default" : "destructive"}>
                  {connectionStatus.connected ? "Connected" : "Failed"}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing && <Loader2 className="size-4 animate-spin mr-2" />}
                Test Connection
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Workflow History</CardTitle>
            <CardDescription>
              Recent automation executions from n8n.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
          >
            <RefreshCw className="size-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((wf) => (
                <TableRow key={wf.id}>
                  <TableCell className="font-medium">
                    {wf.workflow_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLORS[wf.status || "pending"] || "outline"}>
                      {wf.status || "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {wf.started_at
                      ? new Date(wf.started_at).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {wf.completed_at
                      ? new Date(wf.completed_at).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {wf.error || "—"}
                  </TableCell>
                </TableRow>
              ))}
              {workflows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No workflow executions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
