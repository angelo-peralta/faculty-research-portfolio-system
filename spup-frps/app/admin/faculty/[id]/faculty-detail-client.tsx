"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Mail,
  Building2,
  BookOpen,
  Briefcase,
  FileText,
  Award,
  Edit2,
  MoreVertical,
  Download,
  Clock,
  GraduationCap,
  UserX,
  RotateCcw,
  Plus,
  Trash2,
  ExternalLink,
  Paperclip,
  Users,
  DollarSign,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AdminFacultyDetailSkeleton } from "@/components/admin/admin-page-skeletons"
import { EmptyState } from "@/components/shared/empty-state"
import { SDGBadgeGroup } from "@/components/shared/sdg-badge-group"
import { Spinner } from "@/components/ui/spinner"
import { EducationFormFields } from "@/components/faculty/forms/education-form-fields"
import { PublicationFormFields } from "@/components/faculty/forms/publication-form-fields"
import { EngagementFormFields } from "@/components/faculty/forms/engagement-form-fields"
import { ResearchFormFields } from "@/components/faculty/forms/research-form-fields"
import { useAuth } from "@/lib/auth-context"
import { useAdminFacultyDetailQuery } from "@/lib/query/admin"
import { queryKeys } from "@/lib/query/query-keys"
import { AdminService } from "@/lib/services/admin-service"
import { DEPARTMENTS, EMPLOYMENT_STATUSES, RESEARCH_STATUS, ENGAGEMENT_TYPES } from "@/lib/constants"
import {
  emptyEducationPayload,
  emptyEngagementPayload,
  emptyPublicationPayload,
  emptyResearchTitlePayload,
  toEducationPayload,
  toEngagementPayload,
  toPublicationPayload,
  toResearchTitlePayload,
} from "@/lib/faculty-content"
import {
  getEngagementStatusLabel,
  hasEngagementCertificate,
  normalizeEngagementPayload,
} from "@/lib/engagement-utils"
import {
  getPublicationFacultyRoleLabel,
  getPublicationIndexingStatus,
  getPublicationLink,
  getPublicationQuartileLabel,
  getPublicationStatusLabel,
  getPublicationTypeLabel,
  getPublicationValidationError,
  isPublicationIndexed,
  normalizePublicationPayload,
} from "@/lib/publication-utils"
import {
  isIncompleteEducationEntry,
  isIncompleteEngagement,
  isIncompletePublication,
  isIncompleteResearchTitle,
} from "@/lib/record-completeness"
import type {
  AdminFacultyDetail,
  EducationEntry,
  EducationPayload,
  Engagement,
  EngagementPayload,
  ProfileCompletionStatus,
  ProfileUpdatePayload,
  Publication,
  PublicationPayload,
  ResearchTitle,
  ResearchTitlePayload,
} from "@/lib/types"
import { useQueryClient } from "@tanstack/react-query"

type DeleteTarget =
  | { kind: "education"; item: EducationEntry }
  | { kind: "publication"; item: Publication }
  | { kind: "engagement"; item: Engagement }
  | { kind: "research"; item: ResearchTitle }

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value)
}

function getDeleteStateDescription(target: DeleteTarget | null) {
  if (!target) {
    return {
      title: "",
      description: "",
    }
  }

  switch (target.kind) {
    case "education":
      return {
        title: "Delete Education Entry",
        description: "This will permanently remove the degree from the faculty profile.",
      }
    case "publication":
      return {
        title: "Delete Publication",
        description: "This will permanently remove the publication from the faculty profile.",
      }
    case "engagement":
      return {
        title: "Delete Engagement",
        description: "This will permanently remove the engagement and any linked certificate.",
      }
    case "research":
      return {
        title: "Delete Research Title",
        description: "This will permanently remove the research entry and any linked paper.",
      }
  }
}

function sortByDisplayOrder<T extends { display_order: number }>(items: T[]) {
  return [...items].sort((left, right) => left.display_order - right.display_order)
}

function upsertById<T extends { id: string; display_order: number }>(items: T[], nextItem: T) {
  return sortByDisplayOrder([...items.filter((item) => item.id !== nextItem.id), nextItem])
}

