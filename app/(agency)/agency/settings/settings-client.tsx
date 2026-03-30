"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Anchorage", "Pacific/Honolulu", "America/Phoenix", "America/Toronto",
  "America/Vancouver", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata", "Australia/Sydney", "Pacific/Auckland",
];

const DATE_FORMATS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
] as const;

function formatPreview(format: string) {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const y = now.getFullYear();
  switch (format) {
    case "DD/MM/YYYY": return `${d}/${m}/${y}`;
    case "YYYY-MM-DD": return `${y}-${m}-${d}`;
    default: return `${m}/${d}/${y}`;
  }
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

interface AgencySettingsClientProps {
  user: User;
  agency: {
    id: string;
    name: string;
    created_at: string;
    subscription_status: string | null;
    trial_ends_at: string | null;
  };
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    role: string | null;
    preferences: unknown;
  };
  orgCount: number;
}

export function AgencySettingsClient({ user, agency, profile, orgCount }: AgencySettingsClientProps) {
  const router = useRouter();

  // Agency details state
  const [agencyName, setAgencyName] = useState(agency.name);
  const [savingAgency, setSavingAgency] = useState(false);

  // Profile state
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [email, setEmail] = useState(profile.email || user.email || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const isOAuth = user.app_metadata?.provider && user.app_metadata.provider !== "email";

  // Appearance state
  const { theme, setTheme } = useTheme();
  const prefs = (profile.preferences as Record<string, string>) || {};
  const [timezone, setTimezone] = useState(
    prefs.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [dateFormat, setDateFormat] = useState(prefs.date_format || "MM/DD/YYYY");

  async function updatePreference(key: string, value: string) {
    try {
      const supabase = createClient();
      const { data: p } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", profile.id)
        .single();
      const existing = (p?.preferences as Record<string, unknown>) || {};
      const merged = { ...existing, [key]: value };
      const { error } = await supabase
        .from("profiles")
        .update({ preferences: merged })
        .eq("id", profile.id);
      if (error) throw error;
    } catch {
      toast.error("Failed to save preference");
    }
  }

  async function handleSaveAgency() {
    if (!agencyName.trim()) {
      toast.error("Agency name is required");
      return;
    }
    setSavingAgency(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("agencies")
        .update({ name: agencyName.trim(), updated_at: new Date().toISOString() })
        .eq("id", agency.id);
      if (error) throw error;
      toast.success("Agency updated");
      router.refresh();
    } catch {
      toast.error("Failed to update agency");
    } finally {
      setSavingAgency(false);
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const supabase = createClient();
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName, email })
        .eq("id", profile.id);
      if (profileError) throw profileError;

      if (email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email });
        if (authError) throw authError;
        toast.info("A confirmation email has been sent to your new address.");
      }

      toast.success("Profile updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${profile.id}/${Date.now()}-avatar.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id);
      setAvatarUrl(publicUrl);
      toast.success("Avatar updated");
    } catch {
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-2 mb-8">
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">Settings</h1>
        <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
          Manage your agency account and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList variant="line">
          <TabsTrigger value="profile">Profile & Account</TabsTrigger>
          <TabsTrigger value="agency">Agency Details</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        {/* Profile & Account Tab */}
        <TabsContent value="profile">
          <div className="space-y-6">
            {/* Profile Info */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your name, email, and profile photo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar className="size-16">
                    <AvatarImage src={avatarUrl} alt={fullName} />
                    <AvatarFallback className="text-lg">{getInitials(fullName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="size-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="size-4 mr-2" />
                      )}
                      {uploading ? "Uploading..." : "Change Photo"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPEG, or WebP. Max 2MB.
                    </p>
                  </div>
                </div>

                {/* Name / Email */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input
                      id="full-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile || (fullName === (profile.full_name || "") && email === (profile.email || user.email || ""))}
                >
                  {savingProfile && <Loader2 className="size-4 animate-spin mr-2" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* Change Password */}
            {!isOAuth && (
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPassword || !currentPassword || !newPassword}
                  >
                    {changingPassword && <Loader2 className="size-4 animate-spin mr-2" />}
                    Change Password
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Agency Details Tab */}
        <TabsContent value="agency">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Agency Details</CardTitle>
                <CardDescription>
                  Information about your agency account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agency-name">Agency Name *</Label>
                  <Input
                    id="agency-name"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">
                      {new Date(agency.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Organizations</p>
                    <p className="text-sm font-medium">{orgCount}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Subscription</p>
                    <Badge variant={agency.subscription_status === "active" || agency.subscription_status === "trialing" ? "default" : "destructive"}>
                      {agency.subscription_status || "active"}
                    </Badge>
                    {agency.subscription_status === "trialing" && agency.trial_ends_at && (
                      <p className="text-xs text-muted-foreground">
                        Trial ends {new Date(agency.trial_ends_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleSaveAgency}
                  disabled={savingAgency || agencyName === agency.name}
                >
                  {savingAgency && <Loader2 className="size-4 animate-spin mr-2" />}
                  Save Agency
                </Button>
              </CardContent>
            </Card>

            {/* Account Owner Info */}
            <Card>
              <CardHeader>
                <CardTitle>Account Owner</CardTitle>
                <CardDescription>
                  The primary account holder for this agency.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="size-12">
                    <AvatarImage src={avatarUrl} alt={fullName} />
                    <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{fullName || "—"}</p>
                    <p className="text-sm text-muted-foreground">{email}</p>
                    <Badge variant="default" className="mt-1">Owner</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        {/* Appearance Tab */}
        <TabsContent value="appearance">
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
                <Select
                  value={theme || "system"}
                  onValueChange={(value) => {
                    setTheme(value);
                    updatePreference("theme", value);
                  }}
                >
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
                <Select
                  value={timezone}
                  onValueChange={(value) => {
                    setTimezone(value);
                    updatePreference("timezone", value);
                    toast.success("Timezone updated");
                  }}
                >
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
                <Select
                  value={dateFormat}
                  onValueChange={(value) => {
                    setDateFormat(value);
                    updatePreference("date_format", value);
                    toast.success("Date format updated");
                  }}
                >
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
