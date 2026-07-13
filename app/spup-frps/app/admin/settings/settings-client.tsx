"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Ban, BellRing, Download, MailPlus, PencilLine, Shield, Target, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { FacultyInviteDialog } from "@/components/admin/faculty-invite-dialog"
import { AdminSectionHeader, AdminSummaryStrip } from "@/components/admin/admin-page-primitives"
import { AdminSettingsSkeleton } from "@/components/admin/admin-page-skeletons"
import { ThemeModeSelector } from "@/components/shared/theme-mode-selector"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { APP_DEVELOPER_EMAIL, APP_DEVELOPER_NAME, APP_VERSION } from "@/lib/app-meta"
import { useAuth } from "@/lib/auth-context"
import {
  DECISION_SUPPORT_READINESS_FIELDS,
  DECISION_SUPPORT_RISK_FIELDS,
  cloneDecisionSupportConfig,
} from "@/lib/decision-support"
import { useAdminSettingsBootstrapQuery } from "@/lib/query/admin"
import { queryKeys } from "@/lib/query/query-keys"
import { AdminService } from "@/lib/services/admin-service"
import type {
  AdminBroadcastPayload,
  AdminBroadcastRecord,
  AdminFacultyListItem,
  AdminSettingsBootstrapData,
  AdminUserListItem,
  DecisionSupportConfig,
  FacultyInvitePayload,
  FacultyInviteRecord,
  UserRole,
} from "@/lib/types"
import { decisionSupportConfigSchema } from "@/lib/validation/decision-support"

type DecisionSupportNumericSection =
  | "readinessWeights"
  | "riskWeights"
  | "thresholds"
  | "dashboard"

type DecisionSupportBandSection = keyof DecisionSupportConfig["bands"]
type DecisionSupportBandKey = keyof DecisionSupportConfig["bands"]["readiness"]

function upsertById<T extends { id: string }>(items: T[], nextItem: T) {
  const nextItems = items.filter((item) => item.id !== nextItem.id)
  return [nextItem, ...nextItems]
}

function parseIntegerInput(value: string, fallback = 0) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getRoleLabel(role: UserRole) {
  if (role === "main-admin") {
    return "Main Admin"
  }

  if (role === "secondary-admin") {
    return "Secondary Admin"
  }

  return "Faculty"
}

function getAdminRole(user: AdminUserListItem): Extract<UserRole, "main-admin" | "secondary-admin"> {
  return user.roles.includes("main-admin") ? "main-admin" : "secondary-admin"
}

