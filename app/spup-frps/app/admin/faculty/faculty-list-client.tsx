"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Search,
  Loader2,
  UserPlus,
  MoreVertical,
  Building2,
  BookOpen,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  Eye,
  PencilLine,
  UserX,
  RotateCcw,
  Ban,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AdminCollectionPageSkeleton } from "@/components/admin/admin-page-skeletons"
import { AdminSectionHeader, AdminSummaryStrip } from "@/components/admin/admin-page-primitives"
import { AdminPaginationControls } from "@/components/admin/admin-pagination-controls"
import { EmptyState } from "@/components/shared/empty-state"
import { FacultyInviteDialog } from "@/components/admin/faculty-invite-dialog"
import { useAdminFacultyListQuery } from "@/lib/query/admin"
import { AdminService } from "@/lib/services/admin-service"
import { DEPARTMENTS } from "@/lib/constants"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import type { AdminFacultyListItem, Department, FacultyInvitePayload, FacultyInviteRecord } from "@/lib/types"
import { useQueryClient } from "@tanstack/react-query"

const statusConfig = {
  active: { label: "Active", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
  pending: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  inactive: { label: "Inactive", color: "bg-gray-50 text-gray-700 border-gray-200", icon: XCircle },
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

function getDepartmentLabel(department: AdminFacultyListItem["department"]) {
  if (!department) {
    return "No department"
  }

  return DEPARTMENTS.find((item) => item.value === department)?.label ?? department
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

type AdminFacultyListPageProps = {
  initialSearch?: string
}

export default function AdminFacultyListPage({ initialSearch = "" }: AdminFacultyListPageProps) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | "all">("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInvite, setEditingInvite] = useState<AdminFacultyListItem | null>(null)
  const [isSavingInvite, setIsSavingInvite] = useState(false)
  const normalizedSearchQuery = searchQuery.trim()
  const debouncedSearchQuery = useDebouncedValue(normalizedSearchQuery, 250)

  useEffect(() => {
    setSearchQuery(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearchQuery, selectedDepartment, selectedStatus])

  const facultyListQuery = useAdminFacultyListQuery({
    search: debouncedSearchQuery || undefined,
    department: selectedDepartment,
    status: selectedStatus as "all" | "active" | "pending" | "inactive",
    page,
    page_size: 20,
  })

  const facultyRows = facultyListQuery.data?.items ?? []
  const stats = facultyListQuery.data?.stats ?? {
    total: 0,
    active: 0,
    pending: 0,
    avgCompletion: 0,
  }
  const totalRows = facultyListQuery.data?.total ?? 0
  const pageSize = facultyListQuery.data?.page_size ?? 20
  const totalPages = facultyListQuery.data?.total_pages ?? 1
  const isSearching = normalizedSearchQuery !== debouncedSearchQuery || facultyListQuery.isFetching

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
      await queryClient.invalidateQueries({ queryKey: ["admin", "faculty-list"] })
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

      await queryClient.invalidateQueries({ queryKey: ["admin", "faculty-list"] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update access.")
    }
  }

  if (!facultyListQuery.data && facultyListQuery.isPending) {
    return <AdminCollectionPageSkeleton />
  }

  const summaryItems = [
    {
      label: "Records",
      value: totalRows,
      detail: `${stats.active} active faculty / ${stats.pending} pending invites`,
      icon: Users,
    },
    {
      label: "Active",
      value: stats.active,
      detail: "Faculty with active access",
      icon: CheckCircle2,
    },
    {
      label: "Pending",
      value: stats.pending,
      detail: "Invites awaiting first sign-in",
      icon: Clock,
    },
    {
      label: "Avg Completion",
      value: `${stats.avgCompletion}%`,
      detail: "Portfolio readiness across visible rows",
      icon: BookOpen,
    },
  ] satisfies Array<{
    label: string
    value: string | number
    detail: string
    icon: typeof Users
  }>

  return (
    <div className="space-y-8">
      <FacultyInviteDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingInvite(null)
          }
        }}
        onSubmit={handleInviteSubmit}
        initialInvite={editingInvite as FacultyInviteRecord | null}
        isSaving={isSavingInvite}
        title={editingInvite ? "Edit Faculty Invite" : "Add Faculty"}
        description="Pre-register a faculty email, seed profile metadata, and queue optional admin access."
        submitLabel={editingInvite ? "Save Invite" : "Create Invite"}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Faculty Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage faculty accounts, invitations, access state, and reporting readiness from one table.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => void AdminService.downloadExport("faculty")}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            className="gap-2"
            onClick={() => {
              setEditingInvite(null)
              setIsDialogOpen(true)
            }}
          >
            <UserPlus className="h-4 w-4" />
            Add Faculty
          </Button>
        </div>
      </div>

      <AdminSummaryStrip items={summaryItems} />

      <section className="space-y-4">
        <AdminSectionHeader
          title="Filters"
          description="Search the roster and narrow the table by department and account state."
        />
        <div className="flex flex-col gap-4 border-y border-border/60 py-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : (
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            )}
            <Input
              placeholder="Search first name, last name, email, or department..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              autoComplete="off"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={selectedDepartment}
              onValueChange={(value) => setSelectedDepartment(value as Department | "all")}
            >
              <SelectTrigger className="w-44">
                <Building2 className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map((department) => (
                  <SelectItem key={department.value} value={department.value}>
                    {department.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-36">
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
        </div>
      </section>

      {facultyRows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No faculty found"
          description={
            searchQuery || selectedDepartment !== "all" || selectedStatus !== "all"
              ? "Try adjusting your filters"
              : "Add your first faculty member to get started"
          }
          action={
            <Button
              className="gap-2"
              onClick={() => {
                setEditingInvite(null)
                setIsDialogOpen(true)
              }}
            >
              <UserPlus className="h-4 w-4" />
              Add Faculty
            </Button>
          }
        />
      ) : (
        <section className="space-y-4">
          <AdminSectionHeader
            title="Faculty Records"
            description="Account state, roles, publications, and completion progress in one roster view."
            meta={
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{totalRows}</Badge>
                {isSearching ? <Badge variant="outline">Searching</Badge> : null}
              </div>
            }
          />
          <div className="space-y-4">
            <div className="overflow-hidden border-y border-border/60">
              <Table className="min-w-[1180px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-0">Faculty</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Publications</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead className="w-[72px] pr-0 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facultyRows.map((faculty) => {
                    const status = statusConfig[getRowStatus(faculty)]
                    const StatusIcon = status.icon
                    const initials = (faculty.name ?? faculty.email)
                      .split(" ")
                      .map((segment) => segment[0])
                      .join("")
                      .slice(0, 2)

                    return (
                      <TableRow key={`${faculty.recordType}-${faculty.id}`}>
                        <TableCell className="pl-0">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-border">
                              <AvatarImage src={faculty.photo_url ?? undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              {faculty.recordType === "user" ? (
                                <Link
                                  href={`/admin/faculty/${faculty.id}`}
                                  className="font-medium text-foreground hover:text-primary"
                                >
                                  {faculty.name ?? faculty.email}
                                </Link>
                              ) : (
                                <p className="font-medium text-foreground">{faculty.name ?? faculty.email}</p>
                              )}
                              <p className="text-sm text-muted-foreground break-all">{faculty.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span className="whitespace-normal">{getDepartmentLabel(faculty.department)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs border ${status.color}`}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-48 flex-wrap gap-2">
                            {faculty.roles.length > 0 ? (
                              faculty.roles.map((role) => (
                                <Badge key={role} variant="secondary" className="text-[11px]">
                                  {getRoleLabel(role)}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span>{faculty.publications_count}</span>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-44">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {faculty.recordType === "invite" ? "Invite status" : "Profile completion"}
                              </span>
                              <span className="font-medium">
                                {faculty.recordType === "invite" ? "Pending" : `${faculty.completion_score ?? 0}%`}
                              </span>
                            </div>
                            <Progress
                              value={faculty.recordType === "invite" ? 25 : faculty.completion_score ?? 0}
                              className="h-1.5"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {faculty.recordType === "invite" ? "Pending sign-in" : formatLastSeen(faculty.last_login_at)}
                        </TableCell>
                        <TableCell className="pr-0 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {faculty.recordType === "user" && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/faculty/${faculty.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Profile
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {faculty.recordType === "invite" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingInvite(faculty)
                                    setIsDialogOpen(true)
                                  }}
                                >
                                  <PencilLine className="mr-2 h-4 w-4" />
                                  Edit Invite
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => void handleDeactivate(faculty)}>
                                {faculty.recordType === "invite" ? (
                                  <>
                                    <Ban className="mr-2 h-4 w-4" />
                                    Cancel Invite
                                  </>
                                ) : faculty.access_status === "inactive" ? (
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
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <AdminPaginationControls
              page={page}
              pageSize={pageSize}
              total={totalRows}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </section>
      )}
    </div>
  )
}
