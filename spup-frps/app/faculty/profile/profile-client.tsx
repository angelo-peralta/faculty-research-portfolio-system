'use client'

import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useFacultyBootstrapQuery } from '@/lib/query/faculty'
import { ProfileService } from '@/lib/services/profile-service'
import { TopHeader } from '@/components/layout/top-header'
import { SDGBadgeGroup } from '@/components/shared/sdg-badge-group'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import {
  Edit,
  Mail,
  Building2,
  Briefcase,
  GraduationCap,
  BookOpen,
  FlaskConical,
  Clock,
  Save,
  X,
  ArrowRight,
  ExternalLink,
  Calendar,
  Users,
  Paperclip,
} from 'lucide-react'
import { toast } from 'sonner'
import { emptyEducationPayload, toEducationPayload } from '@/lib/faculty-content'
import { getEngagementStatusLabel, hasEngagementCertificate } from '@/lib/engagement-utils'
import {
  DEPARTMENTS,
  EMPLOYMENT_STATUSES,
  ENGAGEMENT_TYPES,
  RESEARCH_STATUS,
} from '@/lib/constants'
import {
  getPublicationFacultyRoleLabel,
  getPublicationIndexingStatus,
  getPublicationLink,
  getPublicationQuartileLabel,
  getPublicationStatusLabel,
  getPublicationTypeLabel,
} from '@/lib/publication-utils'
import {
  formatStoredDate,
  formatStoredYear,
  isIncompleteEducationEntry,
  isIncompleteEngagement,
  isIncompletePublication,
  isIncompleteResearchTitle,
} from '@/lib/record-completeness'
import type {
  FacultyBootstrapData,
  Profile,
  ProfileUpdatePayload,
  Department,
  EmploymentStatus,
  EducationEntry,
  Publication,
  Engagement,
  ResearchTitle,
  EducationPayload,
} from '@/lib/types'

const ProfileCompletionDialog = dynamic(
  () =>
    import('@/components/faculty/profile-completion-dialog').then(
      (mod) => mod.ProfileCompletionDialog
    ),
  { ssr: false }
)

function getEmploymentStatusLabel(value: EmploymentStatus | null | undefined) {
  return EMPLOYMENT_STATUSES.find((status) => status.value === value)?.label ?? 'Not set'
}

function getEngagementTypeLabel(value: Engagement['type']) {
  return ENGAGEMENT_TYPES.find((type) => type.value === value)?.label ?? value
}

function getResearchStatusLabel(value: ResearchTitle['status']) {
  const normalizedStatus = value === 'on-going' ? 'ongoing' : value === 'proposal' ? 'proposed' : value
  return RESEARCH_STATUS.find((status) => status.value === normalizedStatus)?.label ?? value
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Never'

  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateOnly(dateStr: string | undefined) {
  if (!dateStr || formatStoredDate(dateStr) === 'Not set') {
    return 'Not set'
  }

  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getPublicationHref(publication: Publication) {
  return getPublicationLink(publication)?.href ?? null
}

function formatCurrency(value: number | undefined) {
  if (!value) {
    return null
  }

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value)
}

interface PortfolioSectionProps {
  title: string
  count: number
  href: string
  emptyLabel: string
  icon: typeof GraduationCap
  children: React.ReactNode
}

function PortfolioSection({
  title,
  count,
  href,
  emptyLabel,
  icon: Icon,
  children,
}: PortfolioSectionProps) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">
                {count} {count === 1 ? 'record' : 'records'}
              </p>
            </div>
          </div>
          <Link href={href}>
            <Button variant="outline" size="sm" className="gap-2">
              Manage
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {count === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          <div className="space-y-3">{children}</div>
        )}
      </CardContent>
    </Card>
  )
}

function hasCompleteEducation(entries: EducationEntry[]) {
  return entries.some((entry) => !isIncompleteEducationEntry(entry))
}

