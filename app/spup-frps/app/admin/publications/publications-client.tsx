"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Search,
  Filter,
  BookOpen,
  FileText,
  Award,
  Calendar,
  Download,
  MoreVertical,
  ExternalLink,
  Eye,
  Edit2,
  Trash2,
  Paperclip,
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
import { PublicationFormFields } from "@/components/faculty/forms/publication-form-fields"
import { SDGBadgeGroup } from "@/components/shared/sdg-badge-group"
import { EmptyState } from "@/components/shared/empty-state"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth-context"
import { useAdminPublicationsQuery } from "@/lib/query/admin"
import { AdminService } from "@/lib/services/admin-service"
import { PUBLICATION_TYPES, INDEXING_TYPES } from "@/lib/constants"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { emptyPublicationPayload, toPublicationPayload } from "@/lib/faculty-content"
import {
  getPublicationFacultyRoleLabel,
  getPublicationIndexingStatus,
  getPublicationLink,
  getPublicationQuartileLabel,
  getPublicationStatusLabel,
  getPublicationTypeLabel,
  getPublicationValidationError,
  normalizePublicationPayload,
} from "@/lib/publication-utils"
import type { AdminPublicationItem, PublicationPayload } from "@/lib/types"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

type AdminPublicationsPageProps = {
  initialSearch?: string
}