function formatLabel(value: string) {
  return value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function formatLastSeen(value: string | null) {
  if (!value) {
    return "Never"
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function getInitials(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0))
    .join("")
    .slice(0, 2)

  return initials.toUpperCase() || "AD"
}

const decisionSupportThresholdFields: Array<{
  key: keyof DecisionSupportConfig["thresholds"]
  label: string
  description: string
}> = [
  { key: "publicationTarget", label: "Publication target", description: "Minimum publication count to satisfy the compliance check." },
  { key: "indexedPublicationTarget", label: "Indexed publication target", description: "Minimum indexed publication count used in scoring." },
  { key: "engagementTarget", label: "Engagement target", description: "Required engagement count before the target is marked complete." },
  { key: "researchTarget", label: "Research target", description: "Required research title count before the target is marked complete." },
  { key: "staleLoginDays", label: "Stale login window", description: "Days without a login before priority increases for inactivity." },
]

const decisionSupportDashboardFields: Array<{
  key: keyof DecisionSupportConfig["dashboard"]
  label: string
  description: string
}> = [
  { key: "facultyLimit", label: "Faculty review limit", description: "How many faculty rows appear in dashboard and snapshot review lists." },
  { key: "departmentLimit", label: "Department review limit", description: "How many department rows appear in dashboard and snapshot review lists." },
]

const exportActions: Array<{
  key: "faculty" | "publications" | "engagements" | "research"
  label: string
  description: string
}> = [
  { key: "faculty", label: "Faculty export", description: "Accounts, roles, department assignment, and completion metrics." },
  { key: "publications", label: "Publications export", description: "Publication records, indexing, and linked faculty." },
  { key: "engagements", label: "Engagements export", description: "Community engagements, status, schedule, and beneficiaries." },
  { key: "research", label: "Research export", description: "Research titles, status, funding, and linked faculty." },
]

export default function AdminSettingsPage() {
  const queryClient = useQueryClient()
  const { isMainAdmin } = useAuth()
  const settingsBootstrapQuery = useAdminSettingsBootstrapQuery()

  const [adminUsers, setAdminUsers] = useState<AdminUserListItem[]>([])
  const [invites, setInvites] = useState<FacultyInviteRecord[]>([])
  const [facultyRows, setFacultyRows] = useState<AdminFacultyListItem[]>([])
  const [broadcasts, setBroadcasts] = useState<AdminBroadcastRecord[]>([])
  const [decisionSupportConfig, setDecisionSupportConfig] = useState<DecisionSupportConfig | null>(null)
  const [decisionSupportDefaults, setDecisionSupportDefaults] = useState<DecisionSupportConfig | null>(null)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [editingInvite, setEditingInvite] = useState<FacultyInviteRecord | null>(null)
  const [isSavingInvite, setIsSavingInvite] = useState(false)
  const [adminEmail, setAdminEmail] = useState("")
  const [adminRole, setAdminRole] = useState<Extract<UserRole, "main-admin" | "secondary-admin">>("secondary-admin")
  const [adminScope, setAdminScope] = useState<"admin-only" | "faculty">("admin-only")
  const [broadcastTitle, setBroadcastTitle] = useState("")
  const [broadcastMessage, setBroadcastMessage] = useState("")
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false)
  const [isSavingDecisionSupport, setIsSavingDecisionSupport] = useState(false)

  const applyBootstrap = (data: AdminSettingsBootstrapData) => {
    setAdminUsers([...data.adminUsers].sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" })))
    setInvites([...data.invites].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()))
    setFacultyRows(
      [...data.inactiveFaculty].sort((left, right) =>
        (left.name ?? left.email).localeCompare(right.name ?? right.email, undefined, { sensitivity: "base" })
      )
    )
    setBroadcasts([...data.broadcasts].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()))
    setDecisionSupportConfig(cloneDecisionSupportConfig(data.decisionSupportConfig))
    setDecisionSupportDefaults(cloneDecisionSupportConfig(data.decisionSupportDefaults))
  }

  useEffect(() => {
    if (settingsBootstrapQuery.data) {
      applyBootstrap(settingsBootstrapQuery.data)
    }
  }, [settingsBootstrapQuery.data])

  const inactiveFaculty = useMemo(
    () => facultyRows.filter((row) => row.recordType === "user" && row.access_status === "inactive"),
    [facultyRows]
  )
  const mainAdminCount = useMemo(
    () => adminUsers.filter((user) => user.roles.includes("main-admin")).length,
    [adminUsers]
  )

  const summaryItems = [
    { label: "Admin Users", value: adminUsers.length, detail: `${mainAdminCount} main admin${mainAdminCount === 1 ? "" : "s"} with full control`, icon: Shield },
    { label: "Pending Invites", value: invites.length, detail: "Faculty or admin access waiting for first sign-in", icon: MailPlus },
    { label: "Inactive Faculty", value: inactiveFaculty.length, detail: "Profiles that can be restored without data loss", icon: UserCheck },
    { label: "Broadcasts", value: broadcasts.length, detail: "Announcements already sent to opted-in users", icon: BellRing },
  ] satisfies Array<{ label: string; value: string | number; detail: string; icon: typeof Shield }>

  const sectionNavItems = [
    { id: "admin-users", label: "Admin Users", count: adminUsers.length },
    { id: "faculty-invites", label: "Access Invites", count: invites.length },
    { id: "access-status", label: "Access Status", count: inactiveFaculty.length },
    { id: "decision-rules", label: "Compliance Rules" },
    { id: "appearance", label: "Appearance" },
    { id: "broadcasts", label: "Broadcasts", count: broadcasts.length },
    { id: "exports", label: "Exports" },
    { id: "app-info", label: "App Info" },
  ]

  const handleAdminSubmit = async () => {
    try {
      const result = await AdminService.upsertAdmin({
        email: adminEmail.trim(),
        role: adminRole,
        includeFaculty: adminScope === "faculty",
      })

      toast.success("Admin access saved.")
      setAdminEmail("")
      setAdminRole("secondary-admin")
      setAdminScope("admin-only")

      if ("invite_status" in result) {
        setInvites((current) =>
          upsertById(current, result).sort(
            (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
          )
        )
        return
      }

      setAdminUsers((current) =>
        upsertById(current, result).sort((left, right) =>
          left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
        )
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save admin access.")
    }
  }

  const handleAdminRoleUpdate = async (
    adminUser: AdminUserListItem,
    role: Extract<UserRole, "main-admin" | "secondary-admin">,
    options?: {
      includeFaculty?: boolean
    }
  ) => {
    const isRemovingLastMainAdmin =
      role !== "main-admin" &&
      adminUser.roles.includes("main-admin") &&
      mainAdminCount <= 1

    if (isRemovingLastMainAdmin) {
      toast.error("Keep at least one main admin assigned.")
      return
    }

    try {
      const updatedUser = await AdminService.updateAdmin(adminUser.id, role, options)
      toast.success("Admin role updated.")
      setAdminUsers((current) =>
        upsertById(current, updatedUser).sort((left, right) =>
          left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
        )
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update admin role.")
    }
  }

  const handleAdminRoleRemoval = async (adminUser: AdminUserListItem) => {
    if (adminUser.roles.includes("main-admin") && mainAdminCount <= 1) {
      toast.error("Keep at least one main admin assigned.")
      return
    }

    try {
      const updatedUser = await AdminService.deleteAdmin(adminUser.id)
      toast.success("Admin role removed.")
      setAdminUsers((current) => {
        const nextUsers = updatedUser.roles.some(
          (role) => role === "main-admin" || role === "secondary-admin"
        )
          ? upsertById(current, updatedUser)
          : current.filter((item) => item.id !== updatedUser.id)

        return nextUsers.sort((left, right) =>
          left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
        )
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove admin role.")
    }
  }

  const handleInviteSubmit = async (payload: FacultyInvitePayload) => {
    setIsSavingInvite(true)

    try {
      const invite = editingInvite
        ? await AdminService.updateInvite(editingInvite.id, payload)
        : await AdminService.createFacultyInvite(payload)

      toast.success(editingInvite ? "Invite updated." : "Invite created.")
      setEditingInvite(null)
      setInvites((current) =>
        upsertById(current, invite).sort(
          (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
        )
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save invite.")
      throw error
    } finally {
      setIsSavingInvite(false)
    }
  }

  const handleInviteCancel = async (inviteId: string) => {
    try {
      await AdminService.cancelInvite(inviteId)
      toast.success("Invite cancelled.")
      setInvites((current) => current.filter((invite) => invite.id !== inviteId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to cancel invite.")
    }
  }

  const handleReactivateFaculty = async (userId: string) => {
    try {
      await AdminService.setFacultyAccessStatus(userId, "active")
      toast.success("Faculty access restored.")
      setFacultyRows((current) => current.filter((faculty) => faculty.id !== userId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reactivate faculty.")
    }
  }

  const handleBroadcastSubmit = async () => {
    const payload: AdminBroadcastPayload = {
      title: broadcastTitle.trim(),
      message: broadcastMessage.trim(),
    }

    setIsSendingBroadcast(true)

    try {
      const broadcast = await AdminService.sendBroadcast(payload)
      toast.success(
        broadcast.target_count > 0
          ? `Broadcast sent to ${broadcast.success_count} recipient${broadcast.success_count === 1 ? "" : "s"}.`
          : "Broadcast saved. No active opted-in recipients were available."
      )
      setBroadcastTitle("")
      setBroadcastMessage("")
      setBroadcasts((current) => [broadcast, ...current])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send broadcast.")
    } finally {
      setIsSendingBroadcast(false)
    }
  }

  const updateDecisionSupportSection = <
    Section extends DecisionSupportNumericSection,
    Key extends keyof DecisionSupportConfig[Section],
  >(
    section: Section,
    key: Key,
    value: number
  ) => {
    setDecisionSupportConfig((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        [section]: {
          ...current[section],
          [key]: value,
        },
      } as DecisionSupportConfig
    })
  }

  const updateDecisionSupportBand = (
    section: DecisionSupportBandSection,
    key: DecisionSupportBandKey,
    value: number
  ) => {
    setDecisionSupportConfig((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        bands: {
          ...current.bands,
          [section]: {
            ...current.bands[section],
            [key]: value,
          },
        },
      }
    })
  }

  const saveDecisionSupportConfig = async () => {
    const parsed = decisionSupportConfigSchema.safeParse(decisionSupportConfig)

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Unable to save compliance rules.")
      return
    }

    setIsSavingDecisionSupport(true)

    try {
      const savedConfig = await AdminService.updateDecisionSupportConfig(parsed.data)
      setDecisionSupportConfig(cloneDecisionSupportConfig(savedConfig))
      toast.success("Compliance and priority rules saved.")

      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.settingsBootstrap() })
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.decisionSupport() })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save compliance rules.")
    } finally {
      setIsSavingDecisionSupport(false)
    }
  }

  const handleDecisionSupportRestore = () => {
    if (!decisionSupportDefaults) {
      return
    }

    setDecisionSupportConfig(cloneDecisionSupportConfig(decisionSupportDefaults))
    toast.success("Default rules restored to the draft. Save to apply them.")
  }

  if (settingsBootstrapQuery.isLoading && !settingsBootstrapQuery.data) {
    return <AdminSettingsSkeleton />
  }

  if (!settingsBootstrapQuery.data || !decisionSupportConfig || !decisionSupportDefaults) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="space-y-2 text-center">
          <h1 className="text-lg font-semibold text-foreground">Unable to load admin settings</h1>
          <p className="text-sm text-muted-foreground">
            Refresh the page or try again after the settings bootstrap request completes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <FacultyInviteDialog
        open={inviteDialogOpen}
        onOpenChange={(open) => {
          setInviteDialogOpen(open)
          if (!open) {
            setEditingInvite(null)
          }
        }}
        onSubmit={handleInviteSubmit}
        initialInvite={editingInvite}
        isSaving={isSavingInvite}
        title={editingInvite ? "Edit Invite" : "Create Invite"}
        description="Queue faculty or admin access before the first Azure sign-in."
        submitLabel={editingInvite ? "Save Invite" : "Create Invite"}
      />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage access, invitations, scoring rules, system broadcasts, and operational exports in one workspace.
        </p>
      </div>

      <AdminSummaryStrip items={summaryItems} />

      <div className="grid gap-10 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-5 xl:self-start">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Sections
              </p>
            </div>
            <nav className="flex flex-wrap gap-2 xl:flex-col xl:gap-0">
              {sectionNavItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-2 text-sm text-muted-foreground transition hover:border-foreground/15 hover:text-foreground xl:flex xl:justify-between xl:rounded-none xl:border-x-0 xl:border-t-0 xl:px-0 xl:py-3"
                >
                  <span>{item.label}</span>
                  {typeof item.count === "number" ? (
                    <Badge variant="secondary" className="text-[11px]">
                      {item.count}
                    </Badge>
                  ) : null}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-10">
          <section id="admin-users" className="scroll-mt-24 space-y-4">
            <AdminSectionHeader
              title="Admin Users"
              description="Assign or revoke main-admin and secondary-admin roles without burying access changes in separate panels."
              meta={<Badge variant="secondary">{adminUsers.length}</Badge>}
            />
            <div className="space-y-6 border-y border-border/60 py-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_220px_220px_auto]">
                <div className="grid gap-2">
                  <Label htmlFor="admin-email">Institutional email</Label>
                  <Input
                    id="admin-email"
                    value={adminEmail}
                    onChange={(event) => setAdminEmail(event.target.value)}
                    placeholder="faculty@spup.edu.ph"
                    disabled={!isMainAdmin}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select
                    value={adminRole}
                    onValueChange={(value) => setAdminRole(value as typeof adminRole)}
                    disabled={!isMainAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="secondary-admin">Secondary Admin</SelectItem>
                      <SelectItem value="main-admin">Main Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Workspace</Label>
                  <Select
                    value={adminScope}
                    onValueChange={(value) => setAdminScope(value as typeof adminScope)}
                    disabled={!isMainAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin-only">Admin Only</SelectItem>
                      <SelectItem value="faculty">Faculty + Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full gap-2 xl:w-auto"
                    onClick={() => void handleAdminSubmit()}
                    disabled={!isMainAdmin || !adminEmail.trim()}
                  >
                    <MailPlus className="h-4 w-4" />
                    Save Access
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {isMainAdmin
                  ? "Main admins can create or update admin access, including admin-only accounts."
                  : "Signed in as a secondary admin. Access changes are visible here but only main admins can modify them."}
              </p>

              <div className="overflow-hidden border-y border-border/60">
                <Table className="min-w-[860px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-0">Admin</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Access</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead className="w-[92px] pr-0 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminUsers.map((adminUser) => {
                      const isSoleMainAdmin =
                        adminUser.roles.includes("main-admin") && mainAdminCount <= 1
                      const adminRoleForUser = getAdminRole(adminUser)
                      const hasFacultyWorkspace = adminUser.roles.includes("faculty")

                      return (
                        <TableRow key={adminUser.id}>
                          <TableCell className="pl-0">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border border-border">
                                <AvatarImage src={adminUser.photo_url ?? undefined} />
                                <AvatarFallback className="bg-primary/10 font-medium text-primary">
                                  {getInitials(adminUser.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground">{adminUser.name}</p>
                                <p className="break-all text-sm text-muted-foreground">{adminUser.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex max-w-60 flex-wrap gap-2">
                              {adminUser.roles.map((role) => (
                                <Badge key={role} variant="secondary" className="text-[11px]">
                                  {getRoleLabel(role)}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{formatLabel(adminUser.access_status)}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatLastSeen(adminUser.last_login_at)}
                          </TableCell>
                          <TableCell className="pr-0 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" disabled={!isMainAdmin}>
                                  Manage
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => void handleAdminRoleUpdate(adminUser, "main-admin")}
                                  disabled={adminUser.roles.includes("main-admin")}
                                >
                                  Make Main Admin
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => void handleAdminRoleUpdate(adminUser, "secondary-admin")}
                                  disabled={adminUser.roles.includes("secondary-admin") || isSoleMainAdmin}
                                >
                                  Make Secondary Admin
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    void handleAdminRoleUpdate(adminUser, adminRoleForUser, {
                                      includeFaculty: !hasFacultyWorkspace,
                                    })
                                  }
                                >
                                  {hasFacultyWorkspace ? "Remove Faculty Workspace" : "Add Faculty Workspace"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => void handleAdminRoleRemoval(adminUser)}
                                  disabled={isSoleMainAdmin}
                                >
                                  Remove Admin Access
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </section>

          <section id="faculty-invites" className="scroll-mt-24 space-y-4">
            <AdminSectionHeader
              title="Access Invites"
              description="Queue faculty or admin access, review who has not signed in yet, and adjust invite metadata inline."
              meta={<Badge variant="secondary">{invites.length}</Badge>}
              action={
                <Button
                  className="gap-2"
                  onClick={() => {
                    setEditingInvite(null)
                    setInviteDialogOpen(true)
                  }}
                  disabled={!isMainAdmin}
                >
                  <MailPlus className="h-4 w-4" />
                  Add Invite
                </Button>
              }
            />
            <div className="overflow-hidden border-y border-border/60">
              <Table className="min-w-[960px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-0">Invitee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[132px] pr-0 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="pl-0 pr-0">
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          No pending invites in the queue.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="pl-0">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{invite.name ?? invite.email}</p>
                            <p className="break-all text-sm text-muted-foreground">{invite.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{invite.department ?? "-"}</TableCell>
                        <TableCell>
                          <div className="flex max-w-60 flex-wrap gap-2">
                            {invite.roles.map((role) => (
                              <Badge key={role} variant="secondary" className="text-[11px]">
                                {getRoleLabel(role)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(invite.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatLabel(invite.invite_status)}</Badge>
                        </TableCell>
                        <TableCell className="pr-0 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingInvite(invite)
                                setInviteDialogOpen(true)
                              }}
                              disabled={!isMainAdmin}
                            >
                              <PencilLine className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleInviteCancel(invite.id)}
                              disabled={!isMainAdmin}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section id="access-status" className="scroll-mt-24 space-y-4">
            <AdminSectionHeader
              title="Access Status"
              description="Review inactive faculty accounts and restore access without rebuilding profile records."
              meta={<Badge variant="secondary">{inactiveFaculty.length}</Badge>}
            />
            <div className="overflow-hidden border-y border-border/60">
              <Table className="min-w-[920px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-0">Faculty</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Publications</TableHead>
                    <TableHead className="w-[120px] pr-0 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactiveFaculty.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="pl-0 pr-0">
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          No inactive faculty accounts need attention.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    inactiveFaculty.map((faculty) => (
                      <TableRow key={faculty.id}>
                        <TableCell className="pl-0">
                          <div className="space-y-1">
                            <Link href={`/admin/faculty/${faculty.id}`} className="font-medium text-foreground hover:text-primary">
                              {faculty.name ?? faculty.email}
                            </Link>
                            <p className="break-all text-sm text-muted-foreground">{faculty.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{faculty.department ?? "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{faculty.completion_score ?? 0}%</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatLastSeen(faculty.last_login_at)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {faculty.publications_count}
                          {faculty.indexed_publications_count > 0 ? ` (${faculty.indexed_publications_count} indexed)` : ""}
                        </TableCell>
                        <TableCell className="pr-0 text-right">
                          <Button
                            size="sm"
                            className="gap-2"
                            onClick={() => void handleReactivateFaculty(faculty.id)}
                            disabled={!isMainAdmin}
                          >
                            <UserCheck className="h-4 w-4" />
                            Reactivate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section id="decision-rules" className="scroll-mt-24 space-y-4">
            <AdminSectionHeader
              title="Compliance and Priority Rules"
              description="Tune how the dashboard and compliance analytics rank faculty and departments."
              meta={<Badge variant="secondary">Live scoring</Badge>}
              action={
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDecisionSupportRestore}
                    disabled={!isMainAdmin || isSavingDecisionSupport}
                  >
                    Restore Defaults
                  </Button>
                  <Button
                    className="gap-2"
                    onClick={() => void saveDecisionSupportConfig()}
                    disabled={!isMainAdmin || isSavingDecisionSupport}
                  >
                    {isSavingDecisionSupport ? <Spinner className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                    Save Rules
                  </Button>
                </div>
              }
            />
            <div className="space-y-8 border-y border-border/60 py-4">
              <p className="text-sm text-muted-foreground">
                Compliance measures reporting completeness. Priority measures how urgently an admin should review a record.
              </p>

              <div className="grid gap-8 xl:grid-cols-2">
                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium text-foreground">Compliance weights</legend>
                  <div className="divide-y divide-border/60 border-y border-border/60">
                    {DECISION_SUPPORT_READINESS_FIELDS.map((field) => (
                      <div
                        key={field.key}
                        className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{field.label}</p>
                          <p className="text-xs text-muted-foreground">Weight applied when the factor is satisfied.</p>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={decisionSupportConfig.readinessWeights[field.key]}
                          onChange={(event) =>
                            updateDecisionSupportSection(
                              "readinessWeights",
                              field.key,
                              parseIntegerInput(event.target.value)
                            )
                          }
                          disabled={!isMainAdmin || isSavingDecisionSupport}
                          className="w-full sm:w-28"
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium text-foreground">Priority weights</legend>
                  <div className="divide-y divide-border/60 border-y border-border/60">
                    {DECISION_SUPPORT_RISK_FIELDS.map((field) => (
                      <div
                        key={field.key}
                        className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{field.label}</p>
                          <p className="text-xs text-muted-foreground">Weight applied when the review condition is triggered.</p>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={decisionSupportConfig.riskWeights[field.key]}
                          onChange={(event) =>
                            updateDecisionSupportSection(
                              "riskWeights",
                              field.key,
                              parseIntegerInput(event.target.value)
                            )
                          }
                          disabled={!isMainAdmin || isSavingDecisionSupport}
                          className="w-full sm:w-28"
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium text-foreground">Thresholds</legend>
                  <div className="divide-y divide-border/60 border-y border-border/60">
                    {decisionSupportThresholdFields.map((field) => (
                      <div
                        key={field.key}
                        className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{field.label}</p>
                          <p className="text-xs text-muted-foreground">{field.description}</p>
                        </div>
                        <Input
                          type="number"
                          min={1}
                          inputMode="numeric"
                          value={decisionSupportConfig.thresholds[field.key]}
                          onChange={(event) =>
                            updateDecisionSupportSection(
                              "thresholds",
                              field.key,
                              parseIntegerInput(event.target.value, 1)
                            )
                          }
                          disabled={!isMainAdmin || isSavingDecisionSupport}
                          className="w-full sm:w-28"
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>

                <div className="space-y-8">
                  <fieldset className="space-y-3">
                    <legend className="text-sm font-medium text-foreground">Score bands</legend>
                    <div className="divide-y divide-border/60 border-y border-border/60">
                      <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">Compliance medium band</p>
                          <p className="text-xs text-muted-foreground">
                            Minimum score required before compliance is no longer considered low.
                          </p>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          inputMode="numeric"
                          value={decisionSupportConfig.bands.readiness.medium}
                          onChange={(event) =>
                            updateDecisionSupportBand("readiness", "medium", parseIntegerInput(event.target.value))
                          }
                          disabled={!isMainAdmin || isSavingDecisionSupport}
                          className="w-full sm:w-28"
                        />
                      </div>
                      <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">Compliance high band</p>
                          <p className="text-xs text-muted-foreground">
                            Minimum score required before compliance is considered high.
                          </p>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          inputMode="numeric"
                          value={decisionSupportConfig.bands.readiness.high}
                          onChange={(event) =>
                            updateDecisionSupportBand("readiness", "high", parseIntegerInput(event.target.value))
                          }
                          disabled={!isMainAdmin || isSavingDecisionSupport}
                          className="w-full sm:w-28"
                        />
                      </div>
                      <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">Priority medium band</p>
                          <p className="text-xs text-muted-foreground">
                            Minimum score required before the review priority becomes medium.
                          </p>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          inputMode="numeric"
                          value={decisionSupportConfig.bands.risk.medium}
                          onChange={(event) =>
                            updateDecisionSupportBand("risk", "medium", parseIntegerInput(event.target.value))
                          }
                          disabled={!isMainAdmin || isSavingDecisionSupport}
                          className="w-full sm:w-28"
                        />
                      </div>
                      <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">Priority high band</p>
                          <p className="text-xs text-muted-foreground">
                            Minimum score required before the review priority becomes high.
                          </p>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          inputMode="numeric"
                          value={decisionSupportConfig.bands.risk.high}
                          onChange={(event) =>
                            updateDecisionSupportBand("risk", "high", parseIntegerInput(event.target.value))
                          }
                          disabled={!isMainAdmin || isSavingDecisionSupport}
                          className="w-full sm:w-28"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="space-y-3">
                    <legend className="text-sm font-medium text-foreground">Dashboard limits</legend>
                    <div className="divide-y divide-border/60 border-y border-border/60">
                      {decisionSupportDashboardFields.map((field) => (
                        <div
                          key={field.key}
                          className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">{field.label}</p>
                            <p className="text-xs text-muted-foreground">{field.description}</p>
                          </div>
                          <Input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            value={decisionSupportConfig.dashboard[field.key]}
                            onChange={(event) =>
                              updateDecisionSupportSection(
                                "dashboard",
                                field.key,
                                parseIntegerInput(event.target.value, 1)
                              )
                            }
                            disabled={!isMainAdmin || isSavingDecisionSupport}
                            className="w-full sm:w-28"
                          />
                        </div>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </div>
            </div>
          </section>

          <section id="appearance" className="scroll-mt-24 space-y-4">
            <AdminSectionHeader
              title="Appearance"
              description="Control how the admin workspace renders on this device."
            />
            <div className="max-w-xl border-y border-border/60 py-4">
              <ThemeModeSelector />
            </div>
          </section>

          <section id="broadcasts" className="scroll-mt-24 space-y-4">
            <AdminSectionHeader
              title="Push Broadcasts"
              description="Send a system-wide announcement and review delivery history without opening a separate compose panel."
              meta={<Badge variant="secondary">{broadcasts.length}</Badge>}
            />
            <div className="grid gap-8 border-y border-border/60 py-4 xl:grid-cols-[340px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-foreground">Compose broadcast</h3>
                  <p className="text-sm text-muted-foreground">
                    Broadcasts are delivered to active users who have enabled push notifications.
                  </p>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="broadcast-title">Title</Label>
                    <Input
                      id="broadcast-title"
                      value={broadcastTitle}
                      onChange={(event) => setBroadcastTitle(event.target.value)}
                      placeholder="Maintenance window, reporting deadline, policy update"
                      disabled={isSendingBroadcast}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="broadcast-message">Message</Label>
                    <Textarea
                      id="broadcast-message"
                      value={broadcastMessage}
                      onChange={(event) => setBroadcastMessage(event.target.value)}
                      placeholder="Write the message that should appear in browser notifications."
                      rows={5}
                      disabled={isSendingBroadcast}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      className="gap-2"
                      onClick={() => void handleBroadcastSubmit()}
                      disabled={isSendingBroadcast || !broadcastTitle.trim() || !broadcastMessage.trim()}
                    >
                      {isSendingBroadcast ? <Spinner className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
                      Send Broadcast
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-foreground">Recent broadcasts</h3>
                  <p className="text-sm text-muted-foreground">
                    Review what was sent, when it was sent, and how many recipients received it.
                  </p>
                </div>
                <div className="overflow-hidden border-y border-border/60">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-0">Broadcast</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Targets</TableHead>
                        <TableHead>Delivered</TableHead>
                        <TableHead>Failed</TableHead>
                        <TableHead className="pr-0">By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {broadcasts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="pl-0 pr-0">
                            <div className="py-8 text-center text-sm text-muted-foreground">
                              No broadcasts have been sent yet.
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        broadcasts.map((broadcast) => (
                          <TableRow key={broadcast.id}>
                            <TableCell className="pl-0">
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">{broadcast.title}</p>
                                <p className="max-w-xl whitespace-normal text-sm text-muted-foreground">
                                  {broadcast.message}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDateTime(broadcast.created_at)}
                            </TableCell>
                            <TableCell>{broadcast.target_count}</TableCell>
                            <TableCell>{broadcast.success_count}</TableCell>
                            <TableCell>{broadcast.failure_count}</TableCell>
                            <TableCell className="pr-0 text-sm text-muted-foreground">
                              {broadcast.created_by_name}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </section>

          <section id="exports" className="scroll-mt-24 space-y-4">
            <AdminSectionHeader
              title="Exports"
              description="Generate CSV exports directly from the current production data model."
            />
            <div className="divide-y divide-border/60 border-y border-border/60">
              {exportActions.map((action) => (
                <div
                  key={action.key}
                  className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{action.label}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => void AdminService.downloadExport(action.key)}
                  >
                    <Download className="h-4 w-4" />
                    Download CSV
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section id="app-info" className="scroll-mt-24 space-y-4">
            <AdminSectionHeader
              title="App Information"
              description="Reference the current release build and developer contact details."
            />
            <div className="grid gap-5 border-y border-border/60 py-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Version</p>
                <p className="text-sm font-medium text-foreground">{APP_VERSION}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Developer</p>
                <p className="text-sm font-medium text-foreground">{APP_DEVELOPER_NAME}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Contact</p>
                <a
                  href={`mailto:${APP_DEVELOPER_EMAIL}`}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {APP_DEVELOPER_EMAIL}
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
