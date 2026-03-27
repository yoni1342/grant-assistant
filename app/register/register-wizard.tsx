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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FileText, ClipboardList, Upload, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  registerOrganization,
  registerOrganizationForExistingUser,
  registerAgency,
  registerAgencyForExistingUser,
  uploadRegistrationDocuments,
} from "./actions";
import { PLANS, TRIAL_DAYS } from "@/lib/stripe/config";
import type { PlanId } from "@/lib/stripe/config";

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
  isAuthenticated,
  userEmail,
  userName,
}: RegisterWizardProps) {
  const [step, setStep] = useState(isAuthenticated ? 2 : 1);
  const firstStep = isAuthenticated ? 2 : 1;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

  const filteredStates = US_STATES.filter(
    (s) =>
      s.toLowerCase().includes(stateSearch.toLowerCase()) &&
      !geographicFocus.includes(s)
  );

  function toggleState(state: string) {
    setGeographicFocus((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
    setStateSearch("");
  }

  function removeState(state: string) {
    setGeographicFocus((prev) => prev.filter((s) => s !== state));
  }

  // Step 2: Plan selection (moved up)
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("free");

  // Agency-specific
  const [agencyName, setAgencyName] = useState("");

  // Step 3/4: Profile mode (org flow only)
  const [profileMode, setProfileMode] = useState<
    "documents" | "questionnaire" | null
  >(null);

  // Documents
  const [narrativeFile, setNarrativeFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);

  // Step 3: Questionnaire
  const [annualBudget, setAnnualBudget] = useState("");
  const [staffCount, setStaffCount] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [missionNarrative, setMissionNarrative] = useState("");
  const [impactNarrative, setImpactNarrative] = useState("");
  const [methodsNarrative, setMethodsNarrative] = useState("");
  const [budgetNarrative, setBudgetNarrative] = useState("");

  function handleNextToStep2() {
    setError(null);
    if (!fullName.trim()) {
      setError("Full name is required");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setStep(2);
  }

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
    setStep(4);
  }

  function handleNextToStep5() {
    setError(null);
    if (profileMode === "documents" && !narrativeFile && additionalFiles.length === 0) {
      setError("Please upload at least one document");
      return;
    }
    // Submit directly after profile step
    handleSubmit();
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

    let result;
    if (isAuthenticated) {
      result = await registerOrganizationForExistingUser({
        org: orgData,
        questionnaire,
        plan: selectedPlan,
      });
    } else {
      result = await registerOrganization({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        org: orgData,
        questionnaire,
        plan: selectedPlan,
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
              Registration Submitted
            </CardTitle>
            <CardDescription>
              {isAgency ? (
                <>
                  Your agency <strong>{agencyName}</strong> has been registered
                  and is pending admin approval. You will be able to access the
                  agency dashboard once approved.
                </>
              ) : (
                <>
                  Your organization <strong>{orgName}</strong> has been registered
                  and is pending admin approval. You will be able to access the
                  dashboard once approved.
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
    : ["Create your account", "Choose your plan", "Organization details", "Organization profile"];
  const currentStepLabel = isAuthenticated
    ? stepLabels[step]
    : stepLabels[step - 1];
  const totalSteps = isAgencyFlow ? 3 : (isAuthenticated ? 4 : 4);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-8">
      <Card className={`w-full ${step === 2 ? "max-w-3xl" : "max-w-lg"}`}>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Fundory.ai</CardTitle>
          <CardDescription>{currentStepLabel}</CardDescription>
          <div className="flex items-center justify-center gap-2 pt-2">
            {!isAuthenticated && (
              <div
                className={`h-2 w-12 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`}
              />
            )}
            {Array.from({ length: isAgencyFlow ? 2 : 3 }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-12 rounded-full ${step >= i + 2 ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {/* Step 1: Account */}
          {step === 1 && (
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
              <Button onClick={handleNextToStep2} className="w-full">
                Next
              </Button>
            </div>
          )}

          {/* Step 2: Plan Selection */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(Object.entries(PLANS) as [PlanId, typeof PLANS[PlanId]][]).map(([planId, plan]) => (
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
                    <p className="text-2xl font-bold mt-1">
                      {plan.price === 0 ? "Free" : `$${plan.price}`}
                      {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                    </p>
                    {plan.price > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{TRIAL_DAYS}-day free trial</p>
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
                ))}
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
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setStep(2);
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
    </div>
  );
}
