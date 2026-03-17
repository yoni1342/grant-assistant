"use client"

import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { Loader2, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { updateOrganization, updateMemberRole, removeMember } from "../actions"
import { InviteMemberDialog } from "./invite-member-dialog"
import type { Tables } from "@/lib/supabase/database.types"

type Profile = Tables<"profiles">
type Organization = Tables<"organizations">

function getInitials(name: string | null) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

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
]

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
  "West Virginia", "Wisconsin", "Wyoming", "National",
]

interface OrganizationTabProps {
  profile: Profile
  organization: Organization | null
  members: Profile[]
}

export function OrganizationTab({ profile, organization, members }: OrganizationTabProps) {
  const [saving, setSaving] = useState(false)
  const isAdmin = profile.role === "owner" || profile.role === "admin"

  // Org form state
  const [orgName, setOrgName] = useState(organization?.name || "")
  const [description, setDescription] = useState(organization?.description || "")
  const [mission, setMission] = useState(organization?.mission || "")
  const [ein, setEin] = useState(organization?.ein || "")
  const [address, setAddress] = useState(organization?.address || "")
  const [phone, setPhone] = useState(organization?.phone || "")
  const [orgEmail, setOrgEmail] = useState(organization?.email || "")
  const [website, setWebsite] = useState(organization?.website || "")
  const [foundingYear, setFoundingYear] = useState(
    organization?.founding_year?.toString() || ""
  )
  const [sector, setSector] = useState(organization?.sector || "")
  const [geographicFocus, setGeographicFocus] = useState<string[]>(
    organization?.geographic_focus || []
  )
  const [stateSearch, setStateSearch] = useState("")
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false)
  const stateDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
        setStateDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredStates = US_STATES.filter(
    (s) =>
      s.toLowerCase().includes(stateSearch.toLowerCase()) &&
      !geographicFocus.includes(s)
  )

  function toggleState(state: string) {
    setGeographicFocus((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    )
  }

  async function handleSaveOrg() {
    if (!orgName.trim()) {
      toast.error("Organization name is required")
      return
    }
    setSaving(true)
    const result = await updateOrganization({
      name: orgName,
      description: description || undefined,
      mission: mission || undefined,
      ein: ein || undefined,
      address: address || undefined,
      phone: phone || undefined,
      email: orgEmail || undefined,
      website: website || undefined,
      founding_year: foundingYear ? parseInt(foundingYear) : null,
      sector: sector || undefined,
      geographic_focus: geographicFocus.length > 0 ? geographicFocus : null,
    })
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Organization updated")
    }
  }

  async function handleRoleChange(memberId: string, role: string) {
    const result = await updateMemberRole(memberId, role)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Role updated")
    }
  }

  async function handleRemoveMember(memberId: string) {
    const result = await removeMember(memberId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Member removed")
    }
  }

  if (!organization) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No organization found. Contact your administrator.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Information about your nonprofit organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name *</Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-ein">EIN</Label>
              <Input
                id="org-ein"
                value={ein}
                onChange={(e) => setEin(e.target.value)}
                placeholder="XX-XXXXXXX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-description">Description</Label>
            <Textarea
              id="org-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your organization"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-mission">Mission Statement</Label>
            <Textarea
              id="org-mission"
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              placeholder="Your organization's mission"
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="org-email">Email</Label>
              <Input
                id="org-email"
                type="email"
                value={orgEmail}
                onChange={(e) => setOrgEmail(e.target.value)}
                placeholder="contact@org.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-phone">Phone</Label>
              <Input
                id="org-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-address">Address</Label>
            <Input
              id="org-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address, City, State, ZIP"
            />
          </div>

          <div className="space-y-2">
            <Label>Geographic Focus</Label>
            <p className="text-xs text-muted-foreground">
              Select the states/regions your organization serves. This is used for grant matching and filtering.
            </p>
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
                      onClick={() => toggleState(state)}
                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="size-3" />
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
                  setStateSearch(e.target.value)
                  setStateDropdownOpen(true)
                }}
                onFocus={() => setStateDropdownOpen(true)}
              />
              {stateDropdownOpen && filteredStates.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                  {filteredStates.map((state) => (
                    <button
                      key={state}
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        toggleState(state)
                        setStateSearch("")
                      }}
                    >
                      {state}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="org-website">Website</Label>
              <Input
                id="org-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-year">Founding Year</Label>
              <Input
                id="org-year"
                type="number"
                value={foundingYear}
                onChange={(e) => setFoundingYear(e.target.value)}
                placeholder="2000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-sector">Sector</Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger id="org-sector">
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

          <Button
            onClick={handleSaveOrg}
            disabled={saving || (
              orgName === (organization?.name || "") &&
              description === (organization?.description || "") &&
              mission === (organization?.mission || "") &&
              ein === (organization?.ein || "") &&
              address === (organization?.address || "") &&
              phone === (organization?.phone || "") &&
              orgEmail === (organization?.email || "") &&
              website === (organization?.website || "") &&
              foundingYear === (organization?.founding_year?.toString() || "") &&
              sector === (organization?.sector || "") &&
              JSON.stringify(geographicFocus) === JSON.stringify(organization?.geographic_focus || [])
            )}
          >
            {saving && <Loader2 className="size-4 animate-spin mr-2" />}
            Save Organization
          </Button>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage who has access to your organization.
            </CardDescription>
          </div>
          {isAdmin && <InviteMemberDialog />}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {isAdmin && <TableHead className="w-[50px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarImage src={member.avatar_url || ""} />
                        <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {member.full_name || "Unnamed"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.email}
                  </TableCell>
                  <TableCell>
                    {isAdmin && member.id !== profile.id && member.role !== "owner" ? (
                      <Select
                        value={member.role || "member"}
                        onValueChange={(val) => handleRoleChange(member.id, val)}
                      >
                        <SelectTrigger className="w-[110px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                        {member.role || "member"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.created_at
                      ? new Date(member.created_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {member.id !== profile.id && member.role !== "owner" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <Trash2 className="size-4 text-muted-foreground" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove{" "}
                                <strong>{member.full_name || member.email}</strong> from
                                the organization? They will lose access immediately.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => handleRemoveMember(member.id)}
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No team members found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
