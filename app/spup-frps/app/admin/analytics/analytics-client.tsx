"use client"

import Link from "next/link"
import { useMemo } from "react"
import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  Download,
  PieChart as PieChartIcon,
  TrendingUp,
  Users,
} from "lucide-react"
import { AdminAnalyticsSkeleton } from "@/components/admin/admin-page-skeletons"
import { AdminSectionHeader, AdminSummaryStrip } from "@/components/admin/admin-page-primitives"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdminAnalyticsQuery } from "@/lib/query/admin"
import type { AdminAnalyticsSummary } from "@/lib/types"
import { Bar, BarChart, CartesianGrid, Pie, PieChart as RechartsPie, XAxis, YAxis } from "recharts"

function getIndexedRate(indexedCount: number, publicationCount: number) {
  if (publicationCount <= 0) {
    return 0
  }

  return Math.round((indexedCount / publicationCount) * 100)
}

interface AdminAnalyticsPageProps {
  initialAnalytics?: AdminAnalyticsSummary | null
}

export default function AdminAnalyticsPage({
  initialAnalytics = null,
}: AdminAnalyticsPageProps) {
  const analyticsQuery = useAdminAnalyticsQuery(true, initialAnalytics ?? undefined)
  const analytics = analyticsQuery.data ?? null
  const isLoading = analyticsQuery.isLoading && !analyticsQuery.data

  const colors = useMemo(
    () => [
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
      "var(--chart-6)",
      "var(--chart-7)",
    ],
    []
  )

  if (isLoading) {
    return <AdminAnalyticsSkeleton />
  }

  if (!analytics) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Unable to load analytics.</p>
      </div>
    )
  }

  const publicationTrendConfig = {
    publications: {
      label: "Publications",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig

  const publicationTypeData = analytics.publicationsByType.map((item, index) => ({
    ...item,
    chartKey: `type-${index + 1}`,
    fill: colors[index % colors.length],
  }))

  const publicationTypeConfig = publicationTypeData.reduce<ChartConfig>((config, item) => {
    config[item.chartKey] = {
      label: item.name,
      color: item.fill,
    }

    return config
  }, {})

  const topDepartment = analytics.departmentPerformance[0] ?? null
  const topIndexingCount = analytics.indexingDistribution[0]?.count ?? 0
  const summaryItems = [
    {
      label: "Total Publications",
      value: analytics.totalPublications,
      detail: "All tracked publication records",
      icon: BookOpen,
    },
    {
      label: "Indexed Publications",
      value: analytics.indexedPublications,
      detail: `${getIndexedRate(analytics.indexedPublications, analytics.totalPublications)}% indexed rate`,
      icon: Award,
    },
    {
      label: "Avg per Faculty",
      value: analytics.avgPublicationsPerFaculty,
      detail: "Average publication count per faculty record",
      icon: Users,
    },
    {
      label: "Research Projects",
      value: analytics.totalResearchTitles,
      detail: "Tracked research titles across the institution",
      icon: TrendingUp,
    },
  ] satisfies Array<{
    label: string
    value: string | number
    detail: string
    icon: typeof BookOpen
  }>

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Research portfolio trends, department output, and indexing coverage in one analytical workspace.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={async () => {
            const { AdminService } = await import("@/lib/services/admin-service")
            await AdminService.downloadExport("publications")
          }}
        >
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      <AdminSummaryStrip items={summaryItems} />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-8">
          <section className="space-y-4">
            <AdminSectionHeader
              title="Publication Trends"
              description="Track annual output and publication mix without splitting the analysis into separate floating panels."
              meta={<Badge variant="secondary">{analytics.publicationsByYear.length} years</Badge>}
            />
            <div className="grid gap-8 border-y border-border/60 py-4 lg:grid-cols-[minmax(0,1.15fr)_340px]">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Publications by year</p>
                  <p className="text-sm text-muted-foreground">Annual publication output across all tracked faculty records.</p>
                </div>
                {analytics.publicationsByYear.length === 0 ? (
                  <EmptyState
                    icon={BarChart3}
                    title="No publication trend data"
                    description="Publication activity will appear here once records are available."
                    className="border-0 py-10"
                  />
                ) : (
                  <ChartContainer
                    config={publicationTrendConfig}
                    className="h-72 w-full"
                  >
                    <BarChart
                      accessibilityLayer
                      data={analytics.publicationsByYear}
                      margin={{ left: -12, right: 12, top: 6 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="year" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                      <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} tickMargin={8} />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            indicator="line"
                            labelFormatter={(value) => `Year ${value}`}
                          />
                        }
                      />
                      <Bar
                        dataKey="publications"
                        fill="var(--color-publications)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={56}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Publications by type</p>
                  <p className="text-sm text-muted-foreground">Distribution of publication categories in the current dataset.</p>
                </div>
                {analytics.publicationsByType.length === 0 ? (
                  <EmptyState
                    icon={PieChartIcon}
                    title="No publication type data"
                    description="Type breakdown appears after publications are classified."
                    className="border-0 py-10"
                  />
                ) : (
                  <ChartContainer
                    config={publicationTypeConfig}
                    className="mx-auto aspect-square h-[19rem] w-full max-w-[20rem]"
                  >
                    <RechartsPie accessibilityLayer>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel nameKey="chartKey" />}
                      />
                      <Pie
                        data={publicationTypeData}
                        dataKey="value"
                        nameKey="chartKey"
                        innerRadius={56}
                        outerRadius={84}
                        paddingAngle={3}
                        strokeWidth={3}
                      />
                      <ChartLegend
                        content={
                          <ChartLegendContent
                            nameKey="chartKey"
                            className="flex-wrap justify-center gap-x-4 gap-y-2 pt-5"
                          />
                        }
                      />
                    </RechartsPie>
                  </ChartContainer>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <AdminSectionHeader
              title="Department Performance"
              description="Compare publication volume, indexed rate, and completion readiness across departments."
              meta={
                topDepartment ? (
                  <Badge variant="secondary">{topDepartment.label} leads in publication count</Badge>
                ) : undefined
              }
            />
            {analytics.departmentPerformance.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No department analytics available"
                description="Department performance data will appear here once faculty records are available."
                className="border-y border-border/60 py-10"
              />
            ) : (
              <div className="overflow-hidden border-y border-border/60">
                <Table className="min-w-[960px]">
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
                    {analytics.departmentPerformance.map((department) => (
                      <TableRow key={department.department}>
                        <TableCell className="pl-0 whitespace-normal">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{department.label}</p>
                            <p className="text-sm text-muted-foreground">{department.department}</p>
                          </div>
                        </TableCell>
                        <TableCell>{department.facultyCount}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{department.publicationsCount}</p>
                            <p className="text-xs text-muted-foreground">
                              {department.indexedPublicationsCount} indexed publications
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getIndexedRate(
                              department.indexedPublicationsCount,
                              department.publicationsCount
                            )}
                            %
                          </Badge>
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
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/departments/${department.department}`}>View Dept</Link>
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

        <div className="space-y-8 xl:self-start">
          <section className="space-y-4">
            <AdminSectionHeader
              title="SDG Alignment"
              description="Top Sustainable Development Goals represented in the current publication dataset."
              meta={<Badge variant="secondary">{analytics.sdgDistribution.length}</Badge>}
            />
            {analytics.sdgDistribution.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No SDG mapping available"
                description="Mapped SDG goals will appear here after records include SDG tags."
                className="border-y border-border/60 py-10"
              />
            ) : (
              <div className="divide-y divide-border/60 border-y border-border/60">
                {analytics.sdgDistribution.map((sdg, index) => (
                  <div key={sdg.goal} className="flex items-center gap-3 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{sdg.goal}</p>
                    </div>
                    <Badge variant="secondary" className="text-[11px]">
                      {sdg.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <AdminSectionHeader
              title="Indexing Distribution"
              description="Compare coverage across indexing databases without splitting the ranking into separate cards."
              meta={topIndexingCount > 0 ? <Badge variant="secondary">Top source {topIndexingCount}</Badge> : undefined}
            />
            {analytics.indexingDistribution.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No indexing data available"
                description="Indexing coverage will appear once publications include indexing metadata."
                className="border-y border-border/60 py-10"
              />
            ) : (
              <div className="divide-y divide-border/60 border-y border-border/60">
                {analytics.indexingDistribution.map((item) => (
                  <div key={item.name} className="space-y-2 py-3">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-foreground">{item.name}</span>
                      <span className="font-medium text-foreground">{item.count}</span>
                    </div>
                    <Progress
                      value={topIndexingCount > 0 ? (item.count / topIndexingCount) * 100 : 0}
                      className="h-1.5"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
