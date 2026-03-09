"use client";

import { useState } from "react";
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
import { registerOrganization, registerOrganizationForExistingUser } from "./actions";

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

interface RegisterWizardProps {
  isAuthenticated: boolean;
  userEmail?: string;
  userName?: string;
}

export function RegisterWizard({ isAuthenticated, userEmail, userName }: RegisterWizardProps) {
  const [step, setStep] = useState(isAuthenticated ? 2 : 1);
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
  const [orgEmail, setOrgEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [foundingYear, setFoundingYear] = useState("");

  function handleNext() {
    setError(null);
    if (!fullName.trim()) { setError("Full name is required"); return; }
    if (!email.trim()) { setError("Email is required"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setStep(2);
  }

  async function handleSubmit() {
    setError(null);
    if (!orgName.trim()) { setError("Organization name is required"); return; }

    setLoading(true);
    const orgData = {
      name: orgName.trim(),
      ein: ein.trim() || undefined,
      mission: mission.trim() || undefined,
      sector: sector || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      email: orgEmail.trim() || undefined,
      website: website.trim() || undefined,
      founding_year: foundingYear ? parseInt(foundingYear) : null,
    };

    let result;
    if (isAuthenticated) {
      result = await registerOrganizationForExistingUser(orgData);
    } else {
      result = await registerOrganization({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        org: orgData,
      });
    }

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold">
              Registration Submitted
            </CardTitle>
            <CardDescription>
              Your organization <strong>{orgName}</strong> has been registered
              and is pending admin approval. You will be able to access the
              dashboard once approved.
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">
            Fundory.ai
          </CardTitle>
          <CardDescription>
            {step === 1 ? "Create your account" : "Organization details"}
          </CardDescription>
          <div className="flex items-center justify-center gap-2 pt-2">
            {!isAuthenticated && (
              <div className={`h-2 w-16 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            )}
            <div className={`h-2 w-16 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          </div>
        </CardHeader>
        <CardContent>
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
              <Button onClick={handleNext} className="w-full">
                Next
              </Button>
            </div>
          )}

          {step === 2 && (
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
                        <SelectItem key={s} value={s}>{s}</SelectItem>
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
                  <Label htmlFor="orgEmail">Organization Email</Label>
                  <Input
                    id="orgEmail"
                    type="email"
                    placeholder="info@org.com"
                    value={orgEmail}
                    onChange={(e) => setOrgEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3">
                {!isAuthenticated && (
                  <Button variant="outline" onClick={() => { setStep(1); setError(null); }} className="flex-1">
                    Back
                  </Button>
                )}
                <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                  {loading ? "Submitting..." : "Register Organization"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-foreground hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