function calculateCompletion(detail: AdminFacultyDetail): ProfileCompletionStatus {
  const completeEducationCount = detail.education.filter((entry) => !isIncompleteEducationEntry(entry)).length
  const completePublicationsCount = detail.publications.filter((publication) => !isIncompletePublication(publication)).length
  const completeEngagementsCount = detail.engagements.filter((engagement) => !isIncompleteEngagement(engagement)).length
  const completeResearchTitlesCount = detail.researchTitles.filter((researchTitle) => !isIncompleteResearchTitle(researchTitle)).length
  const hasProfile = Boolean(detail.profile.department && detail.profile.employment_status)
  const hasEducation = completeEducationCount > 0
  const hasPublications = completePublicationsCount > 0
  const hasEngagements = completeEngagementsCount > 0
  const hasResearchTitles = completeResearchTitlesCount > 0
  const sections = [hasProfile, hasEducation, hasPublications, hasEngagements, hasResearchTitles]

  return {
    hasProfile,
    hasEducation,
    hasPublications,
    hasEngagements,
    hasResearchTitles,
    score: Math.round((sections.filter(Boolean).length / sections.length) * 100),
    educationCount: detail.education.length,
    publicationsCount: detail.publications.length,
    engagementsCount: detail.engagements.length,
    researchTitlesCount: detail.researchTitles.length,
  }
}

function withCalculatedCompletion(detail: AdminFacultyDetail): AdminFacultyDetail {
  return {
    ...detail,
    completion: calculateCompletion(detail),
  }
}

