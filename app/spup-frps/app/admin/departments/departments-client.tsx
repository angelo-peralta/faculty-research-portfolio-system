"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Building2, Clock, Download, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminSectionHeader, AdminSummaryStrip } from "@/components/admin/admin-page-primitives"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AdminDepartmentsSkeleton } from "@/components/admin/admin-page-skeletons"
import { AdminService } from "@/lib/services/admin-service"
import type { AdminDepartmentPerformanceItem } from "@/lib/types"

type AdminDepartmentsPageProps = {
  initialDepartments?: AdminDepartmentPerformanceItem[]
}

export default function AdminDepartmentsPage({
  initialDepartments = [],
}: AdminDepartmentsPageProps) {
  const [departments, setDepartments] = useState<AdminDepartmentPerformanceItem[]>(initialDepartments)
  const [isLoading, setIsLoading] = useState(initialDepartments.length === 0)

  useEffect(() => {
    if (initialDepartments.length > 0) {
      return
    }

    let isMounted = true

    const loadDepartments = async () => {
      try {
        const rows = await AdminService.listDepartments()
        if (isMounted) {
          setDepartments(rows)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadDepartments()

    return () => {
      isMounted = false
    }
  }, [initialDepartments.length])

  const totals = useMemo(
    () => ({
      departments: departments.length,
      faculty: departments.reduce((sum, department) => sum + department.facultyCount, 0),
      publications: departments.reduce((sum, department) => sum + department.publicationsCount, 0),
      avgCompletion: departments.length
        ? Math.round(
            departments.reduce((sum, department) => sum + department.avgCompletionScore, 0) / departments.length
          )
        : 0,
    }),
    [departments]
  )

  if (isLoading) {
    return <AdminDepartmentsSkeleton />
  }

  const summaryItems = [
    {
      label: "Departments",
      value: totals.departments,
      detail: "Department workspaces available",
      icon: Building2,
    },
    {
      label: "Faculty",
      value: totals.faculty,
      detail: "Faculty records across departments",
      icon: Users,
    },
    {
      label: "Publications",
      value: totals.publications,
      detail: "Tracked department publications",
      icon: Download,
    },
    {
      label: "Avg Completion",
      value: `${totals.avgCompletion}%`,
      detail: "Average profile readiness",
      icon: Clock,
    },
  ] satisfies Array<{
    label: string
    value: string | number
    detail: string
    icon: typeof Building2
  }>

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Departments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a department workspace to review faculty, reporting status, compliance analytics, and scoped exports.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => void AdminService.downloadExport("faculty")}
        >
          <Download className="h-4 w-4" />
          Export All Faculty
        </Button>
      </div>

      <AdminSummaryStrip items={summaryItems} />

      <section className="space-y-4">
        <AdminSectionHeader
          title="Department Workspaces"
          description="Compare reporting readiness and open a scoped department workspace from one table."
          meta={<Badge variant="secondary">{departments.length}</Badge>}
        />
        <div className="overflow-hidden border-y border-border/60">
          <Table className="min-w-[980px]">
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
              {departments.map((department) => {
                const indexedRate = department.publicationsCount
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
                      <Badge variant="outline">{indexedRate}% indexed</Badge>
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
                        <Link href={`/admin/departments/${department.department}`}>
                          Open
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
