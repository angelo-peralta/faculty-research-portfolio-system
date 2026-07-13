"use client"

import { useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  ShieldAlert,
  Target,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminDashboardSkeleton } from "@/components/admin/admin-page-skeletons"
import { DEPARTMENTS } from "@/lib/constants"
import { useAdminDashboardQuery } from "@/lib/query/admin"
import { AdminService } from "@/lib/services/admin-service"
import type {
  AdminDashboardData,
  DecisionSupportSeverity,
  Department,
} from "@/lib/types"
import { cn } from "@/lib/utils"

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime()
  const diffInHours = Math.max(1, Math.round((Date.now() - timestamp) / (1000 * 60 * 60)))

  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`
  }

  const diffInDays = Math.round(diffInHours / 24)
  return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`
}

function getDepartmentLabel(value: Department | "all") {
  if (value === "all") {
    return "All Departments"
  }

  return DEPARTMENTS.find((department) => department.value === value)?.label ?? value
}

function getActivityCopy(type: "publication" | "engagement" | "research") {
  if (type === "publication") {
    return "added a publication"
  }

  if (type === "engagement") {
    return "created an engagement"
  }

  return "updated a research project"
}

const decisionSupportSeverityClasses: Record<DecisionSupportSeverity, string> = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
}

function SectionHeader({
  title,
  description,
  meta,
  action,
}: {
  title: string
  description: string
  meta?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {meta}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

function SummaryMetric({
  label,
  value,
  detail,
  icon: Icon,
  className,
}: {
  label: string
  value: string | number
  detail: string
  icon: LucideIcon
  className?: string
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function EmptySectionState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-2 border-y border-border/60 py-8 text-center">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

interface AdminDashboardClientProps {
  initialDashboard: AdminDashboardData
}

export default function AdminDashboardClient({ initialDashboard }: AdminDashboardClientProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<Department | "all">("all")
  const dashboardQuery = useAdminDashboardQuery(
    selectedDepartment,
    true,
    selectedDepartment === "all" ? initialDashboard : undefined
  )
  const dashboard = dashboardQuery.data ?? null
  const isLoading = dashboardQuery.isLoading && !dashboardQuery.data
  const isRefreshing = dashboardQuery.isFetching && Boolean(dashboardQuery.data)

  const scopeLabel = useMemo(() => getDepartmentLabel(selectedDepartment), [selectedDepartment])

  const visibleDepartmentRows = useMemo(() => {
    if (!dashboard) {
      return []
    }

    if (selectedDepartment === "all") {
      return dashboard.departmentPerformance
    }

    return dashboard.departmentPerformance.filter(
      (department) => department.department === selectedDepartment
    )
  }, [dashboard, selectedDepartment])

  const indexedRate = dashboard?.totalPublications
    ? Math.round((dashboard.indexedPublications / dashboard.totalPublications) * 100)
    : 0

  if (isLoading) {
    return <AdminDashboardSkeleton />
  }

  if (!dashboard) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Unable to load dashboard data.</p>
      </div>
    )
  }

  const recentActivity = dashboard.recentActivity.slice(0, 4)

  const summaryMetrics = [
    {
      label: "Faculty",
      value: dashboard.totalFaculty,
      detail: `${dashboard.activeFaculty} active / ${dashboard.inactiveFaculty} inactive`,
      icon: Users,
    },
    {
      label: "Pending Invites",
      value: dashboard.pendingInvites,
      detail: "Awaiting first sign-in",
      icon: UserPlus,
    },
    {
      label: "Publications",
      value: dashboard.totalPublications,
      detail: `${dashboard.indexedPublications} indexed / ${indexedRate}% rate`,
      icon: BookOpen,
    },
    {
      label: "Engagements",
      value: dashboard.totalEngagements,
      detail: `${dashboard.activeEngagements} active records`,
      icon: Briefcase,
    },
    {
      label: "Research",
      value: dashboard.totalResearchTitles,
      detail: `${dashboard.ongoingResearchTitles} ongoing projects`,
      icon: FileText,
    },
    {
      label: "Avg Completion",
      value: `${dashboard.avgCompletionScore}%`,
      detail: "Reporting readiness across faculty",
      icon: Target,
    },
  ] satisfies Array<{
    label: string
    value: string | number
    detail: string
    icon: LucideIcon
  }>

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Operational snapshot for faculty reporting, compliance follow-up, and department handoff.
            </p>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Scope: {scopeLabel}
          </p>
          {isRefreshing ? (
            <p className="text-xs text-muted-foreground">Updating dashboard scope...</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedDepartment}
            onValueChange={(value) => setSelectedDepartment(value as Department | "all")}
          >
            <SelectTrigger className="w-[280px] max-w-full">
              <Building2 className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Departments" />
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
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              void AdminService.downloadExport("faculty", {
                department: selectedDepartment === "all" ? undefined : selectedDepartment,
              })
            }
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <section className="border-y border-border/60 py-4">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
          {summaryMetrics.map((metric, index) => (
            <SummaryMetric
              key={metric.label}
              label={metric.label}
              value={metric.value}
              detail={metric.detail}
              icon={metric.icon}
              className={cn(index > 0 && "xl:border-l xl:border-border/60 xl:pl-5")}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-8">
          <section className="space-y-4">
            <SectionHeader
              title="Department Performance"
              description={
                selectedDepartment === "all"
                  ? "Compare department output, indexed publication rate, and profile completion."
                  : `Current reporting status for ${scopeLabel}.`
              }
              action={
                selectedDepartment === "all" ? (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/departments" className="gap-1">
                      View all departments
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/departments/${selectedDepartment}`} className="gap-1">
                      Open department
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )
              }
            />

            {visibleDepartmentRows.length === 0 ? (
              <EmptySectionState
                icon={Building2}
                title="No department data available"
                description="Faculty records need department metadata before this comparison can be generated."
              />
            ) : (
              <div className="overflow-hidden border-y border-border/60">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-0">Department</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Publications</TableHead>
                      <TableHead>Indexed Rate</TableHead>
                      <TableHead className="min-w-44">Completion</TableHead>
                      <TableHead className="pr-0 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleDepartmentRows.map((department) => {
                      const departmentIndexedRate = department.publicationsCount
                        ? Math.round(
                            (department.indexedPublicationsCount / department.publicationsCount) * 100
                          )
                        : 0

                      return (
                        <TableRow key={department.department}>
                          <TableCell className="pl-0 whitespace-normal">
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{department.label}</p>
                              <p className="text-xs text-muted-foreground">{department.department}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{department.facultyCount}</p>
                              <p className="text-xs text-muted-foreground">
                                {department.activeFacultyCount} active
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{department.publicationsCount}</p>
                              <p className="text-xs text-muted-foreground">
                                {department.indexedPublicationsCount} indexed
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{departmentIndexedRate}% indexed</Badge>
                          </TableCell>
                          <TableCell className="min-w-44">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Avg completion</span>
                                <span className="font-medium">{department.avgCompletionScore}%</span>
                              </div>
                              <Progress value={department.avgCompletionScore} className="h-1.5" />
                            </div>
                          </TableCell>
                          <TableCell className="pr-0 text-right">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/admin/departments/${department.department}`}>Open</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <SectionHeader
              title="Compliance Snapshot"
              description={
                selectedDepartment === "all"
                  ? "Highest priority faculty and department review points from the compliance scoring engine."
                  : `Compliance review points currently flagged inside ${scopeLabel}.`
              }
              action={
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/decision-support" className="gap-1">
                    Open analytics
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              }
            />

            <div className="grid gap-4 border-y border-border/60 py-4 sm:grid-cols-2">
              <SummaryMetric
                label="High Priority"
                value={dashboard.decisionSupportSummary.highRiskFacultyCount}
                detail="Faculty above the priority threshold"
                icon={ShieldAlert}
              />
              <SummaryMetric
                label="Low Compliance"
                value={dashboard.decisionSupportSummary.lowReadinessFacultyCount}
                detail="Faculty below the readiness floor"
                icon={Target}
              />
              <SummaryMetric
                label="Departments"
                value={dashboard.decisionSupportSummary.departmentsNeedingIntervention}
                detail="Department scopes needing review"
                icon={Building2}
              />
              <SummaryMetric
                label="Avg Compliance"
                value={`${dashboard.decisionSupportSummary.averageReadinessScore}%`}
                detail="Average readiness across this scope"
                icon={Users}
              />
            </div>

            <Tabs defaultValue="faculty" className="gap-4">
              <TabsList className="h-auto w-full justify-start gap-2 rounded-none bg-transparent p-0">
                <TabsTrigger
                  value="faculty"
                  className="h-8 flex-none rounded-full border border-border/60 bg-transparent px-3 text-xs data-[state=active]:border-primary/40 data-[state=active]:bg-primary/5 data-[state=active]:shadow-none"
                >
                  Faculty to review
                </TabsTrigger>
                <TabsTrigger
                  value="departments"
                  className="h-8 flex-none rounded-full border border-border/60 bg-transparent px-3 text-xs data-[state=active]:border-primary/40 data-[state=active]:bg-primary/5 data-[state=active]:shadow-none"
                >
                  Departments
                </TabsTrigger>
              </TabsList>

              <TabsContent value="faculty">
                {dashboard.decisionSupportSummary.topFaculty.length === 0 ? (
                  <EmptySectionState
                    icon={ShieldAlert}
                    title="No faculty review items"
                    description="The current scope does not have faculty records in the dashboard compliance snapshot."
                  />
                ) : (
                  <div className="overflow-hidden border-y border-border/60">
                    <Table className="min-w-[760px]">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="pl-0">Faculty</TableHead>
                          <TableHead>Dept</TableHead>
                          <TableHead className="min-w-40">Compliance</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead className="pr-0 text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboard.decisionSupportSummary.topFaculty.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="pl-0 whitespace-normal">
                              <div className="flex items-start gap-3">
                                <Avatar className="mt-0.5 h-9 w-9">
                                  <AvatarImage src={item.avatarUrl ?? undefined} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {item.name
                                      .split(" ")
                                      .map((name) => name[0])
                                      .join("")
                                      .slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 space-y-1">
                                  <p className="font-medium text-foreground">{item.name}</p>
                                  <p className="break-all text-xs text-muted-foreground">{item.email}</p>
                                  <p className="text-xs text-muted-foreground">{item.nextActionLabel}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-foreground">
                                {item.department ?? "—"}
                              </span>
                            </TableCell>
                            <TableCell className="min-w-40">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Readiness</span>
                                  <span className="font-medium">{item.readinessScore}%</span>
                                </div>
                                <Progress value={item.readinessScore} className="h-1.5" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.riskScore}% priority</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`border ${decisionSupportSeverityClasses[item.severity]}`}>
                                {item.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="pr-0 text-right">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={item.href}>View</Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="departments">
                {dashboard.decisionSupportSummary.topDepartments.length === 0 ? (
                  <EmptySectionState
                    icon={Building2}
                    title="No department review items"
                    description="The current scope does not have department-level compliance concerns in the dashboard snapshot."
                  />
                ) : (
                  <div className="overflow-hidden border-y border-border/60">
                    <Table className="min-w-[760px]">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="pl-0">Department</TableHead>
                          <TableHead>Faculty</TableHead>
                          <TableHead className="min-w-40">Compliance</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead className="pr-0 text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboard.decisionSupportSummary.topDepartments.map((item) => (
                          <TableRow key={item.department}>
                            <TableCell className="pl-0 whitespace-normal">
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">{item.label}</p>
                                <p className="text-xs text-muted-foreground">{item.department}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.topBlockers.length > 0
                                    ? item.topBlockers.join(" / ")
                                    : item.nextActionLabel}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-foreground">{item.facultyCount}</p>
                              <p className="text-xs text-muted-foreground">faculty tracked</p>
                            </TableCell>
                            <TableCell className="min-w-40">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Readiness</span>
                                  <span className="font-medium">{item.readinessScore}%</span>
                                </div>
                                <Progress value={item.readinessScore} className="h-1.5" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.riskScore}% priority</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`border ${decisionSupportSeverityClasses[item.severity]}`}>
                                {item.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="pr-0 text-right">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={item.href}>Open</Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </section>

        </div>

        <div className="space-y-8 xl:sticky xl:top-6 xl:self-start">
          <section className="space-y-4">
            <SectionHeader
              title="Recent Activity"
              description={
                selectedDepartment === "all"
                  ? "Latest 4 publication, engagement, and research updates across the admin workspace."
                  : `Latest 4 portfolio updates recorded inside ${scopeLabel}.`
              }
              meta={<Badge variant="secondary">{recentActivity.length}</Badge>}
            />

            {recentActivity.length === 0 ? (
              <EmptySectionState
                icon={Clock}
                title="No recent activity"
                description="New faculty submissions and updates will appear here once records start changing."
              />
            ) : (
              <div className="divide-y divide-border/60 border-y border-border/60">
                {recentActivity.map((activity) => (
                  <div
                    key={`${activity.type}-${activity.id}`}
                    className="flex items-start gap-3 py-4"
                  >
                    <Avatar className="mt-0.5 h-9 w-9">
                      <AvatarImage src={activity.user_avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {activity.user_name
                          .split(" ")
                          .map((name) => name[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{activity.user_name}</span>
                        <span className="text-muted-foreground"> {getActivityCopy(activity.type)}</span>
                      </p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{activity.title}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(activity.created_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 lowercase">
                      {activity.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <SectionHeader
              title="Pending Actions"
              description={
                selectedDepartment === "all"
                  ? "Accounts and records that need follow-up before reporting stays clean."
                  : `Faculty and invites inside ${scopeLabel} that need follow-up.`
              }
              meta={<Badge variant="secondary">{dashboard.pendingActions.length}</Badge>}
            />

            {dashboard.pendingActions.length === 0 ? (
              <EmptySectionState
                icon={CheckCircle2}
                title="All caught up"
                description="No pending actions were detected for the current dashboard scope."
              />
            ) : (
              <div className="divide-y divide-border/60 border-y border-border/60">
                {dashboard.pendingActions.map((item) => {
                  const content = (
                    <div className="flex items-start gap-3 py-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {item.title.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                          <Badge className="border border-amber-200 bg-amber-50 text-amber-700">
                            {item.issue}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(item.created_at)}
                        </p>
                      </div>
                      {item.href ? (
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : null}
                    </div>
                  )

                  return item.href ? (
                    <Link
                      key={`${item.recordType}-${item.id}`}
                      href={item.href}
                      className="block transition-colors hover:bg-muted/30"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={`${item.recordType}-${item.id}`}>{content}</div>
                  )
                })}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  )
}