export default function AdminFacultyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isMainAdmin } = useAuth()
  const queryClient = useQueryClient()
  const facultyId = params.id as string
  const [detail, setDetail] = useState<AdminFacultyDetail | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingContent, setIsSavingContent] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [draft, setDraft] = useState<ProfileUpdatePayload>({
    name: "",
    department: null,
    specialization: null,
    employment_status: null,
  })

  const [selectedEducation, setSelectedEducation] = useState<EducationEntry | null>(null)
  const [educationDraft, setEducationDraft] = useState<EducationPayload>(emptyEducationPayload)
  const [isEducationOpen, setIsEducationOpen] = useState(false)

  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null)
  const [publicationDraft, setPublicationDraft] = useState<PublicationPayload>(emptyPublicationPayload)
  const [publicationProofFile, setPublicationProofFile] = useState<File | null>(null)
  const [isPublicationOpen, setIsPublicationOpen] = useState(false)

  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | null>(null)
  const [engagementDraft, setEngagementDraft] = useState<EngagementPayload>(emptyEngagementPayload)
  const [engagementCertificateFile, setEngagementCertificateFile] = useState<File | null>(null)
  const [isEngagementOpen, setIsEngagementOpen] = useState(false)

  const [selectedResearch, setSelectedResearch] = useState<ResearchTitle | null>(null)
  const [researchDraft, setResearchDraft] = useState<ResearchTitlePayload>(emptyResearchTitlePayload)
  const [researchPaperFile, setResearchPaperFile] = useState<File | null>(null)
  const [isResearchOpen, setIsResearchOpen] = useState(false)

  const syncProfileDraft = (nextDetail: AdminFacultyDetail) => {
    setDraft({
      name: nextDetail.profile.name,
      department: nextDetail.profile.department,
      specialization: nextDetail.profile.specialization,
      employment_status: nextDetail.profile.employment_status,
    })
  }

  const patchDetail = (updater: (current: AdminFacultyDetail) => AdminFacultyDetail) => {
    setDetail((current) => {
      if (!current) {
        return current
      }

      const nextDetail = withCalculatedCompletion(updater(current))
      queryClient.setQueryData(queryKeys.admin.facultyDetail(facultyId), nextDetail)
      return nextDetail
    })
  }

  const detailQuery = useAdminFacultyDetailQuery(facultyId, Boolean(facultyId))

  useEffect(() => {
    if (detailQuery.data) {
      const hydratedDetail = withCalculatedCompletion(detailQuery.data)
      setDetail(hydratedDetail)
      syncProfileDraft(hydratedDetail)
    }
  }, [detailQuery.data])

  const stats = useMemo(() => {
    if (!detail) {
      return null
    }

    return {
      publications: detail.publications.length,
      indexed: detail.publications.filter((publication) => isPublicationIndexed(publication.indexing)).length,
      engagements: detail.engagements.length,
      research: detail.researchTitles.length,
      ongoingResearch: detail.researchTitles.filter((researchTitle) => researchTitle.status === "ongoing").length,
    }
  }, [detail])

  const handleSave = async () => {
    if (!detail) {
      return
    }

    setIsSavingProfile(true)

    try {
      const profile: AdminFacultyDetail["profile"] = await AdminService.updateFacultyProfile(facultyId, draft)
      patchDetail((current) => ({
        ...current,
        profile,
      }))
      setIsEditOpen(false)
      toast.success("Faculty profile updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update profile.")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAccessChange = async () => {
    if (!detail || !isMainAdmin) {
      return
    }

    try {
      const nextStatus = detail.access_status === "active" ? "inactive" : "active"
      const updatedUser = await AdminService.setFacultyAccessStatus(facultyId, nextStatus)
      patchDetail((current) => ({
        ...current,
        access_status: updatedUser.access_status,
        profile: {
          ...current.profile,
          last_login_at: updatedUser.last_login_at,
        },
      }))
      toast.success(nextStatus === "active" ? "Faculty access restored." : "Faculty access deactivated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update access.")
    }
  }

  const openEducationDialog = (entry?: EducationEntry) => {
    if (entry) {
      setSelectedEducation(entry)
      setEducationDraft(toEducationPayload(entry))
    } else {
      setSelectedEducation(null)
      setEducationDraft(emptyEducationPayload)
    }

    setIsEducationOpen(true)
  }

  const openPublicationDialog = (publication?: Publication) => {
    if (publication) {
      if (publication.can_manage === false) {
        toast.info("Shared publications can only be edited from the faculty member who added them.")
        return
      }

      setSelectedPublication(publication)
      setPublicationDraft(toPublicationPayload(publication))
    } else {
      setSelectedPublication(null)
      setPublicationDraft(emptyPublicationPayload)
    }

    setPublicationProofFile(null)
    setIsPublicationOpen(true)
  }

  const openEngagementDialog = (engagement?: Engagement) => {
    if (engagement) {
      setSelectedEngagement(engagement)
      setEngagementDraft(toEngagementPayload(engagement))
    } else {
      setSelectedEngagement(null)
      setEngagementDraft(emptyEngagementPayload)
    }

    setEngagementCertificateFile(null)
    setIsEngagementOpen(true)
  }

  const handleEngagementDialogChange = (open: boolean) => {
    setIsEngagementOpen(open)

    if (!open) {
      setSelectedEngagement(null)
      setEngagementDraft(emptyEngagementPayload)
      setEngagementCertificateFile(null)
    }
  }

  const openResearchDialog = (researchTitle?: ResearchTitle) => {
    if (researchTitle) {
      setSelectedResearch(researchTitle)
      setResearchDraft(toResearchTitlePayload(researchTitle))
    } else {
      setSelectedResearch(null)
      setResearchDraft(emptyResearchTitlePayload)
    }

    setResearchPaperFile(null)
    setIsResearchOpen(true)
  }

  const handleSaveEducation = async () => {
    setIsSavingContent(true)

    try {
      const education = await AdminService.saveFacultyEducation(facultyId, educationDraft)
      patchDetail((current) => ({
        ...current,
        education: upsertById(current.education, education),
      }))
      setIsEducationOpen(false)
      toast.success(selectedEducation ? "Education updated." : "Education added.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save education.")
    } finally {
      setIsSavingContent(false)
    }
  }

  const handleSavePublication = async () => {
    const normalizedPublicationDraft = normalizePublicationPayload(publicationDraft)
    const validationError = getPublicationValidationError(normalizedPublicationDraft, {
      hasProof: Boolean(publicationProofFile || selectedPublication?.proof_path),
    })

    if (validationError) {
      toast.error(validationError)
      return
    }

    setIsSavingContent(true)

    try {
      const publication = await AdminService.saveFacultyPublication(
        facultyId,
        normalizedPublicationDraft,
        publicationProofFile
      )
      patchDetail((current) => ({
        ...current,
        publications: upsertById(current.publications, publication),
      }))
      setIsPublicationOpen(false)
      setPublicationProofFile(null)
      toast.success(selectedPublication ? "Publication updated." : "Publication added.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save publication.")
    } finally {
      setIsSavingContent(false)
    }
  }

  const handleSaveEngagement = async () => {
    setIsSavingContent(true)

    try {
      const engagement = await AdminService.saveFacultyEngagement(
        facultyId,
        normalizeEngagementPayload(engagementDraft),
        engagementCertificateFile
      )
      patchDetail((current) => ({
        ...current,
        engagements: upsertById(current.engagements, engagement),
      }))
      handleEngagementDialogChange(false)
      toast.success(selectedEngagement ? "Engagement updated." : "Engagement added.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save engagement.")
    } finally {
      setIsSavingContent(false)
    }
  }

  const handleSaveResearch = async () => {
    setIsSavingContent(true)

    try {
      const researchTitle = await AdminService.saveFacultyResearch(
        facultyId,
        researchDraft,
        researchPaperFile
      )
      patchDetail((current) => ({
        ...current,
        researchTitles: upsertById(current.researchTitles, researchTitle),
      }))
      setIsResearchOpen(false)
      setResearchPaperFile(null)
      toast.success(selectedResearch ? "Research updated." : "Research added.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save research.")
    } finally {
      setIsSavingContent(false)
    }
  }

  const handleDeleteContent = async () => {
    if (!deleteTarget || !isMainAdmin) {
      return
    }

    setIsSavingContent(true)

    try {
      if (deleteTarget.kind === "publication" && deleteTarget.item.can_manage === false) {
        setDeleteTarget(null)
        toast.info("Shared publications can only be deleted from the faculty member who added them.")
        return
      }

      switch (deleteTarget.kind) {
        case "education":
          await AdminService.deleteFacultyEducation(facultyId, deleteTarget.item.id)
          patchDetail((current) => ({
            ...current,
            education: current.education.filter((item) => item.id !== deleteTarget.item.id),
          }))
          break
        case "publication":
          await AdminService.deleteFacultyPublication(facultyId, deleteTarget.item.id)
          patchDetail((current) => ({
            ...current,
            publications: current.publications.filter((item) => item.id !== deleteTarget.item.id),
          }))
          break
        case "engagement":
          await AdminService.deleteFacultyEngagement(facultyId, deleteTarget.item.id)
          patchDetail((current) => ({
            ...current,
            engagements: current.engagements.filter((item) => item.id !== deleteTarget.item.id),
          }))
          break
        case "research":
          await AdminService.deleteFacultyResearch(facultyId, deleteTarget.item.id)
          patchDetail((current) => ({
            ...current,
            researchTitles: current.researchTitles.filter((item) => item.id !== deleteTarget.item.id),
          }))
          break
      }

      setDeleteTarget(null)
      toast.success("Record deleted.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete record.")
    } finally {
      setIsSavingContent(false)
    }
  }

  const openPublicationProof = async (publication: Publication) => {
    try {
      const url =
        publication.proof_url ??
        await AdminService.getSignedAssetUrl({
          facultyId,
          kind: 'publication-proof',
          id: publication.id,
        })

      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open the publication proof.")
    }
  }

  const openEngagementCertificate = async (engagement: Engagement) => {
    try {
      const url =
        engagement.certificate_url ??
        await AdminService.getSignedAssetUrl({
          facultyId,
          kind: 'engagement-certificate',
          id: engagement.id,
        })

      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open the engagement certificate.")
    }
  }

  const openResearchPaper = async (researchTitle: ResearchTitle) => {
    try {
      const url =
        researchTitle.paper_url ??
        await AdminService.getSignedAssetUrl({
          facultyId,
          kind: 'research-paper',
          id: researchTitle.id,
        })

      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open the research paper.")
    }
  }

  if (!detail && detailQuery.isPending) {
    return <AdminFacultyDetailSkeleton />
  }

  if (!detail || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-muted-foreground">Faculty member not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/faculty")}>
          Back to Faculty List
        </Button>
      </div>
    )
  }

  const deleteCopy = getDeleteStateDescription(deleteTarget)

  return (
    <div className="space-y-6">
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Faculty Profile</DialogTitle>
            <DialogDescription>Update the core faculty profile fields used by both admin and faculty views.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="faculty-name">Name</Label>
              <Input
                id="faculty-name"
                value={draft.name ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Department</Label>
              <Select
                value={draft.department ?? "none"}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    department: value === "none" ? null : (value as ProfileUpdatePayload["department"]),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {DEPARTMENTS.map((department) => (
                    <SelectItem key={department.value} value={department.value}>
                      {department.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="faculty-specialization">Specialization</Label>
              <Input
                id="faculty-specialization"
                value={draft.specialization ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, specialization: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Employment Status</Label>
              <Select
                value={draft.employment_status ?? "none"}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    employment_status:
                      value === "none"
                        ? null
                        : (value as ProfileUpdatePayload["employment_status"]),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {EMPLOYMENT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSavingProfile}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSavingProfile}>
              {isSavingProfile ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEducationOpen} onOpenChange={setIsEducationOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedEducation ? "Edit Education" : "Add Education"}</DialogTitle>
            <DialogDescription>Maintain the faculty member&apos;s educational background from the admin workspace.</DialogDescription>
          </DialogHeader>
          <EducationFormFields value={educationDraft} onChange={setEducationDraft} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEducationOpen(false)} disabled={isSavingContent}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveEducation()} disabled={isSavingContent}>
              {isSavingContent ? <Spinner className="mr-2 h-4 w-4" /> : null}
              {selectedEducation ? "Update Education" : "Add Education"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPublicationOpen} onOpenChange={setIsPublicationOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPublication ? "Edit Publication" : "Add Publication"}</DialogTitle>
            <DialogDescription>Use the same publication form faculty members use in self-service, including proof upload.</DialogDescription>
          </DialogHeader>
          <PublicationFormFields
            key={selectedPublication?.id ?? 'new-publication'}
            formData={publicationDraft}
            setFormData={setPublicationDraft}
            proofFile={publicationProofFile}
            setProofFile={setPublicationProofFile}
            existingProofUrl={selectedPublication?.proof_url ?? null}
            hasExistingProof={Boolean(selectedPublication?.proof_path)}
            showDoiLookup={!selectedPublication}
            currentFacultyId={facultyId}
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
            <Button variant="outline" onClick={() => setIsPublicationOpen(false)} disabled={isSavingContent}>
              Cancel
            </Button>
            <Button onClick={() => void handleSavePublication()} disabled={isSavingContent}>
              {isSavingContent ? <Spinner className="mr-2 h-4 w-4" /> : null}
              {selectedPublication ? "Update Publication" : "Add Publication"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEngagementOpen} onOpenChange={handleEngagementDialogChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEngagement ? "Edit Engagement" : "Add Engagement"}</DialogTitle>
            <DialogDescription>Admin changes persist directly to the faculty profile and its storage-backed assets.</DialogDescription>
          </DialogHeader>
          <EngagementFormFields
            formData={engagementDraft}
            setFormData={setEngagementDraft}
            certificateFile={engagementCertificateFile}
            setCertificateFile={setEngagementCertificateFile}
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
            <Button variant="outline" onClick={() => handleEngagementDialogChange(false)} disabled={isSavingContent}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveEngagement()} disabled={isSavingContent}>
              {isSavingContent ? <Spinner className="mr-2 h-4 w-4" /> : null}
              {selectedEngagement ? "Update Engagement" : "Add Engagement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isResearchOpen} onOpenChange={setIsResearchOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedResearch ? "Edit Research Title" : "Add Research Title"}</DialogTitle>
            <DialogDescription>Maintain research metadata, progress, funding, and supporting papers.</DialogDescription>
          </DialogHeader>
          <ResearchFormFields
            formData={researchDraft}
            setFormData={setResearchDraft}
            paperFile={researchPaperFile}
            setPaperFile={setResearchPaperFile}
            existingPaperUrl={selectedResearch?.paper_url ?? null}
            onViewExistingPaper={
              selectedResearch?.paper_path
                ? () => {
                    void openResearchPaper(selectedResearch)
                  }
                : null
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResearchOpen(false)} disabled={isSavingContent}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveResearch()} disabled={isSavingContent}>
              {isSavingContent ? <Spinner className="mr-2 h-4 w-4" /> : null}
              {selectedResearch ? "Update Research" : "Add Research"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{deleteCopy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSavingContent}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteContent()}
              disabled={isSavingContent}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSavingContent ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push("/admin/faculty")}>
        <ArrowLeft className="h-4 w-4" />
        Back to Faculty List
      </Button>

      <div className="motion-fade-up">
        <Card className="border-border/50 overflow-hidden gap-0 py-0">
          <CardContent className="p-0">
            <div className="relative h-48 overflow-hidden bg-[#0a6a34]">
              <Image
                src="/images/faculty-banner.png"
                alt="Faculty banner"
                fill
                priority
                sizes="(min-width: 1024px) calc(100vw - 16rem), 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            <div className="px-6 pb-6 pt-6">
              <div className="flex flex-col gap-6 sm:flex-row">
                <Avatar className="-mt-16 h-24 w-24 shrink-0 self-start border-4 border-background shadow-lg">
                  <AvatarImage src={detail.profile.photo_url ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-medium">
                    {detail.profile.name.split(" ").map((name) => name[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-semibold tracking-tight">{detail.profile.name}</h1>
                        <Badge
                          className={`text-xs ${
                            detail.access_status === "active"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          }`}
                        >
                          {detail.access_status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {detail.profile.department
                            ? DEPARTMENTS.find((department) => department.value === detail.profile.department)?.label ??
                              detail.profile.department
                            : "No department set"}
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {detail.profile.email}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {detail.roles.map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {role === "main-admin"
                              ? "Main Admin"
                              : role === "secondary-admin"
                                ? "Secondary Admin"
                                : "Faculty"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4 sm:w-72 sm:shrink-0">
                      <div className="flex gap-2 sm:justify-end">
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => void AdminService.downloadExport("faculty")}
                        >
                          <Download className="h-4 w-4" />
                          Export
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit Profile
                            </DropdownMenuItem>
                            {isMainAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => void handleAccessChange()}>
                                  {detail.access_status === "active" ? (
                                    <>
                                      <UserX className="h-4 w-4 mr-2" />
                                      Deactivate Access
                                    </>
                                  ) : (
                                    <>
                                      <RotateCcw className="h-4 w-4 mr-2" />
                                      Reactivate Access
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="w-full">
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Profile completion</span>
                          <span className="font-medium">{detail.completion.score}%</span>
                        </div>
                        <Progress value={detail.completion.score} className="h-2" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Publications", value: stats.publications, icon: BookOpen },
          { label: "Indexed", value: stats.indexed, icon: Award },
          { label: "Engagements", value: stats.engagements, icon: Briefcase },
          { label: "Research", value: stats.research, icon: FileText },
          { label: "Ongoing", value: stats.ongoingResearch, icon: Clock },
        ].map((stat, index) => (
          <div
            key={stat.label}
            className="motion-fade-up"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <stat.icon className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
                <p className="text-2xl font-semibold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <Tabs defaultValue="publications" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="publications" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Publications
          </TabsTrigger>
          <TabsTrigger value="engagements" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Engagements
          </TabsTrigger>
          <TabsTrigger value="research" className="gap-2">
            <FileText className="h-4 w-4" />
            Research
          </TabsTrigger>
          <TabsTrigger value="education" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Education
          </TabsTrigger>
        </TabsList>

        <TabsContent value="publications">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">Publications</CardTitle>
                <CardDescription>{detail.publications.length} total publications</CardDescription>
              </div>
              <Button size="sm" className="gap-2" onClick={() => openPublicationDialog()}>
                <Plus className="h-4 w-4" />
                Add Publication
              </Button>
            </CardHeader>
            <CardContent>
              {detail.publications.length === 0 ? (
                <EmptyState icon={BookOpen} title="No publications" description="This faculty member has no publications yet" />
              ) : (
                <div className="space-y-4">
                  {detail.publications.map((publication) => {
                    const canManagePublication = publication.can_manage !== false

                    return (
                      <div key={publication.id} className="rounded-lg border border-border/50 p-4 transition-colors hover:border-primary/20">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium line-clamp-2">{publication.title}</h4>
                            <p className="mt-1 text-sm text-muted-foreground">{publication.venue}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {getPublicationTypeLabel(publication.type)}
                              </Badge>
                              <Badge variant="outline" className="text-xs">{publication.year}</Badge>
                              <Badge variant="outline" className="text-xs">
                                {getPublicationStatusLabel(publication.status)}
                              </Badge>
                              {publication.is_shared ? (
                                <Badge variant="secondary" className="text-xs">
                                  Shared by {publication.owner_name ?? "faculty owner"}
                                </Badge>
                              ) : null}
                              <Badge className="text-xs bg-accent/20 text-accent-foreground">
                                {getPublicationIndexingStatus(publication.indexing)}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {publication.author_count} {publication.author_count === 1 ? "author" : "authors"}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {getPublicationFacultyRoleLabel(publication.faculty_role)}
                              </Badge>
                              {publication.quartile_ranking ? (
                                <Badge variant="outline" className="text-xs">
                                  {getPublicationQuartileLabel(publication.quartile_ranking)}
                                </Badge>
                              ) : null}
                              {publication.proof_path ? (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Paperclip className="h-3 w-3" />
                                  Proof
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">
                              {publication.volume || publication.issue || publication.page_numbers
                                ? `Vol. ${publication.volume || '-'} | Issue ${publication.issue || '-'} | Pages ${publication.page_numbers || '-'}`
                                : 'Volume, issue, and page numbers not set'}
                            </p>
                            {(publication.co_authors ?? []).length > 0 ? (
                              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                Linked co-authors: {(publication.co_authors ?? [])
                                  .map((coAuthor) => `${coAuthor.name} (${getPublicationFacultyRoleLabel(coAuthor.faculty_role)})`)
                                  .join(", ")}
                              </p>
                            ) : null}
                            {publication.sdgGoals.length > 0 ? (
                              <div className="mt-3">
                                <SDGBadgeGroup goals={publication.sdgGoals} size="sm" />
                              </div>
                            ) : null}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canManagePublication ? (
                                <DropdownMenuItem onClick={() => openPublicationDialog(publication)}>
                                  <Edit2 className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              ) : null}
                              {getPublicationLink(publication) ? (
                                <DropdownMenuItem asChild>
                                  <a href={getPublicationLink(publication)?.href ?? "#"} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    {getPublicationLink(publication)?.label}
                                  </a>
                                </DropdownMenuItem>
                              ) : null}
                              {publication.proof_path ? (
                                <DropdownMenuItem onClick={() => void openPublicationProof(publication)}>
                                  <Paperclip className="mr-2 h-4 w-4" />
                                  View Proof
                                </DropdownMenuItem>
                              ) : null}
                              {isMainAdmin && canManagePublication ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => setDeleteTarget({ kind: "publication", item: publication })}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagements">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">Engagements</CardTitle>
                <CardDescription>{detail.engagements.length} total engagements</CardDescription>
              </div>
              <Button size="sm" className="gap-2" onClick={() => openEngagementDialog()}>
                <Plus className="h-4 w-4" />
                Add Engagement
              </Button>
            </CardHeader>
            <CardContent>
              {detail.engagements.length === 0 ? (
                <EmptyState icon={Briefcase} title="No engagements" description="This faculty member has no engagements yet" />
              ) : (
                <div className="space-y-4">
                  {detail.engagements.map((engagement) => (
                    <div key={engagement.id} className="rounded-lg border border-border/50 p-4 transition-colors hover:border-primary/20">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-medium">{engagement.title}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {ENGAGEMENT_TYPES.find((type) => type.value === engagement.type)?.label ?? engagement.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getEngagementStatusLabel(engagement.status)}
                            </Badge>
                            {hasEngagementCertificate(engagement) ? (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Paperclip className="h-3 w-3" />
                                Certificate
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{engagement.organization}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{engagement.startDate}</span>
                            {engagement.endDate ? <span>- {engagement.endDate}</span> : null}
                            {engagement.beneficiaries > 0 ? (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Users className="h-3 w-3" />
                                {engagement.beneficiaries} beneficiaries
                              </Badge>
                            ) : null}
                          </div>
                          {engagement.description ? (
                            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{engagement.description}</p>
                          ) : null}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEngagementDialog(engagement)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
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
                                  onClick={() => setDeleteTarget({ kind: "engagement", item: engagement })}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="research">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">Research Titles</CardTitle>
                <CardDescription>{detail.researchTitles.length} total research projects</CardDescription>
              </div>
              <Button size="sm" className="gap-2" onClick={() => openResearchDialog()}>
                <Plus className="h-4 w-4" />
                Add Research
              </Button>
            </CardHeader>
            <CardContent>
              {detail.researchTitles.length === 0 ? (
                <EmptyState icon={FileText} title="No research projects" description="This faculty member has no research projects yet" />
              ) : (
                <div className="space-y-4">
                  {detail.researchTitles.map((researchTitle) => (
                    <div key={researchTitle.id} className="rounded-lg border border-border/50 p-4 transition-colors hover:border-primary/20">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-medium line-clamp-2">{researchTitle.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {RESEARCH_STATUS.find((status) => status.value === researchTitle.status)?.label ?? researchTitle.status}
                            </Badge>
                            {researchTitle.paper_path ? (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Paperclip className="h-3 w-3" />
                                Paper
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {(researchTitle.researchers ?? []).join(", ")}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {researchTitle.startDate ? <span>{researchTitle.startDate}</span> : null}
                            {researchTitle.endDate ? <span>- {researchTitle.endDate}</span> : null}
                            {researchTitle.fundingSource ? (
                              <Badge variant="outline" className="text-xs gap-1">
                                <DollarSign className="h-3 w-3" />
                                {researchTitle.fundingSource}
                              </Badge>
                            ) : null}
                            {researchTitle.fundingAmount && researchTitle.fundingAmount > 0 ? (
                              <Badge variant="outline" className="text-xs">
                                {formatCurrency(researchTitle.fundingAmount)}
                              </Badge>
                            ) : null}
                          </div>
                          {typeof researchTitle.progress === "number" && researchTitle.status === "ongoing" ? (
                            <div className="mt-3 max-w-xs">
                              <div className="mb-1 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium">{researchTitle.progress}%</span>
                              </div>
                              <Progress value={researchTitle.progress} className="h-2" />
                            </div>
                          ) : null}
                          {researchTitle.sdgGoals && researchTitle.sdgGoals.length > 0 ? (
                            <div className="mt-3">
                              <SDGBadgeGroup goals={researchTitle.sdgGoals} size="sm" />
                            </div>
                          ) : null}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openResearchDialog(researchTitle)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
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
                                  onClick={() => setDeleteTarget({ kind: "research", item: researchTitle })}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="education">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">Educational Background</CardTitle>
                <CardDescription>{detail.education.length} degrees</CardDescription>
              </div>
              <Button size="sm" className="gap-2" onClick={() => openEducationDialog()}>
                <Plus className="h-4 w-4" />
                Add Education
              </Button>
            </CardHeader>
            <CardContent>
              {detail.education.length === 0 ? (
                <EmptyState icon={GraduationCap} title="No education records" description="No educational background recorded" />
              ) : (
                <div className="space-y-4">
                  {detail.education.map((education) => (
                    <div key={education.id} className="flex gap-4 rounded-lg border border-border/50 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium">{education.degree}</h4>
                        <p className="text-sm text-muted-foreground">{education.field}</p>
                        <p className="text-sm text-muted-foreground">{education.institution}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{education.year}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEducationDialog(education)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {isMainAdmin ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteTarget({ kind: "education", item: education })}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