export default function AdminPublicationsPage({ initialSearch = "" }: AdminPublicationsPageProps) {
  const { isMainAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedIndexing, setSelectedIndexing] = useState<string>("all")
  const normalizedSearchQuery = searchQuery.trim()
  const debouncedSearchQuery = useDebouncedValue(normalizedSearchQuery, 250)
  const [page, setPage] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedPublication, setSelectedPublication] = useState<AdminPublicationItem | null>(null)
  const [formData, setFormData] = useState<PublicationPayload>(emptyPublicationPayload)
  const [proofFile, setProofFile] = useState<File | null>(null)

  useEffect(() => {
    setSearchQuery(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearchQuery, selectedType, selectedYear, selectedIndexing])

  const publicationsQuery = useAdminPublicationsQuery({
    search: debouncedSearchQuery || undefined,
    type: selectedType as "all" | PublicationPayload["type"],
    year: selectedYear,
    indexing: selectedIndexing,
    page,
    page_size: 20,
  })

  const publications = publicationsQuery.data?.items ?? []
  const stats = publicationsQuery.data?.stats ?? {
    total: 0,
    indexed: 0,
    thisYear: 0,
    totalCitations: 0,
  }
  const availableYears = publicationsQuery.data?.available_years ?? []
  const totalPublications = publicationsQuery.data?.total ?? 0
  const pageSize = publicationsQuery.data?.page_size ?? 20
  const totalPages = publicationsQuery.data?.total_pages ?? 1
  const loadError = publicationsQuery.error instanceof Error
    ? publicationsQuery.error.message
    : "Unable to load publication records right now."

  const openEditDialog = (publication: AdminPublicationItem) => {
    setSelectedPublication(publication)
    setFormData(toPublicationPayload(publication))
    setProofFile(null)
    setIsFormOpen(true)
  }

  const handleSave = async () => {
    if (!selectedPublication) {
      return
    }

    const normalizedFormData = normalizePublicationPayload(formData)
    const validationError = getPublicationValidationError(normalizedFormData, {
      hasProof: Boolean(proofFile || selectedPublication.proof_path),
    })

    if (validationError) {
      toast.error(validationError)
      return
    }

    setIsSaving(true)

    try {
      await AdminService.saveFacultyPublication(selectedPublication.faculty_id, normalizedFormData, proofFile)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "publications"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "faculty-detail", selectedPublication.faculty_id] }),
      ])
      setIsFormOpen(false)
      setProofFile(null)
      toast.success("Publication updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save publication.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedPublication || !isMainAdmin) {
      return
    }

    setIsSaving(true)

    try {
      await AdminService.deleteFacultyPublication(selectedPublication.faculty_id, selectedPublication.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "publications"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "faculty-detail", selectedPublication.faculty_id] }),
      ])
      setIsDeleteOpen(false)
      setSelectedPublication(null)
      toast.success("Publication deleted.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete publication.")
    } finally {
      setIsSaving(false)
    }
  }

  const openPublicationProof = async (publication: AdminPublicationItem) => {
    try {
      const url =
        publication.proof_url ??
        await AdminService.getSignedAssetUrl({
          facultyId: publication.faculty_id,
          kind: 'publication-proof',
          id: publication.id,
        })

      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open the publication proof.")
    }
  }

  if (!publicationsQuery.data && publicationsQuery.isPending) {
    return <AdminCollectionPageSkeleton />
  }

  const summaryItems = [
    {
      label: "Publications",
      value: stats.total,
      detail: `${totalPublications} records in the current scope`,
      icon: BookOpen,
    },
    {
      label: "Indexed",
      value: stats.indexed,
      detail: stats.total > 0 ? `${Math.round((stats.indexed / stats.total) * 100)}% rate` : "0% rate",
      icon: Award,
    },
    {
      label: "This Year",
      value: stats.thisYear,
      detail: "Published in the current year",
      icon: Calendar,
    },
    {
      label: "Years Covered",
      value: availableYears.length,
      detail: availableYears.length > 0 ? "Publication years in the current scope" : "No publication years yet",
      icon: FileText,
    },
  ] satisfies Array<{
    label: string
    value: string | number
    detail: string
    icon: typeof BookOpen
  }>

  return (
    <div className="space-y-8">
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-4xl xl:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Publication</DialogTitle>
            <DialogDescription>Update the reporting metadata, indexing, and proof without leaving the aggregate admin view.</DialogDescription>
          </DialogHeader>
          <PublicationFormFields
            key={selectedPublication?.id ?? 'publication'}
            formData={formData}
            setFormData={setFormData}
            proofFile={proofFile}
            setProofFile={setProofFile}
            existingProofUrl={selectedPublication?.proof_url ?? null}
            hasExistingProof={Boolean(selectedPublication?.proof_path)}
            currentFacultyId={selectedPublication?.faculty_id ?? null}
            initialCoAuthors={selectedPublication?.co_authors ?? []}
            onViewExistingProof={
              selectedPublication?.proof_path
                ? () => {
                    void openPublicationProof(selectedPublication)
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
            <AlertDialogTitle>Delete Publication</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the publication from the selected faculty profile.
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Publications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review publication records across faculty, filter by type and indexing, and handle edits from one table.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => void AdminService.downloadExport("publications")}
        >
          <Download className="h-4 w-4" />
          Export All
        </Button>
      </div>

      <AdminSummaryStrip items={summaryItems} />

      <section className="space-y-4">
        <AdminSectionHeader
          title="Filters"
          description="Search publications and narrow the table by type, year, and indexing."
        />
        <div className="flex flex-col gap-4 border-y border-border/60 py-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, venue, or faculty..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-40">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PUBLICATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedIndexing} onValueChange={setSelectedIndexing}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Indexing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Indexing</SelectItem>
                <SelectItem value="non-indexed">Non-indexed</SelectItem>
                {INDEXING_TYPES.map((indexing) => (
                  <SelectItem key={indexing.value} value={indexing.value}>
                    {indexing.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <AdminSectionHeader
          title="Publication Records"
          description={
            totalPublications === 0
              ? "No publication records match the current scope."
              : "Publication metadata, faculty ownership, indexing, and edit actions in one view."
          }
          meta={<Badge variant="secondary">{totalPublications}</Badge>}
        />

        {publicationsQuery.isError && !publicationsQuery.data ? (
          <EmptyState
            icon={BookOpen}
            title="Unable to load publications"
            description={loadError}
            action={{
              label: "Try Again",
              onClick: () => {
                void publicationsQuery.refetch()
              },
            }}
          />
        ) : publications.length === 0 ? (
          <EmptyState icon={BookOpen} title="No publications found" description="Try adjusting your filters" />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden border-y border-border/60">
              <Table className="min-w-[1120px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-0">Publication</TableHead>
                    <TableHead>Faculty</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Indexed</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead className="pr-0 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {publications.map((publication) => {
                    const publicationLink = getPublicationLink(publication)

                    return (
                      <TableRow key={publication.id}>
                        <TableCell className="pl-0 whitespace-normal">
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{publication.title}</p>
                              {publication.venue ? (
                                <p className="line-clamp-1 text-xs text-muted-foreground">
                                  {publication.venue}
                                </p>
                              ) : null}
                              <p className="line-clamp-1 text-xs text-muted-foreground">
                                {publication.author_count} {publication.author_count === 1 ? "author" : "authors"} / {getPublicationFacultyRoleLabel(publication.faculty_role)}
                              </p>
                              {(publication.co_authors ?? []).length > 0 ? (
                                <p className="line-clamp-1 text-xs text-muted-foreground">
                                  Co-authors: {(publication.co_authors ?? [])
                                    .map((coAuthor) => `${coAuthor.name} (${getPublicationFacultyRoleLabel(coAuthor.faculty_role)})`)
                                    .join(", ")}
                                </p>
                              ) : null}
                            </div>
                            <SDGBadgeGroup goals={publication.sdgGoals} size="sm" />
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <div className="flex items-start gap-3">
                            <Avatar className="mt-0.5 h-9 w-9">
                              <AvatarImage src={publication.faculty_avatar_url ?? undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {publication.faculty_name
                                  .split(" ")
                                  .map((name) => name[0])
                                  .join("")
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 space-y-1">
                              <p className="font-medium text-foreground">{publication.faculty_name}</p>
                              <p className="break-all text-xs text-muted-foreground">
                                {publication.faculty_email}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {publication.department ?? "No department"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getPublicationTypeLabel(publication.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <div className="space-y-1">
                            <Badge variant="outline">{getPublicationIndexingStatus(publication.indexing)}</Badge>
                            <p className="text-xs text-muted-foreground">
                              {getPublicationStatusLabel(publication.status)}
                              {publication.quartile_ranking ? ` / ${getPublicationQuartileLabel(publication.quartile_ranking)}` : ""}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{publication.year}</Badge>
                        </TableCell>
                        <TableCell className="pr-0 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(publication)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/faculty/${publication.faculty_id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Faculty
                                </Link>
                              </DropdownMenuItem>
                              {publicationLink ? (
                                <DropdownMenuItem asChild>
                                  <a href={publicationLink.href} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    {publicationLink.label}
                                  </a>
                                </DropdownMenuItem>
                              ) : null}
                              {publication.proof_path ? (
                                <DropdownMenuItem onClick={() => void openPublicationProof(publication)}>
                                  <Paperclip className="mr-2 h-4 w-4" />
                                  View Proof
                                </DropdownMenuItem>
                              ) : null}
                              {isMainAdmin ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => {
                                      setSelectedPublication(publication)
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
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <AdminPaginationControls
              page={page}
              pageSize={pageSize}
              total={totalPublications}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </section>
    </div>
  )
}