function getCompletionEducationDraft(entries: EducationEntry[]) {
  const incompleteEntry = entries.find((entry) => isIncompleteEducationEntry(entry))
  return incompleteEntry ? toEducationPayload(incompleteEntry) : emptyEducationPayload
}

function needsProfileCompletion(args: {
  profile: Profile | null
  educationEntries: EducationEntry[]
}) {
  return Boolean(
    args.profile &&
    (!args.profile.department || !args.profile.employment_status || !hasCompleteEducation(args.educationEntries))
  )
}

interface FacultyProfileClientProps {
  initialBootstrap?: FacultyBootstrapData | null
}

export default function FacultyProfileClient({
  initialBootstrap = null,
}: FacultyProfileClientProps) {
  const { user } = useAuth()
  const bootstrapQuery = useFacultyBootstrapQuery(Boolean(user?.id), initialBootstrap ?? undefined)
  const [profile, setProfile] = useState<Profile | null>(initialBootstrap?.profile ?? null)
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>(
    initialBootstrap?.education ?? []
  )
  const [publications, setPublications] = useState<Publication[]>(
    initialBootstrap?.publications ?? []
  )
  const [engagements, setEngagements] = useState<Engagement[]>(
    initialBootstrap?.engagements ?? []
  )
  const [researchTitles, setResearchTitles] = useState<ResearchTitle[]>(
    initialBootstrap?.researchTitles ?? []
  )
  const [isLoading, setIsLoading] = useState(!initialBootstrap)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCompletingProfile, setIsCompletingProfile] = useState(false)
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false)

  const [formData, setFormData] = useState<ProfileUpdatePayload>({
    name: initialBootstrap?.profile.name ?? '',
    department: initialBootstrap?.profile.department ?? ('SITE' as Department),
    specialization: initialBootstrap?.profile.specialization ?? '',
    employment_status: initialBootstrap?.profile.employment_status ?? ('full-time' as EmploymentStatus),
  })
  const [completionData, setCompletionData] = useState<{
    department: Department | null
    employment_status: EmploymentStatus | null
    highestEducation: EducationPayload
  }>({
    department: initialBootstrap?.profile.department ?? null,
    employment_status: initialBootstrap?.profile.employment_status ?? null,
    highestEducation: getCompletionEducationDraft(initialBootstrap?.education ?? []),
  })

  const applyBootstrapData = (data: FacultyBootstrapData) => {
    setProfile(data.profile)
    setEducationEntries(data.education)
    setPublications(data.publications)
    setEngagements(data.engagements)
    setResearchTitles(data.researchTitles)
    setFormData({
      name: data.profile.name,
      department: data.profile.department ?? ('SITE' as Department),
      specialization: data.profile.specialization ?? '',
      employment_status: data.profile.employment_status ?? ('full-time' as EmploymentStatus),
    })
    setCompletionData({
      department: data.profile.department,
      employment_status: data.profile.employment_status,
      highestEducation: getCompletionEducationDraft(data.education),
    })
  }

  useEffect(() => {
    if (bootstrapQuery.data) {
      applyBootstrapData(bootstrapQuery.data)
      setIsLoading(false)
      return
    }

    if (bootstrapQuery.isError) {
      console.error('Failed to load profile:', bootstrapQuery.error)
      toast.error('Failed to load profile')
      setIsLoading(false)
    }
  }, [bootstrapQuery.data, bootstrapQuery.error, bootstrapQuery.isError])

  useEffect(() => {
    if (isLoading) {
      return
    }

    setIsCompletionDialogOpen(needsProfileCompletion({ profile, educationEntries }))
  }, [educationEntries, isLoading, profile])

  const handleCompletionSave = async () => {
    if (!user) {
      return
    }

    if (!completionData.department || !completionData.employment_status) {
      toast.error('Department and employment status are required.')
      return
    }

    const requiresEducation = !hasCompleteEducation(educationEntries)

    if (
      requiresEducation &&
      (
        !completionData.highestEducation.degree.trim() ||
        !completionData.highestEducation.field.trim() ||
        !completionData.highestEducation.institution.trim()
      )
    ) {
      toast.error('Please complete your highest educational attainment.')
      return
    }

    setIsCompletingProfile(true)

    try {
      const tasks: Array<Promise<Profile | EducationEntry>> = [
        ProfileService.updateMyProfile({
          department: completionData.department,
          employment_status: completionData.employment_status,
        }),
      ]

      if (requiresEducation) {
        tasks.push(ProfileService.upsertEducation(completionData.highestEducation))
      }

      const results = await Promise.all(tasks)
      const updatedProfile = results[0] as Profile
      const completedEducation = requiresEducation ? (results[1] as EducationEntry) : null

      setProfile(updatedProfile)
      setFormData((current) => ({
        ...current,
        department: updatedProfile.department ?? ('SITE' as Department),
        employment_status: updatedProfile.employment_status ?? ('full-time' as EmploymentStatus),
      }))

      if (completedEducation) {
        setEducationEntries((current) => {
          const exists = current.some((entry) => entry.id === completedEducation.id)

          if (exists) {
            return current.map((entry) => (entry.id === completedEducation.id ? completedEducation : entry))
          }

          return [completedEducation, ...current]
        })
      }

      setIsCompletionDialogOpen(false)
      toast.success('Profile completed successfully.')
    } catch (error) {
      console.error('Failed to complete profile:', error)
      toast.error('Failed to complete your profile.')
    } finally {
      setIsCompletingProfile(false)
    }
  }

  const openEngagementCertificate = async (engagementId: string) => {
    try {
      const url = await ProfileService.getSignedAssetUrl('engagement-certificate', engagementId)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to open the engagement certificate.')
    }
  }

  const openResearchPaper = async (researchId: string) => {
    try {
      const url = await ProfileService.getSignedAssetUrl('research-paper', researchId)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to open the research paper.')
    }
  }

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      const updated = await ProfileService.updateMyProfile(formData)
      if (updated) {
        setProfile(updated)
        setCompletionData((current) => ({
          ...current,
          department: updated.department,
          employment_status: updated.employment_status,
        }))
        setIsEditing(false)
        toast.success('Profile updated successfully')
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name,
        department: profile.department ?? ('SITE' as Department),
        specialization: profile.specialization ?? '',
        employment_status: profile.employment_status ?? ('full-time' as EmploymentStatus),
      })
    }
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <TopHeader title="My Profile" subtitle="Manage your faculty profile" />
        <div className="p-6 space-y-6">
          <Card>
            <CardContent className="p-0">
              <Skeleton className="h-48 w-full rounded-t-xl" />
              <div className="p-6 space-y-4">
                <div className="flex items-end gap-4 -mt-16">
                  <Skeleton className="w-24 h-24 rounded-full border-4 border-background" />
                  <div className="space-y-2 pb-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4 pt-4">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <TopHeader title="My Profile" subtitle="Manage your faculty profile" />

      <div className="p-6 space-y-6">
        {/* Profile Card */}
        <Card className="overflow-hidden gap-0 py-0">
          <CardContent className="p-0">
            {/* Banner */}
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

            {/* Profile Info */}
            <div className="space-y-6 px-6 pb-6">
              {/* Avatar & Name */}
              <div className="-mt-12 flex justify-center">
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                  <AvatarImage
                    src={profile?.photo_url || user?.avatar_url || undefined}
                    alt={profile?.name}
                  />
                  <AvatarFallback className="text-2xl gradient-primary text-white">
                    {profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3 text-center sm:text-left">
                  <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <h2 className="text-2xl font-bold text-foreground">{profile?.name}</h2>
                    <Badge variant="secondary" className="text-xs">
                      {getEmploymentStatusLabel(profile?.employment_status)}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{profile?.specialization || 'No specialization set'}</p>
                </div>
                <Button onClick={() => setIsEditing(true)} className="gradient-primary shrink-0 self-center sm:self-start">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>

              {/* Info Grid */}
              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email Address</p>
                    <p className="font-medium text-foreground">{profile?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="font-medium text-foreground">{profile?.department ?? 'Not set'}</p>
                </div>
              </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Employment Status</p>
                    <p className="font-medium text-foreground">
                      {getEmploymentStatusLabel(profile?.employment_status)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="font-medium text-foreground text-sm">
                      {formatDate(profile?.updated_at || null)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <PortfolioSection
          title="Education"
          count={educationEntries.length}
          href="/faculty/education"
          emptyLabel="No education entries yet. Add your educational background from the Education page."
          icon={GraduationCap}
        >
          {educationEntries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-border/60 bg-muted/20 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-foreground">{entry.degree || 'Untitled education record'}</h4>
                    {isIncompleteEducationEntry(entry) ? (
                      <Badge variant="outline">Needs completion</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.field || 'Field not set'}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{entry.institution || 'Institution not set'}</span>
                  </div>
                </div>
                <Badge variant="outline" className="w-fit">
                  {formatStoredYear(entry.year)}
                </Badge>
              </div>
            </div>
          ))}
        </PortfolioSection>

        <PortfolioSection
          title="Publications"
          count={publications.length}
          href="/faculty/publications"
          emptyLabel="No publications yet. Add your publication record from the Publications page."
          icon={BookOpen}
        >
          {publications.map((publication) => {
            const publicationHref = getPublicationHref(publication)

            return (
              <div
                key={publication.id}
                className="rounded-xl border border-border/60 bg-muted/20 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-foreground">{publication.title || 'Untitled publication'}</h4>
                        {isIncompletePublication(publication) ? (
                          <Badge variant="outline">Needs completion</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {publication.venue || 'Venue not set'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{getPublicationTypeLabel(publication.type)}</Badge>
                      <Badge variant="outline">{formatStoredYear(publication.year)}</Badge>
                      <Badge variant="outline">{getPublicationStatusLabel(publication.status)}</Badge>
                      <Badge className="bg-accent/20 text-accent-foreground hover:bg-accent/30">
                        {getPublicationIndexingStatus(publication.indexing)}
                      </Badge>
                      <Badge variant="outline">{publication.author_count} {publication.author_count === 1 ? 'author' : 'authors'}</Badge>
                      <Badge variant="outline">{getPublicationFacultyRoleLabel(publication.faculty_role)}</Badge>
                      {publication.quartile_ranking ? (
                        <Badge variant="outline">{getPublicationQuartileLabel(publication.quartile_ranking)}</Badge>
                      ) : null}
                    </div>

                    <p className="text-sm text-muted-foreground italic">
                      {publication.volume || publication.issue || publication.page_numbers
                        ? `Vol. ${publication.volume || '-'} | Issue ${publication.issue || '-'} | Pages ${publication.page_numbers || '-'}`
                        : 'Volume, issue, and page numbers not set'}
                    </p>

                    {(publication.sdgGoals ?? []).length > 0 ? (
                      <SDGBadgeGroup goals={publication.sdgGoals} />
                    ) : null}
                  </div>

                  {publicationHref ? (
                    <a
                      href={publicationHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <Button variant="outline" size="sm" className="gap-2">
                        Open
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  ) : null}
                </div>
              </div>
            )
          })}
        </PortfolioSection>

        <PortfolioSection
          title="Engagements"
          count={engagements.length}
          href="/faculty/engagements"
          emptyLabel="No engagements yet. Add your extension and engagement work from the Engagements page."
          icon={Users}
        >
          {engagements.map((engagement) => (
            <div
              key={engagement.id}
              className="rounded-xl border border-border/60 bg-muted/20 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-foreground">{engagement.title || 'Untitled engagement'}</h4>
                      {isIncompleteEngagement(engagement) ? (
                        <Badge variant="outline">Needs completion</Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{engagement.organization || 'Organization not set'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{getEngagementTypeLabel(engagement.type)}</Badge>
                    <Badge variant="outline">{getEngagementStatusLabel(engagement.status)}</Badge>
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateOnly(engagement.startDate)}
                      {engagement.endDate ? ` - ${formatDateOnly(engagement.endDate)}` : ''}
                    </Badge>
                    {hasEngagementCertificate(engagement) ? (
                      <Badge variant="outline" className="gap-1">
                        <Paperclip className="h-3 w-3" />
                        Certificate
                      </Badge>
                    ) : null}
                  </div>

                  {engagement.description ? (
                    <p className="text-sm text-muted-foreground">{engagement.description}</p>
                  ) : null}
                </div>

                {engagement.certificate_path ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-2"
                    onClick={() => void openEngagementCertificate(engagement.id)}
                  >
                    View File
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </PortfolioSection>

        <PortfolioSection
          title="Researches"
          count={researchTitles.length}
          href="/faculty/research"
          emptyLabel="No research records yet. Add your research pipeline from the Researches page."
          icon={FlaskConical}
        >
          {researchTitles.map((researchTitle) => {
            const fundingAmount = formatCurrency(researchTitle.fundingAmount)

            return (
              <div
                key={researchTitle.id}
                className="rounded-xl border border-border/60 bg-muted/20 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-foreground">{researchTitle.title || 'Untitled research'}</h4>
                        {isIncompleteResearchTitle(researchTitle) ? (
                          <Badge variant="outline">Needs completion</Badge>
                        ) : null}
                      </div>
                      {(researchTitle.researchers ?? []).length > 0 ? (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Users className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{researchTitle.researchers?.join(', ')}</span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Users className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>Researchers not set</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{getResearchStatusLabel(researchTitle.status)}</Badge>
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateOnly(researchTitle.startDate)}
                        {researchTitle.endDate ? ` - ${formatDateOnly(researchTitle.endDate)}` : ''}
                      </Badge>
                      {researchTitle.paper_path ? (
                        <Badge variant="outline" className="gap-1">
                          <Paperclip className="h-3 w-3" />
                          Paper
                        </Badge>
                      ) : null}
                    </div>

                    {researchTitle.fundingSource || fundingAmount ? (
                      <p className="text-sm text-muted-foreground">
                        Funding:
                        {' '}
                        {researchTitle.fundingSource || 'Not specified'}
                        {fundingAmount ? ` (${fundingAmount})` : ''}
                      </p>
                    ) : null}

                    {typeof researchTitle.progress === 'number' ? (
                      <p className="text-sm text-muted-foreground">
                        Progress: {researchTitle.progress}%
                      </p>
                    ) : null}

                    {researchTitle.description ? (
                      <p className="text-sm text-muted-foreground">{researchTitle.description}</p>
                    ) : null}

                    {(researchTitle.sdgGoals ?? []).length > 0 ? (
                      <SDGBadgeGroup goals={researchTitle.sdgGoals} />
                    ) : null}
                  </div>

                  {researchTitle.paper_path ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-2"
                      onClick={() => void openResearchPaper(researchTitle.id)}
                    >
                      View File
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </PortfolioSection>

        {isCompletionDialogOpen ? (
          <ProfileCompletionDialog
            open={isCompletionDialogOpen}
            educationRequired={!hasCompleteEducation(educationEntries)}
            isSaving={isCompletingProfile}
            value={completionData}
            onChange={setCompletionData}
            onSubmit={handleCompletionSave}
          />
        ) : null}

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>
                Update your faculty profile information. Changes will be visible to administrators.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name ?? ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.department ?? undefined}
                  onValueChange={(value) => setFormData({ ...formData, department: value as Department })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  value={formData.specialization ?? ''}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="e.g., Artificial Intelligence, Data Science"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employment_status">Employment Status</Label>
                <Select
                  value={formData.employment_status ?? undefined}
                  onValueChange={(value) => setFormData({ ...formData, employment_status: value as EmploymentStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
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
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="gradient-primary">
                {isSaving ? (
                  <>
                    <Spinner className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
