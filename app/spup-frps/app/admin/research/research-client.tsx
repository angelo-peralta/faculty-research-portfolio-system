"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Search,
  Filter,
  Lightbulb,
  TrendingUp,
  DollarSign,
  Download,
  MoreVertical,
  Eye,
  CheckCircle2,
  Edit2,
  Trash2,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AdminCollectionPageSkeleton } from "@/components/admin/admin-page-skeletons"
import { AdminSectionHeader, AdminSummaryStrip } from "@/components/admin/admin-page-primitives"
import { AdminPaginationControls } from "@/components/admin/admin-pagination-controls"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ResearchFormFields } from "@/components/faculty/forms/research-form-fields"
import { SDGBadgeGroup } from "@/components/shared/sdg-badge-group"
import { EmptyState } from "@/components/shared/empty-state"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth-context"
import { useAdminResearchQuery } from "@/lib/query/admin"
import { AdminService } from "@/lib/services/admin-service"
import { RESEARCH_STATUS } from "@/lib/constants"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { emptyResearchTitlePayload, toResearchTitlePayload } from "@/lib/faculty-content"
import type { AdminResearchTitleItem, ResearchTitlePayload } from "@/lib/types"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })
}

type AdminResearchPageProps = {
  initialSearch?: string
}

export default function AdminResearchPage({ initialSearch = "" }: AdminResearchPageProps) {
  const { isMainAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const normalizedSearchQuery = searchQuery.trim()
  const debouncedSearchQuery = useDebouncedValue(normalizedSearchQuery, 250)
  const [page, setPage] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedResearchTitle, setSelectedResearchTitle] = useState<AdminResearchTitleItem | null>(null)
  const [formData, setFormData] = useState<ResearchTitlePayload>(emptyResearchTitlePayload)
  const [paperFile, setPaperFile] = useState<File | null>(null)

  useEffect(() => {
    setSearchQuery(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearchQuery, selectedStatus])

  const researchQuery = useAdminResearchQuery({
    search: debouncedSearchQuery || undefined,
    status: selectedStatus as "all" | ResearchTitlePayload["status"],
    page,
    page_size: 20,
  })

  const researchTitles = researchQuery.data?.items ?? []
  const stats = researchQuery.data?.stats ?? {
    total: 0,
    ongoing: 0,
    completed: 0,
    totalFunding: 0,
  }
  const totalResearchTitles = researchQuery.data?.total ?? 0
  const pageSize = researchQuery.data?.page_size ?? 20
  const totalPages = researchQuery.data?.total_pages ?? 1

  const openEditDialog = (researchTitle: AdminResearchTitleItem) => {
    setSelectedResearchTitle(researchTitle)
    setFormData(toResearchTitlePayload(researchTitle))
    setPaperFile(null)
    setIsFormOpen(true)
  }

  const handleSave = async () => {
    if (!selectedResearchTitle) {
      return
    }

    setIsSaving(true)

    try {
      await AdminService.saveFacultyResearch(selectedResearchTitle.faculty_id, formData, paperFile)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "research"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "faculty-detail", selectedResearchTitle.faculty_id] }),
      ])
      setIsFormOpen(false)
      setPaperFile(null)
      toast.success("Research title updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save research title.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedResearchTitle || !isMainAdmin) {
      return
    }

    setIsSaving(true)

    try {
      await AdminService.deleteFacultyResearch(selectedResearchTitle.faculty_id, selectedResearchTitle.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "research"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "faculty-detail", selectedResearchTitle.faculty_id] }),
      ])
      setIsDeleteOpen(false)
      setSelectedResearchTitle(null)
      toast.success("Research title deleted.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete research title.")
    } finally {
      setIsSaving(false)
    }
  }

  const openResearchPaper = async (researchTitle: AdminResearchTitleItem) => {
    try {
      const url =
        researchTitle.paper_url ??
        await AdminService.getSignedAssetUrl({
          facultyId: researchTitle.faculty_id,
          kind: 'research-paper',
          id: researchTitle.id,
        })

      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open the research paper.")
    }
  }

  if (!researchQuery.data && researchQuery.isPending) {
    return <AdminCollectionPageSkeleton />
  }

  const summaryItems = [
    {
      label: "Projects",
      value: stats.total,
      detail: `${totalResearchTitles} records in scope`,
      icon: Lightbulb,
    },
    {
      label: "Ongoing",
      value: stats.ongoing,
      detail: "Active research workstreams",
      icon: TrendingUp,
    },
    {
      label: "Completed",
      value: stats.completed,
      detail: "Finished projects on file",
      icon: CheckCircle2,
    },
    {
      label: "Funding",
      value: formatCurrency(stats.totalFunding),
      detail: "Declared research funding",
      icon: DollarSign,
    },
  ] satisfies Array<{
    label: string
    value: string | number
    detail: string
    icon: typeof Lightbulb
  }>

  return (
    <div className="space-y-8">
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Research Title</DialogTitle>
            <DialogDescription>Update the research record without leaving the aggregate admin view.</DialogDescription>
          </DialogHeader>
          <ResearchFormFields
            formData={formData}
            setFormData={setFormData}
            paperFile={paperFile}
            setPaperFile={setPaperFile}
            existingPaperUrl={selectedResearchTitle?.paper_url ?? null}
            onViewExistingPaper={
              selectedResearchTitle?.paper_path
                ? () => {
                    void openResearchPaper(selectedResearchTitle)
                  }
                : null
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Research Title</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the research record from the selected faculty profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={isSaving}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSaving ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Research</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review research projects, funding, schedules, and faculty ownership from one admin table.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => void AdminService.downloadExport("research")}
        >
          <Download className="h-4 w-4" />
          Export All
        </Button>
      </div>

      <AdminSummaryStrip items={summaryItems} />

      <section className="space-y-4">
        <AdminSectionHeader
          title="Filters"
          description="Search research titles and narrow the table by project status."
        />
        <div className="flex flex-col gap-4 border-y border-border/60 py-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, researcher, or faculty..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-44">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {RESEARCH_STATUS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="space-y-4">
        <AdminSectionHeader
          title="Research Records"
          description={
            totalResearchTitles === 0
              ? "No research records match the current scope."
              : "Project status, funding, schedules, and faculty ownership in one view."
          }
          meta={<Badge variant="secondary">{totalResearchTitles}</Badge>}
        />

        {researchTitles.length === 0 ? (
          <EmptyState icon={Lightbulb} title="No research projects found" description="Try adjusting your filters" />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden border-y border-border/60">
              <Table className="min-w-[1180px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-0">Project</TableHead>
                    <TableHead>Faculty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Funding</TableHead>
                    <TableHead className="min-w-40">Progress</TableHead>
                    <TableHead className="pr-0 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {researchTitles.map((researchTitle) => (
                    <TableRow key={researchTitle.id}>
                      <TableCell className="pl-0 whitespace-normal">
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{researchTitle.title}</p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {(researchTitle.researchers ?? []).join(", ") || "No researchers listed"}
                            </p>
                            {researchTitle.description ? (
                              <p className="line-clamp-2 text-xs text-muted-foreground">
                                {researchTitle.description}
                              </p>
                            ) : null}
                          </div>
                          <SDGBadgeGroup goals={researchTitle.sdgGoals ?? []} size="sm" />
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="flex items-start gap-3">
                          <Avatar className="mt-0.5 h-9 w-9">
                            <AvatarImage src={researchTitle.faculty_avatar_url ?? undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {researchTitle.faculty_name
                                .split(" ")
                                .map((name) => name[0])
                                .join("")
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 space-y-1">
                            <p className="font-medium text-foreground">{researchTitle.faculty_name}</p>
                            <p className="break-all text-xs text-muted-foreground">
                              {researchTitle.faculty_email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {researchTitle.department ?? "No department"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {RESEARCH_STATUS.find((status) => status.value === researchTitle.status)?.label ??
                            researchTitle.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {researchTitle.startDate ? (
                            <p>
                              {formatDate(researchTitle.startDate)}
                              {researchTitle.endDate ? ` - ${formatDate(researchTitle.endDate)}` : ""}
                            </p>
                          ) : researchTitle.year ? (
                            <p>{researchTitle.year}</p>
                          ) : (
                            <p>No schedule set</p>
                          )}
                          {researchTitle.paper_path ? <p>Paper attached</p> : null}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {researchTitle.fundingAmount && researchTitle.fundingAmount > 0
                              ? formatCurrency(researchTitle.fundingAmount)
                              : "No amount"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {researchTitle.fundingSource ?? "No funding source"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-40">
                        {typeof researchTitle.progress === "number" ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{researchTitle.progress}%</span>
                            </div>
                            <Progress value={researchTitle.progress} className="h-1.5" />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No progress reported</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-0 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(researchTitle)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/faculty/${researchTitle.faculty_id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Faculty
                              </Link>
                            </DropdownMenuItem>
                            {researchTitle.paper_path ? (
                              <DropdownMenuItem onClick={() => void openResearchPaper(researchTitle)}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Paper
                              </DropdownMenuItem>
                            ) : null}
                            {isMainAdmin ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedResearchTitle(researchTitle)
                                    setIsDeleteOpen(true)
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <AdminPaginationControls
              page={page}
              pageSize={pageSize}
              total={totalResearchTitles}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </section>
    </div>
  )
}
