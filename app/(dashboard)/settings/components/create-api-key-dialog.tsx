"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Copy, Check, KeyRound, AlertTriangle } from "lucide-react"
import { createApiKey } from "../actions"
import { API_SCOPE_DEFS, WILDCARD_SCOPE } from "@/lib/api/scopes"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export function CreateApiKeyDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"form" | "reveal">("form")
  const [name, setName] = useState("")
  const [fullAccess, setFullAccess] = useState(true)
  const [scopes, setScopes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState("")
  const [copied, setCopied] = useState(false)
  const tokenRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep("form")
    setName("")
    setFullAccess(true)
    setScopes([])
    setToken("")
    setCopied(false)
  }

  function toggleScope(value: string, checked: boolean) {
    setScopes((prev) => (checked ? [...prev, value] : prev.filter((s) => s !== value)))
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Please give the key a name.")
      return
    }
    const chosen = fullAccess ? [WILDCARD_SCOPE] : scopes
    if (chosen.length === 0) {
      toast.error("Select at least one scope.")
      return
    }
    setLoading(true)
    const result = await createApiKey(name.trim(), chosen)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    if (result.token) {
      setToken(result.token)
      setStep("reveal")
      router.refresh()
    }
  }

  function selectToken() {
    const el = tokenRef.current
    if (!el) return
    el.focus()
    el.select()
    el.setSelectionRange(0, token.length)
  }

  async function copyToken() {
    // navigator.clipboard only exists in a secure context (HTTPS or localhost).
    // Over plain HTTP (e.g. reaching the app by IP) it's undefined, so fall back
    // to selecting the field + the legacy execCommand copy.
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(token)
      } else {
        selectToken()
        if (!document.execCommand("copy")) throw new Error("execCommand copy failed")
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Last resort: leave the key selected so the user can press Ctrl/Cmd+C.
      selectToken()
      toast.error("Couldn't copy automatically — the key is selected, press Ctrl/Cmd+C.")
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setTimeout(reset, 200)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <KeyRound className="size-4 mr-2" />
          Create API key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Give another platform read access to this organization&apos;s data. The secret is shown only once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. Reporting dashboard"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-3">
                <Label>Access</Label>
                <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
                  <Checkbox
                    checked={fullAccess}
                    onCheckedChange={(c) => setFullAccess(c === true)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Full read access</p>
                    <p className="text-xs text-muted-foreground">
                      Read every resource, including ones added later.
                    </p>
                  </div>
                </label>
                {!fullAccess && (
                  <div className="space-y-3 rounded-md border p-3">
                    {API_SCOPE_DEFS.map((s) => (
                      <label key={s.value} className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          checked={scopes.includes(s.value)}
                          onCheckedChange={(c) => toggleScope(s.value, c === true)}
                          className="mt-0.5"
                        />
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">{s.label}</p>
                          <p className="text-xs text-muted-foreground">{s.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                Create key
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Copy your API key</DialogTitle>
              <DialogDescription>This is the only time you&apos;ll see it. Store it somewhere safe.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Treat this like a password. Anyone with it can read your organization&apos;s data until you revoke
                  it. Use it only from a trusted server, never in a browser or mobile app.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  ref={tokenRef}
                  readOnly
                  value={token}
                  onFocus={selectToken}
                  onClick={selectToken}
                  className="flex-1 bg-muted font-mono text-xs"
                  aria-label="API key"
                />
                <Button variant="outline" size="icon" onClick={copyToken} aria-label="Copy key">
                  {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click the field to select the whole key, then copy it.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
