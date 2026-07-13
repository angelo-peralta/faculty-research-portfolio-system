"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ShieldAlert,
  Target,
  TrendingDown,
  Users,
} from "lucide-react"
import { AdminCollectionPageSkeleton } from "@/components/admin/admin-page-skeletons"
import { AdminSectionHeader, AdminSummaryStrip } from "@/components/admin/admin-page-primitives"
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
import { DEPARTMENTS } from "@/lib/constants"
import {
  DECISION_SUPPORT_READINESS_FIELDS,
  DECISION_SUPPORT_RISK_FIELDS,
} from "@/lib/decision-support"
import { useAdminDecisionSupportQuery } from "@/lib/query/admin"
import type {
  DecisionSupportConfig,
  DecisionSupportSeverity,
} from "@/lib/types"

const severityConfig: Record<DecisionSupportSeverity, { label: string; className: string }> = {
  high: { label: "High", className: "border-red-200 bg-red-50 text-red-700" },
  medium: { label: "Medium", className: "border-amber-200 bg-amber-50 text-amber-700" },
  low: { label: "Low", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
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

function SeverityBadge({ severity }: { severity: DecisionSupportSeverity }) {
  return <Badge className={`border ${severityConfig[severity].className}`}>{severityConfig[severity].label}</Badge>
}

function ScoreCell({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "primary" | "priority"
}) {
  return (
    <div className="min-w-[140px] space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <Progress
        value={value}
        className={`h-1.5 ${tone === "priority" ? "[&>div]:bg-red-500" : ""}`}
      />
    </div>
  )
}

function DecisionSupportExplanation({ config }: { config: DecisionSupportConfig }) {
  return (
    <section className="space-y-4">
      <AdminSectionHeader
        title="Scoring Reference"
        description="Compliance shows reporting preparedness. Priority shows how urgently an admin should review a record."
      />
      <div className="grid gap-8 border-y border-border/60 py-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Compliance bands</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">High: {config.bands.readiness.high}%+</Badge>
              <Badge variant="outline">Medium: {config.bands.readiness.medium}%+</Badge>
              <Badge variant="outline">Low: below {config.bands.readiness.medium}%</Badge>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Compliance factors</p>
            <div className="divide-y divide-border/60 border-y border-border/60 text-sm">
              {DECISION_SUPPORT_READINESS_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-4 py-2.5">
                  <span>{field.label}</span>
                  <Badge variant="secondary">{config.readinessWeights[field.key]}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Priority bands</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">High: {config.bands.risk.high}%+</Badge>
              <Badge variant="outline">Medium: {config.bands.risk.medium}%+</Badge>
              <Badge variant="outline">Low: below {config.bands.risk.medium}%</Badge>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Priority factors</p>
            <div className="divide-y divide-border/60 border-y border-border/60 text-sm">
              {DECISION_SUPPORT_RISK_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-4 py-2.5">
                  <span>{field.label}</span>
                  <Badge variant="secondary">{config.riskWeights[field.key]}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function AdminDecisionSupportPage() {
  const decisionSupportQuery = useAdminDecisionSupportQuery()
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [selectedSeverity, setSelectedSeverity] = useState<"all" | DecisionSupportSeverity>("all")

  const filteredData = useMemo(() => {
    const faculty = (decisionSupportQuery.data?.faculty ?? []).filter((item) => {
      const matchesDepartment = selectedDepartment === "all" || item.department === selectedDepartment
      const matchesSeverity = selectedSeverity === "all" || item.severity === selectedSeverity
      return matchesDepartment && matchesSeverity
    })

    const departments = (decisionSupportQuery.data?.departments ?? []).filter((item) => {
      const matchesDepartment = selectedDepartment === "all" || item.department === selectedDepartment
      const matchesSeverity = selectedSeverity === "all" || item.severity === selectedSeverity
      return matchesDepartment && matchesSeverity
    })

    return {
      faculty,
      departments,
      summary: {
        highRiskFacultyCount: faculty.filter(
          (item) =>
            item.riskScore >= (decisionSupportQuery.data?.config.bands.risk.high ?? 100)
        ).length,
        lowReadinessFacultyCount: faculty.filter(
          (item) =>
            item.readinessScore < (decisionSupportQuery.data?.config.bands.readiness.medium ?? 0)
        ).length,
        departmentsNeedingIntervention: departments.filter((item) => item.severity !== "low").length,
        averageReadinessScore: faculty.length
          ? Math.round(faculty.reduce((sum, item) => sum + item.readinessScore, 0) / faculty.length)
          : 0,
      },
    }
  }, [decisionSupportQuery.data, selectedDepartment, selectedSeverity])

  if (!decisionSupportQuery.data && decisionSupportQuery.isPending) {
    return <AdminCollectionPageSkeleton />
  }

  if (!decisionSupportQuery.data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Unable to load compliance analytics.</p>
      </div>
    )
  }

  const summaryItems = [
    {
      label: "High Priority",
      value: filteredData.summary.highRiskFacultyCount,
      detail: "Faculty needing immediate review",
      icon: ShieldAlert,
    },
    {
      label: "Low Compliance",
      value: filteredData.summary.lowReadinessFacultyCount,
      detail: "Below the minimum compliance band",
      icon: TrendingDown,
    },
    {
      label: "Departments",
      value: filteredData.summary.departmentsNeedingIntervention,
      detail: "Department scopes needing follow-up",
      icon: Building2,
    },
    {
      label: "Avg Compliance",
      value: `${filteredData.summary.averageReadinessScore}%`,
      detail: "Across the filtered faculty set",
      icon: Target,
    },
  ] satisfies Array<{
    label: string
    value: string | number
    detail: string
    icon: typeof ShieldAlert
  }>

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Compliance Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review faculty and departments using compliance and priority scores.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/admin/settings">
            Configure Analytics Rules
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <AdminSummaryStrip items={summaryItems} />

      <section className="space-y-4">
        <AdminSectionHeader
          title="Filters"
          description="Narrow the analytics without reloading the page."
        />
        <div className="flex flex-col gap-4 border-y border-border/60 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {DEPARTMENTS.map((department) => (
                  <SelectItem key={department.value} value={department.value}>
                    {department.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSeverity} onValueChange={(value) => setSelectedSeverity(value as typeof selectedSeverity)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severity</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <DecisionSupportExplanation config={decisionSupportQuery.data.config} />

      <section className="space-y-4">
        <AdminSectionHeader
          title="Faculty Compliance Review"
          description="Sorted by priority descending, then compliance ascending."
          meta={<Badge variant="secondary">{filteredData.faculty.length}</Badge>}
        />
        {filteredData.faculty.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 border-y border-border/60 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No faculty matched the current filters.</p>
            <p className="text-xs text-muted-foreground">Adjust department or severity filters to broaden the list.</p>
          </div>
        ) : (
          <div className="overflow-hidden border-y border-border/60">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-0">Faculty</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead className="pr-0">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.faculty.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-0 whitespace-normal">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.email}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{item.department ?? "-"}</Badge>
                          <Badge variant="outline">{item.accessStatus}</Badge>
                          <Badge variant="outline">Last seen: {formatLastSeen(item.lastLoginAt)}</Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ScoreCell label="Compliance" value={item.readinessScore} tone="primary" />
                    </TableCell>
                    <TableCell>
                      <ScoreCell label="Priority" value={item.riskScore} tone="priority" />
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={item.severity} />
                    </TableCell>
                    <TableCell className="pr-0 whitespace-normal">
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

      <section className="space-y-4">
        <AdminSectionHeader
          title="Department Compliance Overview"
          description="Department averages based on faculty compliance and priority scores."
          meta={<Badge variant="secondary">{filteredData.departments.length}</Badge>}
        />
        {filteredData.departments.length === 0 ? (
          <div className="flex min-h-32 flex-col items-center justify-center gap-2 border-y border-border/60 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No departments matched the current filters.</p>
            <p className="text-xs text-muted-foreground">Faculty without departments are scored individually but not grouped here.</p>
          </div>
        ) : (
          <div className="overflow-hidden border-y border-border/60">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-0">Department</TableHead>
                  <TableHead>Faculty Tracked</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead className="pr-0">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.departments.map((item) => (
                  <TableRow key={item.department}>
                    <TableCell className="pl-0 whitespace-normal">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.department}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{item.facultyCount}</p>
                    </TableCell>
                    <TableCell>
                      <ScoreCell label="Compliance" value={item.readinessScore} tone="primary" />
                    </TableCell>
                    <TableCell>
                      <ScoreCell label="Priority" value={item.riskScore} tone="priority" />
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <SeverityBadge severity={item.severity} />
                    </TableCell>
                    <TableCell className="pr-0 whitespace-normal">
                      <Button asChild size="sm" variant="outline">
                        <Link href={item.href}>View department</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
