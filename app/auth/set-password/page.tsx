"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function SetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function bootstrap() {
      const url = new URL(window.location.href);

      // Implicit flow: tokens arrive as hash fragment
      // (#access_token=…&refresh_token=…). Set the session directly.
      if (window.location.hash.startsWith("#")) {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          window.history.replaceState({}, "", url.pathname + url.search);
        }
      }

      // PKCE flow: ?code=… in query string. Exchange it for a session.
      const code = url.searchParams.get("code");
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (!exErr) {
          url.searchParams.delete("code");
          window.history.replaceState({}, "", url.pathname + url.search);
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace("/login?error=invite_expired");
        return;
      }
      setEmail(user.email ?? null);
      setBootstrapping(false);
    }

    bootstrap();
    return () => { cancelled = true };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }

    setDone(true);
    setTimeout(() => router.replace("/"), 1200);
  }

  if (done) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
          <h1 className="text-xl font-semibold">Password set</h1>
          <p className="text-sm text-muted-foreground">Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  if (bootstrapping) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Verifying your invitation…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold">Welcome to Fundory</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;re almost in{email ? `, ${email}` : ""}. Just create a password below — you&apos;ll
            use it to sign in next time.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          <Button type="submit" disabled={submitting || !email} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {submitting ? "Saving…" : "Set password and continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
