"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, X, FileText, ClipboardList, Upload, Check } from "lucide-react";
import Link from "next/link";

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

export default function NewOrganizationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [stateSearch, setStateSearch] = useState("");
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    name: "",
    ein: "",
    mission: "",
    sector: "",
    address: "",
    phone: "",
    website: "",
    founding_year: "",
    description: "",
  });

  // Profile mode
  const [profileMode, setProfileMode] = useState<"documents" | "questionnaire" | null>(null);

  // Documents
  const [narrativeFile, setNarrativeFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);

  // Questionnaire
  const [annualBudget, setAnnualBudget] = useState("");
  const [staffCount, setStaffCount] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [missionNarrative, setMissionNarrative] = useState("");
  const [impactNarrative, setImpactNarrative] = useState("");
  const [methodsNarrative, setMethodsNarrative] = useState("");
  const [budgetNarrative, setBudgetNarrative] = useState("");

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
      !selectedStates.includes(s)
  );

  function toggleState(state: string) {
    setSelectedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
    setStateSearch("");
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

  function handleNextToProfile() {
    setError(null);
    if (!form.name.trim()) {
      setError("Organization name is required");
      return;
    }
    if (selectedStates.length === 0) {
      setError("Please select at least one geographic focus area");
      return;
    }
    setStep(2);
  }

  function handleSubmitFromProfile() {
    setError(null);
    if (profileMode === "documents" && !narrativeFile && additionalFiles.length === 0) {
      setError("Please upload at least one document");
      return;
    }
    handleSubmit();
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      // Build questionnaire data if in questionnaire mode
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

      // Create org
      const res = await fetch("/api/agency/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          founding_year: form.founding_year ? parseInt(form.founding_year) : null,
          geographic_focus: selectedStates,
          questionnaire,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create organization");
      }

      const { org } = await res.json();

      // Upload documents if that mode was selected
      if (profileMode === "documents" && org?.id) {
        const formData = new FormData();
        formData.append("orgId", org.id);
        if (narrativeFile) formData.append("narrativeFile", narrativeFile);
        for (const f of additionalFiles) {
          formData.append("additionalFiles", f);
        }

        const uploadRes = await fetch("/api/agency/organizations/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json();
          console.error("Document upload error:", uploadData.error);
        }
      }

      router.push("/agency/organizations");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const stepLabels = ["Organization Details", "Organization Profile"];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/agency/organizations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            New Organization
          </h1>
          <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
            Add an organization to your agency
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step > i + 1
                  ? "bg-primary text-primary-foreground"
                  : step === i + 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step > i + 1 ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={`text-xs ${
                step === i + 1 ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < stepLabels.length - 1 && (
              <div className="h-px w-8 bg-muted-foreground/30" />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && "Organization Details"}
            {step === 2 && !profileMode && "Organization Profile"}
            {step === 2 && profileMode === "documents" && "Upload Documents"}
            {step === 2 && profileMode === "questionnaire" && "Organization Questionnaire"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Enter the basic details for this organization."}
            {step === 2 && !profileMode && "Help us understand this organization better. Choose one option:"}
            {step === 2 && profileMode === "documents" && "Upload narrative and supporting documents for this organization."}
            {step === 2 && profileMode === "questionnaire" && "Fill out details about this organization for grant applications."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-4">
              {error}
            </div>
          )}

          {/* Step 1: Organization Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Community Foundation of Greater Portland"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ein">EIN</Label>
                  <Input
                    id="ein"
                    value={form.ein}
                    onChange={(e) => setForm({ ...form, ein: e.target.value })}
                    placeholder="XX-XXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sector">Sector</Label>
                  <Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mission">Mission Statement</Label>
                <Textarea
                  id="mission"
                  value={form.mission}
                  onChange={(e) => setForm({ ...form, mission: e.target.value })}
                  placeholder="Briefly describe the organization's mission..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="A more detailed description of the organization..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="123 Main St, City, State"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://example.org"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="founding_year">Founding Year</Label>
                  <Input
                    id="founding_year"
                    type="number"
                    value={form.founding_year}
                    onChange={(e) => setForm({ ...form, founding_year: e.target.value })}
                    placeholder="2005"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Geographic Focus *</Label>
                {selectedStates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStates.map((state) => (
                      <Badge
                        key={state}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {state}
                        <button
                          type="button"
                          onClick={() => setSelectedStates((prev) => prev.filter((s) => s !== state))}
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

              <div className="flex justify-end gap-3 pt-4">
                <Link href="/agency/organizations">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button onClick={handleNextToProfile}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Profile mode selection */}
          {step === 2 && !profileMode && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setProfileMode("documents")}
                  className="flex flex-col items-center gap-3 rounded-lg border-2 border-muted p-6 text-center transition-colors hover:border-primary hover:bg-muted/50"
                >
                  <FileText className="h-10 w-10 text-primary" />
                  <div>
                    <p className="font-medium">Upload Documents</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload narrative and supporting documents
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
                      Fill out a questionnaire about the organization
                    </p>
                  </div>
                </button>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
                className="w-full"
              >
                Back
              </Button>
            </div>
          )}

          {/* Step 2: Document upload */}
          {step === 2 && profileMode === "documents" && (
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
                  onClick={handleSubmitFromProfile}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {loading ? "Creating..." : "Create Organization"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Questionnaire */}
          {step === 2 && profileMode === "questionnaire" && (
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
                  placeholder="Describe what the organization does..."
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="executiveSummary">Executive Summary</Label>
                <Textarea
                  id="executiveSummary"
                  placeholder="Brief summary of the organization for grant applications..."
                  value={executiveSummary}
                  onChange={(e) => setExecutiveSummary(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="missionNarrative">Mission Narrative</Label>
                <Textarea
                  id="missionNarrative"
                  placeholder="Describe the organization's mission in detail..."
                  value={missionNarrative}
                  onChange={(e) => setMissionNarrative(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="impactNarrative">Impact Narrative</Label>
                <Textarea
                  id="impactNarrative"
                  placeholder="Describe the impact the organization has made..."
                  value={impactNarrative}
                  onChange={(e) => setImpactNarrative(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="methodsNarrative">Methods & Approach</Label>
                <Textarea
                  id="methodsNarrative"
                  placeholder="Describe programs and methods..."
                  value={methodsNarrative}
                  onChange={(e) => setMethodsNarrative(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="budgetNarrative">Budget Narrative</Label>
                <Textarea
                  id="budgetNarrative"
                  placeholder="Describe how the organization uses its funds..."
                  value={budgetNarrative}
                  onChange={(e) => setBudgetNarrative(e.target.value)}
                  rows={3}
                />
              </div>

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
                  onClick={handleSubmitFromProfile}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {loading ? "Creating..." : "Create Organization"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
