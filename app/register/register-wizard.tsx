"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FileText, ClipboardList, Upload, X, Check, Globe, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  registerOrganization,
  registerOrganizationForExistingUser,
  registerAgency,
  registerAgencyForExistingUser,
  uploadRegistrationDocuments,
} from "./actions";
import {
  requestSignupOtp,
  verifySignupOtp,
  resendSignupOtp,
} from "./otp-actions";
import {
  PLANS,
  TRIAL_DAYS,
  BILLING_CYCLES,
  getCyclePrice,
} from "@/lib/stripe/config";
import type { PlanId, BillingCycleId } from "@/lib/stripe/config";

const SECTORS = [
  "Education",
  "Health",
  "Environment",
  "Arts & Culture",
  "Social Services",
  "Community Development",
  "Human Rights",
  "International Development",
  "Science & Technology",
  "Other",
];

const ALL_STATES = "Across all states";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming", "District of Columbia",
  "Puerto Rico", "U.S. Virgin Islands", "Guam", "American Samoa",
  "Northern Mariana Islands",
];

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024;

interface RegisterWizardProps {
  isAuthenticated: boolean;
  userEmail?: string;
  userName?: string;
}

export function RegisterWizard({
  isAuthenticated: isAuthenticatedProp,
  userEmail,
  userName,
}: RegisterWizardProps) {
  // After OTP verification we sign the user in client-side, so we need a
  // mutable authenticated flag rather than the static prop.
  const [isAuthenticated, setIsAuthenticated] = useState(isAuthenticatedProp);
  const [step, setStep] = useState(isAuthenticatedProp ? 2 : 1);
  const firstStep = isAuthenticatedProp ? 2 : 1;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // OTP sub-state (active only while step === 1)
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpExpiresInMin, setOtpExpiresInMin] = useState<number>(10);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);

  // Step 1: Account
  const [fullName, setFullName] = useState(userName || "");
  const [email, setEmail] = useState(userEmail || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2: Organization
  const [orgName, setOrgName] = useState("");
  const [ein, setEin] = useState("");
  const [mission, setMission] = useState("");
  const [sector, setSector] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  // orgEmail removed — we reuse the user's account email for the organization
  const [website, setWebsite] = useState("");
  const [foundingYear, setFoundingYear] = useState("");
  const [geographicFocus, setGeographicFocus] = useState<string[]>([]);
  const [stateSearch, setStateSearch] = useState("");
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const stateDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(e.target as Node)) {
        setStateDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredStates = [ALL_STATES, ...US_STATES].filter(
    (s) =>
      s.toLowerCase().includes(stateSearch.toLowerCase()) &&
      !geographicFocus.includes(s)
  );

  function toggleState(state: string) {
    setGeographicFocus((prev) => {
      if (prev.includes(state)) return prev.filter((s) => s !== state);
      // Selecting "Across all states" clears any specific-state selections
      if (state === ALL_STATES) return [ALL_STATES];
      // Selecting a specific state removes the "Across all states" option
      return [...prev.filter((s) => s !== ALL_STATES), state];
    });
    setStateSearch("");
  }

  function removeState(state: string) {
    setGeographicFocus((prev) => prev.filter((s) => s !== state));
  }

  // Step 2: Plan selection (moved up)
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("free");
  const [billingCycle, setBillingCycle] = useState<BillingCycleId>("monthly");

  // Agency-specific
  const [agencyName, setAgencyName] = useState("");

  // Step 3/4: Profile mode (org flow only)
  const [profileMode, setProfileMode] = useState<
    "documents" | "questionnaire" | "website" | null
  >(null);

  // Documents
  const [narrativeFile, setNarrativeFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);

  // Website-mode narrative preview (generated before submit, editable, saved on register)
  type GeneratedNarrative = { ai_category: string; title: string; content: string };
  const [genStatus, setGenStatus] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [genError, setGenError] = useState<string | null>(null);
  const [generatedNarratives, setGeneratedNarratives] = useState<GeneratedNarrative[]>([]);
  const [websiteSubStep, setWebsiteSubStep] = useState<"input" | "edit">("input");

  // Incomplete-fields warning dialog
  const [incompleteWarning, setIncompleteWarning] = useState<{
    missing: string[];
    onProceed: () => void;
  } | null>(null);

  // Step 3: Questionnaire
  const [annualBudget, setAnnualBudget] = useState("");
  const [staffCount, setStaffCount] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [missionNarrative, setMissionNarrative] = useState("");
  const [impactNarrative, setImpactNarrative] = useState("");
  const [methodsNarrative, setMethodsNarrative] = useState("");
  const [budgetNarrative, setBudgetNarrative] = useState("");

  async function handleNextToStep2() {
    setError(null);
    if (!fullName.trim()) {
      setError("Full name is required");
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const otpRes = await requestSignupOtp({
      email: trimmedEmail,
      password,
      fullName: fullName.trim(),
    });
    setLoading(false);
    if (otpRes.error || !otpRes.success) {
      setError(otpRes.error || "Could not start signup. Please try again.");
      return;
    }
    setOtpExpiresInMin(otpRes.data?.expiresInMinutes ?? 10);
    setOtpCode("");
    setAwaitingOtp(true);
    setOtpResendCooldown(30);
  }

  async function handleVerifyOtp() {
    setError(null);
    const trimmedEmail = email.trim();
    const code = otpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    const verifyRes = await verifySignupOtp({ email: trimmedEmail, code });
    if (verifyRes.error || !verifyRes.success) {
      setLoading(false);
      setError(verifyRes.error || "Could not verify code. Please try again.");
      return;
    }

    // OTP verified — sign the user in client-side using the password they
    // just typed in step 1 (still in component state).
    const supa = createClient();
    const { error: signInErr } = await supa.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    setLoading(false);
    if (signInErr) {
      console.error("[handleVerifyOtp] signInWithPassword failed:", signInErr.message);
      setError("Verified, but couldn't sign in automatically. Please try logging in.");
      return;
    }

    setIsAuthenticated(true);
    setAwaitingOtp(false);
    setStep(2);
  }

  async function handleResendOtp() {
    setError(null);
    if (otpResendCooldown > 0) return;
    setLoading(true);
    const res = await resendSignupOtp({ email: email.trim() });
    setLoading(false);
    if (res.error || !res.success) {
      setError(res.error || "Could not resend code.");
      return;
    }
    setOtpResendCooldown(30);
  }

  // Tick down the resend cooldown (1s).
  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const t = setInterval(() => setOtpResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [otpResendCooldown]);

  function handleNextFromPlan() {
    setError(null);
    // Agency plan goes to agency name step (step 3)
    // Org plans go to org details step (step 3)
    setStep(3);
  }

  function handleNextToOrgProfile() {
    setError(null);
    if (!orgName.trim()) {
      setError("Organization name is required");
      return;
    }
    if (geographicFocus.length === 0) {
      setError("Please select at least one geographic focus area");
      return;
    }

    const missing: string[] = [];
    if (!ein.trim()) missing.push("EIN");
    if (!sector) missing.push("Sector");
    if (!mission.trim()) missing.push("Mission");
    if (!address.trim()) missing.push("Address");
    if (!phone.trim()) missing.push("Phone");
    if (!website.trim()) missing.push("Website");
    if (!foundingYear) missing.push("Founding Year");

    if (missing.length > 0) {
      setIncompleteWarning({
        missing,
        onProceed: () => {
          setIncompleteWarning(null);
          setStep(4);
        },
      });
      return;
    }

    setStep(4);
  }

  function handleNextToStep5() {
    setError(null);
    if (profileMode === "documents" && !narrativeFile && additionalFiles.length === 0) {
      setError("Please upload at least one document");
      return;
    }
    if (profileMode === "website" && !website.trim()) {
      setError("Please enter your website URL");
      return;
    }
    // Advance to review step — user confirms before we actually register
    setStep(5);
  }

  async function handleGenerateFromWebsite() {
    setGenError(null);
    if (!website.trim()) {
      setGenError("Please enter your website URL");
      return;
    }
    setGenStatus("generating");
    try {
      const res = await fetch("/api/narratives/preview-from-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website_url: website.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenStatus("error");
        setGenError(data.error || "Could not generate narratives. Please try again.");
        return;
      }
      const items: GeneratedNarrative[] = Array.isArray(data.narratives) ? data.narratives : [];
      if (items.length === 0) {
        setGenStatus("error");
        setGenError("No narratives could be generated from this website.");
        return;
      }
      setGeneratedNarratives(items);
      setGenStatus("ready");
      setWebsiteSubStep("edit");
    } catch (err) {
      console.error("Generate narratives error:", err);
      setGenStatus("error");
      setGenError("Could not reach the narrative generator. Please try again.");
    }
  }

  function updateGeneratedContent(idx: number, content: string) {
    setGeneratedNarratives((prev) =>
      prev.map((n, i) => (i === idx ? { ...n, content } : n))
    );
  }

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name}: Invalid type. Only PDF, DOCX, XLSX, PPTX, PNG, JPG allowed.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File too large. Max 25MB.`;
    }
    return null;
  }

  function handleNarrativeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setNarrativeFile(file);
  }

  function handleAdditionalFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const err = validateFile(f);
      if (err) {
        setError(err);
        return;
      }
    }
    setError(null);
    setAdditionalFiles((prev) => [...prev, ...files]);
  }

  function removeAdditionalFile(index: number) {
    setAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    // --- Agency registration flow ---
    if (selectedPlan === "agency") {
      if (!agencyName.trim()) {
        setError("Agency name is required");
        setLoading(false);
        return;
      }

      let result;
      if (isAuthenticated) {
        result = await registerAgencyForExistingUser({
          agencyName: agencyName.trim(),
        });
      } else {
        result = await registerAgency({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          agencyName: agencyName.trim(),
        });
      }

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Redirect to Stripe Checkout for agency billing
      if (result.agencyId) {
        try {
          const res = await fetch("/api/stripe/checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              agencyId: result.agencyId,
              plan: "agency",
              email: isAuthenticated ? userEmail : email.trim(),
              billingCycle,
            }),
          });
          const data = await res.json();
          if (data.url) {
            window.location.href = data.url;
            return;
          }
        } catch (err) {
          console.error("Stripe checkout error:", err);
        }
      }

      setSuccess(true);
      setLoading(false);
      return;
    }

    // --- Org registration flow (Free / Professional) ---
    const orgData = {
      name: orgName.trim(),
      ein: ein.trim() || undefined,
      mission: mission.trim() || undefined,
      sector: sector || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      email: (isAuthenticated ? userEmail : email.trim()) || undefined,
      website: website.trim() || undefined,
      founding_year: foundingYear ? parseInt(foundingYear) : null,
      geographic_focus: geographicFocus.length > 0 ? geographicFocus : undefined,
    };

    const questionnaire =
      profileMode === "questionnaire"
        ? {
            annualBudget: annualBudget ? parseFloat(annualBudget) : null,
            staffCount: staffCount ? parseInt(staffCount) : null,
            orgDescription: orgDescription.trim(),
            executiveSummary: executiveSummary.trim(),
            missionNarrative: missionNarrative.trim(),
            impactNarrative: impactNarrative.trim(),
            methodsNarrative: methodsNarrative.trim(),
            budgetNarrative: budgetNarrative.trim(),
          }
        : null;

    const prebuiltNarratives =
      profileMode === "website" && genStatus === "ready"
        ? generatedNarratives
            .filter((n) => n.content.trim())
            .map((n) => ({
              ai_category: n.ai_category,
              title: n.title,
              content: n.content.trim(),
              source_url: website.trim() || null,
            }))
        : null;

    let result;
    if (isAuthenticated) {
      result = await registerOrganizationForExistingUser({
        org: orgData,
        questionnaire,
        plan: selectedPlan,
        prebuiltNarratives,
      });
    } else {
      result = await registerOrganization({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        org: orgData,
        questionnaire,
        plan: selectedPlan,
        prebuiltNarratives,
      });
    }

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Upload documents if that mode was selected
    console.log('[register] profileMode:', profileMode, 'result:', JSON.stringify(result))
    if (
      profileMode === "documents" &&
      result.orgId &&
      result.userId
    ) {
      const formData = new FormData();
      formData.append("orgId", result.orgId);
      formData.append("userId", result.userId);
      if (narrativeFile) formData.append("narrativeFile", narrativeFile);
      for (const f of additionalFiles) {
        formData.append("additionalFiles", f);
      }

      const uploadResult = await uploadRegistrationDocuments(formData);
      if (uploadResult.error) {
        console.error("Document upload error:", uploadResult.error);
      }
    }

    // For paid plans, redirect to Stripe Checkout
    if (selectedPlan !== "free" && result.orgId) {
      try {
        const res = await fetch("/api/stripe/checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId: result.orgId,
            plan: selectedPlan,
            email: isAuthenticated ? userEmail : email.trim(),
            billingCycle,
          }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      } catch (err) {
        console.error("Stripe checkout error:", err);
        // Still show success — they can upgrade later from billing settings
      }
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    const isAgency = selectedPlan === "agency";
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold">
              You&apos;re in.
            </CardTitle>
            <CardDescription>
              {isAgency ? (
                <>
                  Your agency <strong>{agencyName}</strong> is live. Sign in to
                  open your agency dashboard.
                </>
              ) : (
                <>
                  Your organization <strong>{orgName}</strong> is live on Fundory.
                  Your dashboard is ready.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/login">
              <Button variant="outline">Go to Login</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const isAgencyFlow = selectedPlan === "agency";
  const stepLabels = isAgencyFlow
    ? ["Create your account", "Choose your plan", "Agency details"]
    : ["Create your account", "Choose your plan", "Organization details", "Organization profile", "Review & register"];
  const currentStepLabel = isAuthenticated
    ? stepLabels[step]
    : stepLabels[step - 1];
  const orgFlowDotCount = isAgencyFlow ? 2 : 4;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-8">
      <Card
        className={`w-full ${
          step === 2
            ? "max-w-3xl"
            : step === 4 && profileMode === "website" && websiteSubStep === "edit"
              ? "max-w-3xl"
              : "max-w-lg"
        }`}
      >
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Fundory.ai</CardTitle>
          <CardDescription>{currentStepLabel}</CardDescription>
          <div className="flex items-center justify-center gap-2 pt-2">
            {!isAuthenticated && (
              <div
                className={`h-2 w-12 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`}
              />
            )}
            {Array.from({ length: orgFlowDotCount }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-12 rounded-full ${step >= i + 2 ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {/* Step 1: Account */}
          {step === 1 && !awaitingOtp && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button onClick={handleNextToStep2} disabled={loading} className="w-full">
                {loading ? "Sending code..." : "Send verification code"}
              </Button>
            </div>
          )}

          {/* Step 1.5: OTP verification */}
          {step === 1 && awaitingOtp && (
            <div className="flex flex-col gap-4">
              <div className="rounded-md border border-muted p-4 bg-muted/30">
                <p className="text-sm text-foreground">
                  We just sent a 6-digit code to{" "}
                  <span className="font-medium">{email.trim()}</span>. It expires in{" "}
                  {otpExpiresInMin} minutes.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="font-mono tracking-[0.5em] text-center text-lg"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                onClick={handleVerifyOtp}
                disabled={loading || otpCode.length !== 6}
                className="w-full"
              >
                {loading ? "Verifying..." : "Verify and continue"}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setAwaitingOtp(false);
                    setOtpCode("");
                    setError(null);
                  }}
                  className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpResendCooldown > 0 || loading}
                  className="text-primary disabled:text-muted-foreground disabled:cursor-not-allowed underline-offset-2 hover:underline"
                >
                  {otpResendCooldown > 0
                    ? `Resend in ${otpResendCooldown}s`
                    : "Resend code"}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Plan Selection */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              {/* Billing-cycle selector — applies to every paid plan card below */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Billing cycle
                </span>
                <div className="inline-flex rounded-md border border-muted p-0.5">
                  {(Object.keys(BILLING_CYCLES) as BillingCycleId[]).map((id) => {
                    const c = BILLING_CYCLES[id];
                    const active = billingCycle === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setBillingCycle(id)}
                        className={`relative inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {c.label}
                        {c.discountPct > 0 && (
                          <span
                            className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${
                              active
                                ? "bg-primary-foreground/15 text-primary-foreground"
                                : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            }`}
                          >
                            -{c.discountPct}%
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(Object.entries(PLANS) as [PlanId, typeof PLANS[PlanId]][]).map(([planId, plan]) => {
                  const cyclePrice = getCyclePrice(planId, billingCycle);
                  const isPaid = plan.basePriceMonthly > 0;
                  return (
                  <button
                    key={planId}
                    type="button"
                    onClick={() => setSelectedPlan(planId)}
                    className={`relative flex flex-col rounded-lg border-2 p-5 text-left transition-colors ${
                      selectedPlan === planId
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/40"
                    }`}
                  >
                    {selectedPlan === planId && (
                      <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <p className="font-semibold text-lg">{plan.name}</p>
                    {isPaid ? (
                      <>
                        <p className="text-2xl font-bold mt-1">
                          ${cyclePrice.perMonth}
                          <span className="text-sm font-normal text-muted-foreground">/mo</span>
                        </p>
                        {cyclePrice.months > 1 ? (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ${cyclePrice.total.toFixed(2)} billed every {cyclePrice.months} months
                            {cyclePrice.discountPct > 0 && (
                              <span className="ml-1 text-green-600 dark:text-green-400 font-medium">
                                ({cyclePrice.discountPct}% off)
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ${cyclePrice.total.toFixed(2)} billed monthly
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {TRIAL_DAYS}-day free trial
                        </p>
                      </>
                    ) : (
                      <p className="text-2xl font-bold mt-1">Free</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                    <ul className="mt-3 space-y-1.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </button>
                  );
                })}
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3">
                {!isAuthenticated && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep(1);
                      setError(null);
                    }}
                    className="flex-1"
                  >
                    Back
                  </Button>
                )}
                <Button onClick={handleNextFromPlan} className="flex-1">
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 (Agency flow): Agency Name */}
          {step === 3 && isAgencyFlow && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Set up your agency account. You&apos;ll be able to create and manage
                multiple organizations from your agency dashboard.
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="agencyName">Agency Name *</Label>
                <Input
                  id="agencyName"
                  type="text"
                  placeholder="Your agency name"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(2);
                    setError(null);
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "Submitting..." : "Register & Start Trial"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 (Org flow): Organization Details */}
          {step === 3 && !isAgencyFlow && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="orgName">Organization Name *</Label>
                <Input
                  id="orgName"
                  type="text"
                  placeholder="Your nonprofit name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ein">EIN</Label>
                  <Input
                    id="ein"
                    type="text"
                    placeholder="XX-XXXXXXX"
                    value={ein}
                    onChange={(e) => setEin(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="sector">Sector</Label>
                  <Select value={sector} onValueChange={setSector}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mission">Mission</Label>
                <Textarea
                  id="mission"
                  placeholder="Describe your organization's mission..."
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="123 Main St, City, State"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://org.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="foundingYear">Founding Year</Label>
                <Input
                  id="foundingYear"
                  type="number"
                  placeholder="2000"
                  value={foundingYear}
                  onChange={(e) => setFoundingYear(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Geographic Focus *</Label>
                {geographicFocus.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {geographicFocus.map((state) => (
                      <Badge
                        key={state}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {state}
                        <button
                          type="button"
                          onClick={() => removeState(state)}
                          className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="relative" ref={stateDropdownRef}>
                  <Input
                    type="text"
                    placeholder="Search states..."
                    value={stateSearch}
                    onChange={(e) => {
                      setStateSearch(e.target.value);
                      setStateDropdownOpen(true);
                    }}
                    onFocus={() => setStateDropdownOpen(true)}
                  />
                  {stateDropdownOpen && filteredStates.length > 0 && (
                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                      {filteredStates.map((state) => (
                        <button
                          key={state}
                          type="button"
                          onClick={() => {
                            toggleState(state);
                            setStateDropdownOpen(true);
                          }}
                          className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          {state}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(2);
                    setError(null);
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button onClick={handleNextToOrgProfile} className="flex-1">
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 4 (Org flow): Organization Profile */}
          {step === 4 && !profileMode && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Help us understand your organization better. Choose one option:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setProfileMode("documents")}
                  className="flex flex-col items-center gap-3 rounded-lg border-2 border-muted p-6 text-center transition-colors hover:border-primary hover:bg-muted/50"
                >
                  <FileText className="h-10 w-10 text-primary" />
                  <div>
                    <p className="font-medium">Upload Documents</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload your narrative and supporting documents
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => setProfileMode("questionnaire")}
                  className="flex flex-col items-center gap-3 rounded-lg border-2 border-muted p-6 text-center transition-colors hover:border-primary hover:bg-muted/50"
                >
                  <ClipboardList className="h-10 w-10 text-primary" />
                  <div>
                    <p className="font-medium">Answer Questions</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fill out a questionnaire about your organization
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => setProfileMode("website")}
                  className="flex flex-col items-center gap-3 rounded-lg border-2 border-muted p-6 text-center transition-colors hover:border-primary hover:bg-muted/50"
                >
                  <Globe className="h-10 w-10 text-primary" />
                  <div>
                    <p className="font-medium">Use My Website</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      We&apos;ll read your website and AI-generate narratives for you
                    </p>
                  </div>
                </button>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setStep(3);
                  setError(null);
                }}
                className="w-full"
              >
                Back
              </Button>
            </div>
          )}

          {/* Step 4 (Org flow): Upload Documents */}
          {step === 4 && profileMode === "documents" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Narrative Document</Label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/40 px-3 py-2 text-sm text-muted-foreground hover:border-primary transition-colors">
                      <Upload className="h-4 w-4" />
                      {narrativeFile ? narrativeFile.name : "Choose narrative file (PDF, DOCX, XLSX, PNG, JPG)"}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg"
                      onChange={handleNarrativeFile}
                    />
                  </label>
                  {narrativeFile && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setNarrativeFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Additional Documents (optional)</Label>
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/40 px-3 py-2 text-sm text-muted-foreground hover:border-primary transition-colors">
                    <Upload className="h-4 w-4" />
                    Add more documents
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg"
                    multiple
                    onChange={handleAdditionalFiles}
                  />
                </label>
                {additionalFiles.length > 0 && (
                  <div className="space-y-1 mt-1">
                    {additionalFiles.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded bg-muted px-3 py-1.5 text-sm"
                      >
                        <span className="truncate">{f.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => removeAdditionalFile(i)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setProfileMode(null);
                    setError(null);
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNextToStep5}
                  disabled={loading || genStatus === "generating"}
                  className="flex-1"
                >
                  Continue to review
                </Button>
              </div>
            </div>
          )}

          {/* Step 4 (Org flow): Questionnaire */}
          {step === 4 && profileMode === "questionnaire" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="annualBudget">Annual Budget ($)</Label>
                  <Input
                    id="annualBudget"
                    type="number"
                    placeholder="e.g. 500000"
                    value={annualBudget}
                    onChange={(e) => setAnnualBudget(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="staffCount">Staff Count</Label>
                  <Input
                    id="staffCount"
                    type="number"
                    placeholder="e.g. 25"
                    value={staffCount}
                    onChange={(e) => setStaffCount(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="orgDescription">Organization Description</Label>
                <Textarea
                  id="orgDescription"
                  placeholder="Describe what your organization does..."
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="executiveSummary">Executive Summary</Label>
                <Textarea
                  id="executiveSummary"
                  placeholder="Brief summary of your organization for grant applications..."
                  value={executiveSummary}
                  onChange={(e) => setExecutiveSummary(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="missionNarrative">Mission Narrative</Label>
                <Textarea
                  id="missionNarrative"
                  placeholder="Describe your organization's mission in detail..."
                  value={missionNarrative}
                  onChange={(e) => setMissionNarrative(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="impactNarrative">Impact Narrative</Label>
                <Textarea
                  id="impactNarrative"
                  placeholder="Describe the impact your organization has made..."
                  value={impactNarrative}
                  onChange={(e) => setImpactNarrative(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="methodsNarrative">Methods & Approach</Label>
                <Textarea
                  id="methodsNarrative"
                  placeholder="Describe your programs and methods..."
                  value={methodsNarrative}
                  onChange={(e) => setMethodsNarrative(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="budgetNarrative">Budget Narrative</Label>
                <Textarea
                  id="budgetNarrative"
                  placeholder="Describe how your organization uses its funds..."
                  value={budgetNarrative}
                  onChange={(e) => setBudgetNarrative(e.target.value)}
                  rows={3}
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setProfileMode(null);
                    setError(null);
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNextToStep5}
                  disabled={loading || genStatus === "generating"}
                  className="flex-1"
                >
                  Continue to review
                </Button>
              </div>
            </div>
          )}

          {/* Step 4 (Org flow): Use My Website */}
          {step === 4 && profileMode === "website" && websiteSubStep === "input" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="website-narrative-url">Website URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="website-narrative-url"
                    type="url"
                    placeholder="https://yourorganization.org"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    disabled={genStatus === "generating"}
                  />
                  <Button
                    type="button"
                    onClick={handleGenerateFromWebsite}
                    disabled={genStatus === "generating" || !website.trim()}
                    className="shrink-0"
                  >
                    {genStatus === "generating" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Click Generate to read your site and draft narratives. You&apos;ll be
                  able to edit them on the next page.
                </p>
              </div>

              {genStatus === "generating" && (
                <div className="rounded-lg border border-teal-200 bg-teal-50 dark:bg-teal-950/30 dark:border-teal-900 p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 text-teal-600 animate-spin shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-teal-900 dark:text-teal-100">
                        Reading your website…
                      </p>
                      <p className="text-xs text-teal-700 dark:text-teal-300 mt-0.5">
                        This usually takes 20–60 seconds.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {genStatus === "error" && genError && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-4">
                  <p className="text-sm text-red-800 dark:text-red-200">{genError}</p>
                </div>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setProfileMode(null);
                    setError(null);
                    setGenStatus("idle");
                    setGenError(null);
                    setGeneratedNarratives([]);
                  }}
                  className="flex-1"
                  disabled={loading || genStatus === "generating"}
                >
                  Back
                </Button>
              </div>
            </div>
          )}

          {step === 4 && profileMode === "website" && websiteSubStep === "edit" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-teal-600" />
                  <span className="font-medium">
                    Generated {generatedNarratives.length} narrative
                    {generatedNarratives.length === 1 ? "" : "s"}
                  </span>
                  <span className="text-muted-foreground hidden sm:inline">
                    — review and edit below.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateFromWebsite}
                  className="text-xs text-teal-700 hover:underline font-medium flex items-center gap-1"
                  disabled={genStatus === "generating"}
                >
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </button>
              </div>

              {/* Document-style sheets — emerald ribbon, serif body, grey desk surround */}
              <div className="rounded-lg bg-zinc-200 dark:bg-zinc-900 p-4 sm:p-6 max-h-[560px] overflow-y-auto">
                <div className="flex flex-col gap-5">
                  {generatedNarratives.map((n, idx) => (
                    <div
                      key={n.ai_category}
                      className="bg-white dark:bg-zinc-50 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden mx-auto w-full max-w-[680px]"
                    >
                      <div
                        className="h-2"
                        style={{
                          background:
                            "linear-gradient(135deg, #0d6e6e 0%, #14b8a6 50%, #0d6e6e 100%)",
                        }}
                      />
                      <div className="px-8 py-6 sm:px-12 sm:py-8 text-zinc-900">
                        <div className="flex items-baseline justify-between gap-4 mb-1">
                          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-teal-700">
                            {n.ai_category.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] font-mono tabular-nums text-zinc-500">
                            {n.content.split(/\s+/).filter(Boolean).length} words
                          </span>
                        </div>
                        <h3
                          className="text-2xl font-semibold mb-4 leading-tight"
                          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                        >
                          {n.title}
                        </h3>
                        <Textarea
                          value={n.content}
                          onChange={(e) => updateGeneratedContent(idx, e.target.value)}
                          rows={8}
                          className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-0 resize-y bg-transparent text-[15px] leading-[1.7] text-zinc-800 dark:text-zinc-800"
                          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                          placeholder="Edit this section..."
                        />
                      </div>
                      <div className="px-8 sm:px-12 pb-4 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                        <span>{idx + 1} / {generatedNarratives.length}</span>
                        <span className="uppercase tracking-wider">Fundory.ai narrative draft</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setWebsiteSubStep("input");
                    setError(null);
                  }}
                  className="flex-1"
                  disabled={loading || genStatus === "generating"}
                >
                  Back
                </Button>
                <Button
                  onClick={handleNextToStep5}
                  disabled={loading || genStatus === "generating"}
                  className="flex-1"
                >
                  Continue to review
                </Button>
              </div>
            </div>
          )}

          {/* Step 5 (Org flow): Review & Register */}
          {step === 5 && (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-muted-foreground">
                Confirm everything below, then register. Use Back to fix anything.
              </p>

              {!isAuthenticated && (
                <ReviewSection title="Account">
                  <ReviewRow label="Full name" value={fullName} />
                  <ReviewRow label="Email" value={email} />
                </ReviewSection>
              )}

              <ReviewSection title="Plan">
                <ReviewRow
                  label="Selected plan"
                  value={
                    selectedPlan === "free"
                      ? "Free"
                      : selectedPlan === "professional"
                        ? "Professional"
                        : selectedPlan
                  }
                />
              </ReviewSection>

              <ReviewSection title="Organization">
                <ReviewRow label="Name" value={orgName} />
                <ReviewRow label="EIN" value={ein} />
                <ReviewRow label="Sector" value={sector} />
                <ReviewRow label="Mission" value={mission} multiline />
                <ReviewRow label="Address" value={address} />
                <ReviewRow label="Phone" value={phone} />
                <ReviewRow label="Website" value={website} />
                <ReviewRow label="Founded" value={foundingYear} />
                <ReviewRow
                  label="Geographic focus"
                  value={geographicFocus.join(", ")}
                />
              </ReviewSection>

              {profileMode === "questionnaire" && (
                <ReviewSection title="Questionnaire">
                  {annualBudget && (
                    <ReviewRow
                      label="Annual budget"
                      value={`$${Number(annualBudget).toLocaleString()}`}
                    />
                  )}
                  {staffCount && <ReviewRow label="Staff count" value={staffCount} />}
                  <ReviewRow label="Description" value={orgDescription} multiline />
                  <ReviewRow label="Executive summary" value={executiveSummary} multiline />
                  <ReviewRow label="Mission narrative" value={missionNarrative} multiline />
                  <ReviewRow label="Impact" value={impactNarrative} multiline />
                  <ReviewRow label="Methods" value={methodsNarrative} multiline />
                  <ReviewRow label="Budget narrative" value={budgetNarrative} multiline />
                </ReviewSection>
              )}

              {profileMode === "documents" && (
                <ReviewSection title="Documents">
                  {narrativeFile && (
                    <ReviewRow label="Narrative file" value={narrativeFile.name} />
                  )}
                  {additionalFiles.length > 0 && (
                    <ReviewRow
                      label="Additional files"
                      value={additionalFiles.map((f) => f.name).join(", ")}
                    />
                  )}
                  {!narrativeFile && additionalFiles.length === 0 && (
                    <ReviewRow label="" value="No files attached" />
                  )}
                </ReviewSection>
              )}

              {profileMode === "website" && genStatus === "ready" &&
                generatedNarratives.length > 0 && (
                  <ReviewSection title="AI-generated narratives">
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll save these to your library on register. {generatedNarratives.length} sections.
                    </p>
                    <div className="flex flex-col gap-2">
                      {generatedNarratives.map((n) => (
                        <div
                          key={n.ai_category}
                          className="rounded-md border bg-card overflow-hidden"
                        >
                          <div
                            className="h-1"
                            style={{
                              background:
                                "linear-gradient(135deg, #0d6e6e 0%, #14b8a6 50%, #0d6e6e 100%)",
                            }}
                          />
                          <div className="p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">{n.title}</span>
                              <span className="text-[10px] font-mono uppercase text-muted-foreground">
                                {n.content.split(/\s+/).filter(Boolean).length} words
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                              {n.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ReviewSection>
                )}

              {profileMode === "website" && genStatus !== "ready" && (
                <ReviewSection title="AI-generated narratives">
                  <p className="text-sm text-muted-foreground">
                    None — you can generate them in the library after registering.
                  </p>
                </ReviewSection>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(4);
                    setError(null);
                  }}
                  disabled={loading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading
                    ? "Submitting..."
                    : selectedPlan === "free"
                      ? "Register Organization"
                      : "Register & Start Trial"}
                </Button>
              </div>
            </div>
          )}

          {/* Plan selection is now at step 2 */}
        </CardContent>
        <CardFooter className="justify-center">
          {isAuthenticated ? (
            <p className="text-sm text-muted-foreground">
              Signed in as {userEmail}.{" "}
              <button
                type="button"
                className="font-medium text-foreground hover:underline"
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  window.location.href = "/login";
                }}
              >
                Switch account
              </button>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                className="font-medium text-foreground hover:underline"
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  window.location.href = "/login";
                }}
              >
                Sign in
              </button>
            </p>
          )}
        </CardFooter>
      </Card>

      <Dialog
        open={incompleteWarning !== null}
        onOpenChange={(open) => {
          if (!open) setIncompleteWarning(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Some details are missing</DialogTitle>
            <DialogDescription>
              For the best experience, we recommend filling in all the fields so
              we can tailor grant recommendations more accurately. You can still
              skip and complete them later.
            </DialogDescription>
          </DialogHeader>
          {incompleteWarning && incompleteWarning.missing.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-0.5">
              {incompleteWarning.missing.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIncompleteWarning(null)}
            >
              Go back and fill
            </Button>
            <Button onClick={() => incompleteWarning?.onProceed()}>
              Skip and continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-3 py-2">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="flex flex-col gap-2 p-3">{children}</div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
}) {
  const display = value && value.trim().length > 0 ? value : "—";
  if (multiline) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <p className="whitespace-pre-wrap text-sm">{display}</p>
      </div>
    );
  }
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-xs font-medium text-muted-foreground shrink-0">
        {label}
      </span>
      <span className="text-right break-words">{display}</span>
    </div>
  );
}
