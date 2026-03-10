"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  updateProfile,
  changePassword,
  updatePreferences,
} from "@/app/(dashboard)/settings/actions";

interface SettingsClientProps {
  profile: {
    full_name: string;
    email: string;
  };
  preferences: {
    theme?: string;
    timezone?: string;
    date_format?: string;
  };
}

export function SettingsClient({ profile, preferences }: SettingsClientProps) {
  // Profile state
  const [name, setName] = useState(profile.full_name);
  const [email, setEmail] = useState(profile.email);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  // Preferences state
  const { theme, setTheme } = useTheme();
  const [timezone, setTimezone] = useState(
    preferences.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [dateFormat, setDateFormat] = useState(
    preferences.date_format || "MM/DD/YYYY"
  );
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState("");

  async function handleProfileSave() {
    setProfileLoading(true);
    setProfileMessage("");
    const result = await updateProfile(name, email);
    setProfileMessage(result.error || "Profile updated successfully");
    setProfileLoading(false);
  }

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage("Password must be at least 6 characters");
      return;
    }
    setPasswordLoading(true);
    setPasswordMessage("");
    const result = await changePassword(currentPassword, newPassword);
    setPasswordMessage(result.error || "Password changed successfully");
    if (result.success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPasswordLoading(false);
  }

  function handleThemeChange(value: string) {
    setTheme(value);
    updatePreferences({ theme: value as "light" | "dark" | "system" });
  }

  async function handlePrefsSave() {
    setPrefsLoading(true);
    setPrefsMessage("");
    const result = await updatePreferences({
      theme: (theme || "system") as "light" | "dark" | "system",
      timezone,
      date_format: dateFormat as "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD",
    });
    setPrefsMessage(result.error || "Preferences saved successfully");
    setPrefsLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account and preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList variant="line">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {profileMessage && (
                <p
                  className={`text-sm ${profileMessage.includes("success") ? "text-green-600" : "text-red-600"}`}
                >
                  {profileMessage}
                </p>
              )}
              <Button onClick={handleProfileSave} disabled={profileLoading}>
                {profileLoading ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {passwordMessage && (
                <p
                  className={`text-sm ${passwordMessage.includes("success") ? "text-green-600" : "text-red-600"}`}
                >
                  {passwordMessage}
                </p>
              )}
              <Button onClick={handlePasswordChange} disabled={passwordLoading}>
                {passwordLoading ? "Changing..." : "Change Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how the app looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={theme || "system"} onValueChange={handleThemeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="e.g., America/New_York"
                />
              </div>
              <div className="space-y-2">
                <Label>Date Format</Label>
                <Select value={dateFormat} onValueChange={setDateFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {prefsMessage && (
                <p
                  className={`text-sm ${prefsMessage.includes("success") ? "text-green-600" : "text-red-600"}`}
                >
                  {prefsMessage}
                </p>
              )}
              <Button onClick={handlePrefsSave} disabled={prefsLoading}>
                {prefsLoading ? "Saving..." : "Save Preferences"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
