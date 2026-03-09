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

export interface SettingsData {
  user: User
  profile: Profile & { organization: Organization | null }
  members: Profile[]
  workflows: WorkflowExecution[]
}

export function SettingsClient({ data }: { data: SettingsData }) {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList variant="line">
          <TabsTrigger value="profile">Profile & Account</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab user={data.user} profile={data.profile} />
        </TabsContent>

        <TabsContent value="organization">
          <OrganizationTab
            profile={data.profile}
            organization={data.profile.organization}
            members={data.members}
          />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsTab workflows={data.workflows} />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceTab
            preferences={(data.profile.preferences as Record<string, string>) || {}}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
