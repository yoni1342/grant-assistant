"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User } from "@supabase/supabase-js"
import { ProfileTab } from "./profile-tab"
import { OrganizationTab } from "./organization-tab"
import { IntegrationsTab } from "./integrations-tab"
import { AppearanceTab } from "./appearance-tab"
import type { Tables } from "@/lib/supabase/database.types"

type Profile = Tables<"profiles">
type Organization = Tables<"organizations">
type WorkflowExecution = Tables<"workflow_executions">

export interface OrgFetchSchedule {
  last_grant_fetch_at: string | null
  queue_position: number
  hours_until_next_fetch: number
  estimated_next_fetch_at: string
}

export interface SettingsData {
  user: User
  profile: Profile & { organization: Organization | null }
  members: Profile[]
  workflows: WorkflowExecution[]
  fetchSchedule: OrgFetchSchedule | null
}

export function SettingsClient({ data }: { data: SettingsData }) {
  const isAdmin = data.profile.role === "admin"

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-2 mb-8">
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">Settings</h1>
        <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
          Manage your account and application preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList variant="line" data-tour="settings-tabs">
          <TabsTrigger value="profile" className="text-xs sm:text-sm px-2 sm:px-3">Profile</TabsTrigger>
          <TabsTrigger value="organization" className="text-xs sm:text-sm px-2 sm:px-3">Organization</TabsTrigger>
          {isAdmin && <TabsTrigger value="integrations" className="text-xs sm:text-sm px-2 sm:px-3">Integrations</TabsTrigger>}
          <TabsTrigger value="appearance" className="text-xs sm:text-sm px-2 sm:px-3">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab user={data.user} profile={data.profile} />
        </TabsContent>

        <TabsContent value="organization">
          <OrganizationTab
            profile={data.profile}
            organization={data.profile.organization}
            members={data.members}
            fetchSchedule={data.fetchSchedule}
          />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="integrations">
            <IntegrationsTab workflows={data.workflows} />
          </TabsContent>
        )}

        <TabsContent value="appearance">
          <AppearanceTab
            preferences={(data.profile.preferences as Record<string, string>) || {}}
            plan={(data.profile.organization as Record<string, unknown> | null)?.plan as string | undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
