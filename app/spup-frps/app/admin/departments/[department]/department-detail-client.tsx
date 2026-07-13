"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Ban,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  MoreVertical,
  RotateCcw,
  Search,
  UserPlus,
  UserX,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminSectionHeader, AdminSummaryStrip } from "@/components/admin/admin-page-primitives"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AdminCollectionPageSkeleton } from "@/components/admin/admin-page-skeletons"
import { AdminPaginationControls } from "@/components/admin/admin-pagination-controls"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/shared/empty-state"
import { FacultyInviteDialog } from "@/components/admin/faculty-invite-dialog"
import { useAdminDepartmentDetailQuery } from "@/lib/query/admin"
import { AdminService } from "@/lib/services/admin-service"
import { DEPARTMENTS } from "@/lib/constants"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import type {
  AdminDepartmentComplianceAnalytics,
  AdminDepartmentDetailStats,
  AdminFacultyListItem,
  Department,
  FacultyInvitePayload,
  FacultyInviteRecord,
} from "@/lib/types"
import { useQueryClient } from "@tanstack/react-query"

const statusConfig = {
  active: { label: "Active", className: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  inactive: { label: "Inactive", className: "bg-gray-50 text-gray-700 border-gray-200", icon: Ban },
}

function getRowStatus(item: AdminFacultyListItem) {
  if (item.recordType === "invite") {
    return "pending" as const
  }

  return item.access_status === "inactive" ? "inactive" : "active"
}

function getRoleLabel(role: AdminFacultyListItem["roles"][number]) {
  if (role === "main-admin") {
    return "Main Admin"
  }

  if (role === "secondary-admin") {
    return "Secondary Admin"
  }

  return "Faculty"
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

function formatSeverityLabel(value: keyof typeof complianceSeverityClasses) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`
}

function getActionLabel(item: AdminFacultyListItem) {
  if (item.recordType === "invite") {
    return "Await first sign-in"
  }

  if (item.access_status === "inactive") {
    return "Reactivate account"
  }

  const completion = item.completion_score ?? 0
  if (completion < 100 && item.publications_count === 0) {
    return "Complete profile + add publication"
  }

  if (completion < 100) {
    return "Complete profile"
  }

  if (item.publications_count === 0) {
    return "Add publication"
  }

  return "Ready for reporting"
}

function getActionTone(item: AdminFacultyListItem) {
  if (item.recordType === "invite" || item.access_status === "inactive") {
    return "destructive"
  }

  if ((item.completion_score ?? 0) < 100 || item.publications_count === 0) {
    return "warning"
  }

  return "success"
}

const emptyStats: AdminDepartmentDetailStats = {
  faculty: 0,
  activeFaculty: 0,
  inactiveFaculty: 0,
  pendingInvites: 0,
  incompleteProfiles: 0,
  facultyNeedingAction: 0,
  facultyWithoutPublications: 0,
  avgCompletion: 0,
  readyForReporting: 0,
}

const complianceSeverityClasses = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
} as const

const emptyComplianceAnalytics: AdminDepartmentComplianceAnalytics = {
  summary: {
    complianceScore: 0,
    priorityScore: 0,
    severity: "low",
    highPriorityFacultyCount: 0,
    lowComplianceFacultyCount: 0,
  },
  faculty: [],
}

export default function DepartmentDetailPage() {
  const queryClient = useQueryClient()
  const params = useParams<{ department: string }>()
  const departmentCode = params.department as Department
  const departmentMeta = DEPARTMENTS.find((department) => department.value === departmentCode)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [editingInvite, setEditingInvite] = useState<AdminFacultyListItem | null>(null)
  const [isSavingInvite, setIsSavingInvite] = useState(false)
  const normalizedSearchQuery = searchQuery.trim()
  const debouncedSearchQuery = useDebouncedValue(normalizedSearchQuery, 250)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearchQuery, selectedStatus, departmentCode])

  const departmentDetailQuery = useAdminDepartmentDetailQuery(
    departmentCode,
    {
      search: debouncedSearchQuery || undefined,
      status: selectedStatus as "all" | "active" | "pending" | "inactive",
      page,
      page_size: 20,
    },
    Boolean(departmentCode)
  )

  const summary = departmentDetailQuery.data?.summary ?? null
  const facultyRows = departmentDetailQuery.data?.roster.items ?? []
  const scopedStats = departmentDetailQuery.data?.stats ?? emptyStats
  const complianceAnalytics = departmentDetailQuery.data?.complianceAnalytics ?? emptyComplianceAnalytics
  const totalFacultyRows = departmentDetailQuery.data?.roster.total ?? 0
  const pageSize = departmentDetailQuery.data?.roster.page_size ?? 20
  const totalPages = departmentDetailQuery.data?.roster.total_pages ?? 1
  const isSearchingRoster =
    normalizedSearchQuery !== debouncedSearchQuery || departmentDetailQuery.isFetching
  const summaryItems = summary
    ? [
        {
          label: "Faculty",
          value: summary.facultyCount,
          detail: `${summary.activeFacultyCount} active / ${summary.facultyCount - summary.activeFacultyCount} inactive`,
          icon: Users,
        },
        {
          label: "Publications",
          value: summary.publicationsCount,
          detail: `${summary.indexedPublicationsCount} indexed`,
          icon: BookOpen,
        },
        {
          label: "Engagements / Research",
          value: summary.engagementsCount + summary.researchTitlesCount,
          detail: `${summary.engagementsCount} engagements / ${summary.researchTitlesCount} research`,
          icon: CheckCircle2,
        },
        {
          label: "Avg Completion",
          value: `${summary.avgCompletionScore}%`,
          detail: "Department reporting readiness",
          icon: Clock,
        },
      ]
    : []
  const reportingSnapshotItems = [
    {
      label: "Ready",
      value: scopedStats.readyForReporting,
      detail: "Faculty ready for cleaner reporting",
      icon: CheckCircle2,
    },
    {
      label: "Follow-Up",
      value: scopedStats.facultyNeedingAction,
      detail: "Faculty needing admin intervention",
      icon: Clock,
    },
    {
      label: "No Publications",
      value: scopedStats.facultyWithoutPublications,
      detail: "Faculty without a publication record",
      icon: BookOpen,
    },
    {
      label: "Pending Invites",
      value: scopedStats.pendingInvites,
      detail: "Department invites awaiting first sign-in",
      icon: UserPlus,
    },
  ] satisfies Array<{
    label: string
    value: string | number
    detail: string
    icon: typeof CheckCircle2
  }>
  const facultyWithPublicationsRate =
    scopedStats.faculty === 0
      ? 0
      : Math.round(
          ((scopedStats.faculty - scopedStats.facultyWithoutPublications) / scopedStats.faculty) * 100
        )

  const handleInviteSubmit = async (payload: FacultyInvitePayload) => {
    setIsSavingInvite(true)

    try {
      if (editingInvite) {
        await AdminService.updateInvite(editingInvite.id, payload)
        toast.success("Invite updated.")
      } else {
        await AdminService.createFacultyInvite(payload)
        toast.success("Faculty invite saved.")
      }

      setEditingInvite(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "department-detail", departmentCode] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "faculty-list"] }),
      ])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save invite.")
      throw error
    } finally {
      setIsSavingInvite(false)
    }
  }

  const handleDeactivate = async (item: AdminFacultyListItem) => {
    try {
      if (item.recordType === "invite") {
        await AdminService.cancelInvite(item.id)
        toast.success("Invite cancelled.")
      } else if (item.access_status === "inactive") {
        await AdminService.setFacultyAccessStatus(item.id, "active")
        toast.success("Faculty access restored.")
      } else {
        await AdminService.deactivateFacultyProfile(item.id)
        toast.success("Faculty access deactivated.")
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "department-detail", departmentCode] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "faculty-list"] }),
      ])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update access.")
    }
  }

  if (!departmentDetailQuery.data && departmentDetailQuery.isPending) {
    return <AdminCollectionPageSkeleton />
  }

  if (!departmentMeta || !summary) {
    return (
      <div className="border-y border-border/60 py-16 text-center">
          <p className="text-lg font-semibold">Department not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The requested department workspace does not exist.
          </p>
          <Button asChild className="mt-6">
            <Link href="/admin/departments">Back to Departments</Link>
          </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <FacultyInviteDialog
        open={isInviteDialogOpen}
        onOpenChange={(open) => {
          setIsInviteDialogOpen(open)
          if (!open) {
            setEditingInvite(null)
          }
        }}
        onSubmit={handleInviteSubmit}
        initialInvite={editingInvite as FacultyInviteRecord | null}
        isSaving={isSavingInvite}
        title={editingInvite ? "Edit Faculty Invite" : "Add Faculty"}
        description={`Pre-register a ${departmentCode} faculty member before the first Azure sign-in.`}
        submitLabel={editingInvite ? "Save Invite" : "Create Invite"}
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button variant="ghost" size="sm" asChild className="h-auto px-0 py-0 font-normal">
            <Link href="/admin/departments">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Departments
            </Link>
          </Button>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{departmentMeta.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Department-scoped analytics, faculty roster, and export actions for {departmentCode}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void AdminService.downloadExport("faculty", { department: departmentCode })}>
              Export Faculty
            </Button>
            <Button variant="outline" onClick={() => void AdminService.downloadExport("publications", { department: departmentCode })}>
              Export Publications
            </Button>
            <Button variant="outline" onClick={() => void AdminService.downloadExport("engagements", { department: departmentCode })}>
              Export Engagements
            </Button>
            <Button variant="outline" onClick={() => void AdminService.downloadExport("research", { department: departmentCode })}>
              Export Research
            </Button>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.35fr)_380px]">
        <div className="space-y-8">
          <AdminSummaryStrip items={summaryItems} />

          <section className="space-y-4">
            <AdminSectionHeader
              title="Department Reporting Snapshot"
              description="Quick view of department reporting status and review workload."
            />
            <AdminSummaryStrip items={reportingSnapshotItems} className="py-0" />
          </section>

          <section className="space-y-4">
            <AdminSectionHeader
              title="Faculty to Review"
              description="Top 5 faculty ranked by priority, then compliance."
              meta={<Badge variant="secondary">{complianceAnalytics.faculty.length}</Badge>}
            />
            {complianceAnalytics.faculty.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No faculty analytics available"
                description="This department does not have scored faculty records yet."
                className="border-y border-border/60 py-8"
              />
            ) : (
              <div className="overflow-hidden border-y border-border/60">
                <Table className="min-w-[860px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-0">Faculty</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead>Compliance</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead className="pr-0 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complianceAnalytics.faculty.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="pl-0 whitespace-normal">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{item.name}</p>
                            <p className="break-all text-xs text-muted-foreground">{item.email}</p>
                            <Badge variant="outline">{item.accessStatus}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatLastSeen(item.lastLoginAt)}
                        </TableCell>
                        <TableCell className="min-w-36">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Compliance</span>
                              <span className="font-medium">{item.complianceScore}%</span>
                            </div>
                            <Progress value={item.complianceScore} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell className="min-w-36">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Priority</span>
                              <span className="font-medium">{item.priorityScore}%</span>
                            </div>
                            <Progress value={item.priorityScore} className="h-1.5 [&>div]:bg-red-500" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`border ${complianceSeverityClasses[item.severity]}`}>
                            {formatSeverityLabel(item.severity)}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-0 text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={item.href}>View profile</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_0.95fr]">
            <section className="space-y-4">
              <AdminSectionHeader
                title="Action Summary"
                description="What the department admin view should address next."
              />
              <div className="space-y-4 border-y border-border/60 py-4">
                <div className="divide-y divide-border/60">
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-muted-foreground">Incomplete profiles</span>
                    <Badge variant={summary.avgCompletionScore < 100 ? "secondary" : "outline"}>
                      {scopedStats.incompleteProfiles}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-muted-foreground">Inactive accounts</span>
                    <Badge variant={scopedStats.inactiveFaculty > 0 ? "secondary" : "outline"}>
                      {scopedStats.inactiveFaculty}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-muted-foreground">Pending invites</span>
                    <Badge variant={scopedStats.pendingInvites > 0 ? "secondary" : "outline"}>
                      {scopedStats.pendingInvites}
                    </Badge>
                  </div>
                </div>
                <p className="border-t border-border/60 pt-4 text-sm text-muted-foreground">
                  Export buttons above are already scoped to {departmentCode}, so you can download only this department&apos;s
                  faculty, publications, engagements, or research.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <AdminSectionHeader
                title="Reporting Checklist"
                description="Simple operational targets for this department."
              />
              <div className="space-y-4 border-y border-border/60 py-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Profile completion</span>
                    <span className="font-medium">{summary.avgCompletionScore}%</span>
                  </div>
                  <Progress value={summary.avgCompletionScore} className="h-1.5" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Faculty with publications</span>
                    <span className="font-medium">{facultyWithPublicationsRate}%</span>
                  </div>
                  <Progress value={facultyWithPublicationsRate} className="h-1.5" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {scopedStats.readyForReporting} faculty member
                  {scopedStats.readyForReporting === 1 ? "" : "s"} are already ready for cleaner reporting.
                </p>
              </div>
            </section>
          </div>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <AdminSectionHeader
              title="Compliance Overview"
              description={`Department-wide compliance and priority analytics for ${departmentCode}.`}
            />
            <div className="space-y-4 border-y border-border/60 py-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Compliance score</p>
                  <p className="text-2xl font-semibold">{complianceAnalytics.summary.complianceScore}%</p>
                  <Progress value={complianceAnalytics.summary.complianceScore} className="h-1.5" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Priority score</p>
                  <p className="text-2xl font-semibold">{complianceAnalytics.summary.priorityScore}%</p>
                  <Progress
                    value={complianceAnalytics.summary.priorityScore}
                    className="h-1.5 [&>div]:bg-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">High-priority faculty</p>
                  <p className="text-2xl font-semibold">{complianceAnalytics.summary.highPriorityFacultyCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Low-compliance faculty</p>
                  <p className="text-2xl font-semibold">{complianceAnalytics.summary.lowComplianceFacultyCount}</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t border-border/60 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground">
                  These department analytics use the same scoring rules as the main compliance analytics view.
                </p>
                <Badge className={`border ${complianceSeverityClasses[complianceAnalytics.summary.severity]}`}>
                  {formatSeverityLabel(complianceAnalytics.summary.severity)}
                </Badge>
              </div>
            </div>
          </section>

          <div className="space-y-4 xl:sticky xl:top-6">
            <AdminSectionHeader
              title="Department Faculty"
              description={`Faculty and invite roster for ${departmentCode}, with reporting status and direct actions.`}
              action={
                <Button
                  className="gap-2"
                  onClick={() => {
                    setEditingInvite(null)
                    setIsInviteDialogOpen(true)
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                  Add Faculty
                </Button>
              }
            />

            <div className="space-y-4 border-y border-border/60 py-4">
              <div className="relative">
                {isSearchingRoster ? (
                  <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : (
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  placeholder="Search first name, last name, email, or specialization..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  autoComplete="off"
                  className="pl-9"
                />
              </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {facultyRows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No faculty found in this department"
              description="Adjust the filters or add a faculty invite for this department."
              className="border-y border-border/60 py-8"
            />
          ) : (
            <div className="divide-y divide-border/60 border-y border-border/60 lg:max-h-[calc(100vh-16rem)] lg:overflow-auto">
              {facultyRows.map((row) => {
                const status = statusConfig[getRowStatus(row)]
                const StatusIcon = status.icon
                const initials = (row.name ?? row.email)
                  .split(" ")
                  .map((segment) => segment[0])
                  .join("")
                  .slice(0, 2)
                const actionTone = getActionTone(row)
                const actionLabel = getActionLabel(row)

                return (
                  <div key={`${row.recordType}-${row.id}`} className="py-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={row.photo_url ?? undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {row.recordType === "user" ? (
                              <Link href={`/admin/faculty/${row.id}`} className="font-medium hover:text-primary">
                                {row.name ?? row.email}
                              </Link>
                            ) : (
                              <p className="font-medium">{row.name ?? row.email}</p>
                            )}
                            <p className="break-all text-sm text-muted-foreground">{row.email}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {row.recordType === "user" && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/faculty/${row.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Profile
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {row.recordType === "invite" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingInvite(row)
                                    setIsInviteDialogOpen(true)
                                  }}
                                >
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  Edit Invite
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => void handleDeactivate(row)}>
                                {row.recordType === "invite" ? (
                                  <>
                                    <Ban className="mr-2 h-4 w-4" />
                                    Cancel Invite
                                  </>
                                ) : row.access_status === "inactive" ? (
                                  <>
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Reactivate Access
                                  </>
                                ) : (
                                  <>
                                    <UserX className="mr-2 h-4 w-4" />
                                    Deactivate Access
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge className={`border text-xs ${status.className}`}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {status.label}
                          </Badge>
                          {row.roles.map((role) => (
                            <Badge key={role} variant="secondary" className="text-[11px]">
                              {getRoleLabel(role)}
                            </Badge>
                          ))}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>{row.publications_count} publications</span>
                          <span>{row.engagements_count} engagements</span>
                          <span>{row.research_titles_count} research</span>
                        </div>

                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {row.recordType === "invite" ? "Invite status" : "Profile completion"}
                            </span>
                            <span className="font-medium">
                              {row.recordType === "invite" ? "Pending" : `${row.completion_score ?? 0}%`}
                            </span>
                          </div>
                          <Progress
                            value={row.recordType === "invite" ? 25 : row.completion_score ?? 0}
                            className="h-1.5"
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <Badge
                            variant={
                              actionTone === "success"
                                ? "outline"
                                : actionTone === "warning"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className="whitespace-normal"
                          >
                            {actionLabel}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {row.recordType === "invite" ? "Pending sign-in" : formatLastSeen(row.last_login_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <AdminPaginationControls
            page={page}
            pageSize={pageSize}
            total={totalFacultyRows}
            totalPages={totalPages}
            onPageChange={setPage}
          />
          </div>
        </div>
      </div>
    </div>
  )
}
