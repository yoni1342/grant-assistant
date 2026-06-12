"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2, KeyRound } from "lucide-react"
import { revokeApiKey } from "../actions"
import { scopeLabel, WILDCARD_SCOPE } from "@/lib/api/scopes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CreateApiKeyDialog } from "./create-api-key-dialog"

export interface ApiKeyRow {
  id: string
  name: string
  token_prefix: string
  scopes: string[]
  created_at: string
  last_used_at: string | null
  expires_at: string | null
  revoked_at: string | null
}

const API_BASE =
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== "undefined" ? window.location.origin : "https://app.fundory.ai")

function fmtDate(d: string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function keyStatus(k: ApiKeyRow): { label: string; variant: "secondary" | "destructive" | "outline" } {
  if (k.revoked_at) return { label: "Revoked", variant: "destructive" }
  if (k.expires_at && new Date(k.expires_at).getTime() < Date.now()) return { label: "Expired", variant: "outline" }
  return { label: "Active", variant: "secondary" }
}

function AccessCell({ scopes }: { scopes: string[] }) {
  if (scopes.includes(WILDCARD_SCOPE)) {
    return <Badge variant="default">Full access</Badge>
  }
  if (scopes.length === 0) return <span className="text-muted-foreground">—</span>
  const shown = scopes.slice(0, 2)
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((s) => (
        <Badge key={s} variant="outline" className="font-normal">
          {scopeLabel(s)}
        </Badge>
      ))}
      {scopes.length > shown.length && (
        <Badge variant="outline" className="font-normal">
          +{scopes.length - shown.length}
        </Badge>
      )}
    </div>
  )
}

export function ApiKeysTab({ apiKeys }: { apiKeys: ApiKeyRow[] }) {
  const router = useRouter()
  const [revoking, setRevoking] = useState<string | null>(null)

  async function handleRevoke(id: string) {
    setRevoking(id)
    const result = await revokeApiKey(id)
    setRevoking(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("API key revoked")
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Let another platform read this organization&apos;s data over the Fundory API. Each key is bound to this
              organization only and is read-only.
            </CardDescription>
          </div>
          <CreateApiKeyDialog />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((k) => {
                const status = keyStatus(k)
                const isRevoked = !!k.revoked_at
                return (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell>
                      <code className="font-mono text-xs text-muted-foreground">{k.token_prefix}…</code>
                    </TableCell>
                    <TableCell>
                      <AccessCell scopes={k.scopes} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(k.last_used_at)}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {!isRevoked && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8" disabled={revoking === k.id}>
                              <Trash2 className="size-4 text-muted-foreground" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke API key</AlertDialogTitle>
                              <AlertDialogDescription>
                                Revoke <strong>{k.name}</strong>? Any integration using it will stop working
                                immediately. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction variant="destructive" onClick={() => handleRevoke(k.id)}>
                                Revoke
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              {apiKeys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    <KeyRound className="mx-auto mb-2 size-5 opacity-50" />
                    No API keys yet. Create one to connect an external platform.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Using the API</CardTitle>
          <CardDescription>
            Send your key as a bearer token from a trusted server. Never expose it in a browser or mobile app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Base URL</p>
            <code className="block rounded-md bg-muted px-3 py-2 font-mono text-xs">{API_BASE}/api/v1</code>
          </div>
          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Example</p>
            <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs leading-relaxed">
              {`curl ${API_BASE}/api/v1/export \\\n  -H "Authorization: Bearer fnd_live_…"`}
            </pre>
          </div>
          <p className="text-xs text-muted-foreground">
            <code className="font-mono">GET /api/v1</code> verifies a key and lists every endpoint.{" "}
            <code className="font-mono">/export</code> returns the whole organization in one call.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
