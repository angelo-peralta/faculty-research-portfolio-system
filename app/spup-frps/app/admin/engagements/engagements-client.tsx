"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Search,
  Filter,
  Briefcase,
  Users,
  Download,
  MoreVertical,
  Eye,
  Globe,
  Award,
  Edit2,
  Trash2,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { EngagementFormFields } from "@/components/faculty/forms/engagement-form-fields"
import { EmptyState } from "@/components/shared/empty-state"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth-context"
import { getEngagementStatusLabel, hasEngagementCertificate, normalizeEngagementPayload } from "@/lib/engagement-utils"
import { useAdminEngagementsQuery } from "@/lib/query/admin"
import { AdminService } from "@/lib/services/admin-service"
import { ENGAGEMENT_TYPES } from "@/lib/constants"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { emptyEngagementPayload, toEngagementPayload } from "@/lib/faculty-content"
import type { AdminEngagementItem, EngagementPayload } from "@/lib/types"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })
}

type AdminEngagementsPageProps = {
  initialSearch?: string
}

export default function AdminEngagementsPage({ initialSearch = "" }: AdminEngagementsPageProps) {
  const { isMainAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const normalizedSearchQuery = searchQuery.trim()
  const debouncedSearchQuery = useDebouncedValue(normalizedSearchQuery, 250)
  const [page, setPage] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedEngagement, setSelectedEngagement] = useState<AdminEngagementItem | null>(null)
  const [formData, setFormData] = useState<EngagementPayload>(emptyEngagementPayload)
  const [certificateFile, setCertificateFile] = useState<File | null>(null)

  useEffect(() => {
    setSearchQuery(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearchQuery, selectedType, selectedStatus])

  const engagementsQuery = useAdminEngagementsQuery({
    search: debouncedSearchQuery || undefined,
    type: selectedType as "all" | EngagementPayload["type"],
    status: selectedStatus as "all" | EngagementPayload["status"],
    page,
    page_size: 20,
  })

  const engagements = engagementsQuery.data?.items ?? []
  const stats = engagementsQuery.data?.stats ?? {
    total: 0,
    ongoing: 0,
    completed: 0,
    beneficiaries: 0,
  }
  const totalEngagements = engagementsQuery.data?.total ?? 0
  const pageSize = engagementsQuery.data?.page_size ?? 20
  const totalPages = engagementsQuery.data?.total_pages ?? 1

  const resetFormState = () => {
    setSelectedEngagement(null)
    setFormData(emptyEngagementPayload)
    setCertificateFile(null)
  }

  const handleFormOpenChange = (open: boolean) => {
    setIsFormOpen(open)

    if (!open) {
      resetFormState()
    }
  }

  const openEditDialog = (engagement: AdminEngagementItem) => {
    setSelectedEngagement(engagement)
    setFormData(toEngagementPayload(engagement))
    setCertificateFile(null)
    setIsFormOpen(true)
  }

  const handleSave = async () => {
    if (!selectedEngagement) {
      return
    }

    setIsSaving(true)

    try {
      await AdminService.saveFacultyEngagement(
        selectedEngagement.faculty_id,
        normalizeEngagementPayload(formData),
        certificateFile
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "engagements"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "faculty-detail", selectedEngagement.faculty_id] }),
      ])
      handleFormOpenChange(false)
      toast.success("Engagement updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save engagement.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedEngagement || !isMainAdmin) {
      return
    }

    setIsSaving(true)

    try {
      await AdminService.deleteFacultyEngagement(selectedEngagement.faculty_id, selectedEngagement.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "engagements"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "faculty-detail", selectedEngagement.faculty_id] }),
      ])
      setIsDeleteOpen(false)
      setSelectedEngagement(null)
      toast.success("Engagement deleted.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete engagement.")
    } finally {
      setIsSaving(false)
    }
  }

  const openEngagementCertificate = async (engagement: AdminEngagementItem) => {
    try {
      const url =
        engagement.certificate_url ??
        await AdminService.getSignedAssetUrl({
          facultyId: engagement.faculty_id,
          kind: 'engagement-certificate',
          id: engagement.id,
        })

      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open the engagement certificate.")
    }
  }

  if (!engagementsQuery.data && engagementsQuery.isPending) {
    return <AdminCollectionPageSkeleton />
  }

  const summaryItems = [
    {
      label: "Engagements",
      value: stats.total,
      detail: `${totalEngagements} records in scope`,
      icon: Briefcase,
    },
    {
      label: "Ongoing",
      value: stats.ongoing,
      detail: "Active external activities",
      icon: Globe,
    },
    {
      label: "Completed",
      value: stats.completed,
      detail: "Finished engagement records",
      icon: Award,
    },
    {
      label: "Beneficiaries",
      value: stats.beneficiaries.toLocaleString(),
      detail: "Combined reported reach",
      icon: Users,
    },
  ] satisfies Array<{
    label: string
    value: string | number
    detail: string
    icon: typeof Briefcase
  }>

  return (
    <div className="space-y-8">
      <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Engagement</DialogTitle>
            <DialogDescription>Update the engagement without leaving the aggregate admin view.</DialogDescription>
          </DialogHeader>
          <EngagementFormFields
            formData={formData}
            setFormData={setFormData}
            certificateFile={certificateFile}
            setCertificateFile={setCertificateFile}
            existingCertificateUrl={selectedEngagement?.certificate_url ?? null}
            hasExistingCertificate={hasEngagementCertificate(selectedEngagement ?? {})}
            onViewExistingCertificate={
              selectedEngagement?.certificate_path
                ? () => {
                    void openEngagementCertificate(selectedEngagement)
                  }
                : null
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => handleFormOpenChange(false)} disabled={isSaving}>
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
            <AlertDialogTitle>Delete Engagement</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the engagement from the selected faculty profile.
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Engagements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review community and external engagement records by organization, timeline, faculty owner, and status.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => void AdminService.downloadExport("engagements")}
        >
          <Download className="h-4 w-4" />
          Export All
        </Button>
      </div>

      <AdminSummaryStrip items={summaryItems} />

      <section className="space-y-4">
        <AdminSectionHeader
          title="Filters"
          description="Search engagements and narrow the table by type and activity status."
        />
        <div className="flex flex-col gap-4 border-y border-border/60 py-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, organization, or faculty..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-44">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ENGAGEMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
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
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <AdminSectionHeader
          title="Engagement Records"
          description={
            totalEngagements === 0
              ? "No engagement records match the current scope."
              : "Organization, schedule, reach, and faculty ownership in one table."
          }
          meta={<Badge variant="secondary">{totalEngagements}</Badge>}
        />

        {!engagementsQuery.data && engagementsQuery.isError ? (
          <EmptyState
            icon={Briefcase}
            title="Unable to load engagements"
            description="Try refreshing the table or adjusting your filters."
            action={{
              label: "Retry",
              onClick: () => {
                void engagementsQuery.refetch()
              },
            }}
          />
        ) : engagements.length === 0 ? (
          <EmptyState icon={Briefcase} title="No engagements found" description="Try adjusting your filters" />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden border-y border-border/60">
              <Table className="min-w-[1180px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-0">Engagement</TableHead>
                    <TableHead>Faculty</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Beneficiaries</TableHead>
                    <TableHead className="pr-0 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {engagements.map((engagement) => (
                    <TableRow key={engagement.id}>
                      <TableCell className="pl-0 whitespace-normal">
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <p className="line-clamp-2 font-medium text-foreground">{engagement.title}</p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {engagement.organization}
                            </p>
                            {engagement.description ? (
                              <p className="line-clamp-2 text-xs text-muted-foreground">
                                {engagement.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="flex items-start gap-3">
                          <Avatar className="mt-0.5 h-9 w-9">
                            <AvatarImage src={engagement.faculty_avatar_url ?? undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {engagement.faculty_name
                                .split(" ")
                                .map((name) => name[0])
                                .join("")
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 space-y-1">
                            <p className="font-medium text-foreground">{engagement.faculty_name}</p>
                            <p className="break-all text-xs text-muted-foreground">
                              {engagement.faculty_email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {engagement.department ?? "No department"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {ENGAGEMENT_TYPES.find((type) => type.value === engagement.type)?.label ?? engagement.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getEngagementStatusLabel(engagement.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>
                            {formatDate(engagement.startDate)}
                            {engagement.endDate ? ` - ${formatDate(engagement.endDate)}` : ""}
                          </p>
                          {hasEngagementCertificate(engagement) ? <p>Certificate attached</p> : null}
                          {engagement.location ? <p>{engagement.location}</p> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {engagement.beneficiaries.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">reported reach</p>
                        </div>
                      </TableCell>
                      <TableCell className="pr-0 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(engagement)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/faculty/${engagement.faculty_id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Faculty
                              </Link>
                            </DropdownMenuItem>
                            {engagement.certificate_path ? (
                              <DropdownMenuItem onClick={() => void openEngagementCertificate(engagement)}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Certificate
                              </DropdownMenuItem>
                            ) : null}
                            {isMainAdmin ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedEngagement(engagement)
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
              total={totalEngagements}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </section>
    </div>
  )
}
