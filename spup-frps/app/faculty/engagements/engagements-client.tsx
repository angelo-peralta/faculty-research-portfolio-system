'use client'

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Filter,
  Briefcase,
  Globe,
  Award,
  Building2,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  Paperclip,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useFacultyEngagementsQuery } from '@/lib/query/faculty'
import { queryKeys } from '@/lib/query/query-keys'
import { EngagementFormFields } from '@/components/faculty/forms/engagement-form-fields'
import { TopHeader } from '@/components/layout/top-header'
import { ProfileService } from '@/lib/services/profile-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/shared/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { ENGAGEMENT_TYPES } from '@/lib/constants'
import { emptyEngagementPayload, toEngagementPayload } from '@/lib/faculty-content'
import {
  getEngagementStatusLabel,
  hasEngagementCertificate,
  normalizeEngagementPayload,
} from '@/lib/engagement-utils'
import { formatStoredDate, isIncompleteEngagement } from '@/lib/record-completeness'
import type { Engagement, EngagementPayload, EngagementType } from '@/lib/types'
import { toast } from 'sonner'

const engagementIcons: Record<
  Exclude<EngagementType, 'conference' | 'seminar' | 'paper-presentation' | 'workshop' | 'symposium'>,
  typeof Briefcase
> = {
  consulting: Briefcase,
  training: Globe,
  community_service: Briefcase,
  industry_partnership: Building2,
  policy_advisory: Award,
  other: Briefcase,
}

export default function EngagementsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const engagementsQuery = useFacultyEngagementsQuery(Boolean(user?.id))
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | null>(null)
  const [formData, setFormData] = useState<EngagementPayload>(emptyEngagementPayload)
  const [certificateFile, setCertificateFile] = useState<File | null>(null)
  const engagements = useMemo(() => engagementsQuery.data ?? [], [engagementsQuery.data])
  const isLoading = engagementsQuery.isLoading && !engagementsQuery.data

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

  const filteredEngagements = useMemo(() => {
    return engagements.filter((engagement) => {
      const matchesSearch =
        engagement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        engagement.organization.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = selectedType === 'all' || engagement.type === selectedType
      const matchesStatus = selectedStatus === 'all' || engagement.status === selectedStatus

      return matchesSearch && matchesType && matchesStatus
    })
  }, [engagements, searchQuery, selectedType, selectedStatus])

  const stats = useMemo(
    () => ({
      total: engagements.length,
      active: engagements.filter((engagement) => engagement.status === 'ongoing').length,
      completed: engagements.filter((engagement) => engagement.status === 'completed').length,
      partners: new Set(engagements.map((engagement) => engagement.organization)).size,
    }),
    [engagements]
  )

  const handleOpenForm = (engagement?: Engagement) => {
    if (engagement) {
      setSelectedEngagement(engagement)
      setFormData(toEngagementPayload(engagement))
    } else {
      setSelectedEngagement(null)
      setFormData(emptyEngagementPayload)
    }

    setCertificateFile(null)
    setIsFormOpen(true)
  }

  const handleSave = async () => {
    if (!user) return
    const normalizedPayload = normalizeEngagementPayload(formData)

    if (!normalizedPayload.title || !normalizedPayload.organization || !normalizedPayload.startDate) {
      toast.error('Title, organization, and start date are required')
      return
    }

    setIsSaving(true)

    try {
      const nextEngagement = await ProfileService.upsertEngagement(normalizedPayload, certificateFile)
      queryClient.setQueryData<Engagement[]>(queryKeys.faculty.engagements(), (current = []) => {
        const exists = current.some((engagement) => engagement.id === nextEngagement.id)

        if (exists) {
          return current.map((engagement) =>
            engagement.id === nextEngagement.id ? nextEngagement : engagement
          )
        }

        return [nextEngagement, ...current]
      })
      handleFormOpenChange(false)
      toast.success(selectedEngagement ? 'Engagement updated' : 'Engagement added')
    } catch (error) {
      console.error('Failed to save engagement:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save engagement')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !selectedEngagement) return

    setIsDeleting(true)

    try {
      const deleted = await ProfileService.deleteEngagement(selectedEngagement.id)

      if (!deleted) {
        throw new Error('Engagement not found or already removed.')
      }

      queryClient.setQueryData<Engagement[]>(
        queryKeys.faculty.engagements(),
        (current = []) => current.filter((engagement) => engagement.id !== selectedEngagement.id)
      )
      resetFormState()
      setSelectedEngagement(null)
      setIsDeleteOpen(false)
      toast.success('Engagement deleted')
    } catch (error) {
      console.error('Failed to delete engagement:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete engagement')
    } finally {
      setIsDeleting(false)
    }
  }

  const openEngagementCertificate = async (engagement: Engagement) => {
    try {
      const url =
        engagement.certificate_url ??
        await ProfileService.getSignedAssetUrl('engagement-certificate', engagement.id)

      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to open the engagement certificate.')
    }
  }

  return (
    <div className="min-h-screen">
      <TopHeader
        title="Engagements"
        subtitle="Track your outreach work, partnerships, and related documentation."
      />

      <div className="space-y-6 p-6">
        <div className="flex justify-end">
          <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => handleOpenForm()}>
                <Plus className="h-4 w-4" />
                Add Engagement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedEngagement ? 'Edit Engagement' : 'Add Engagement'}</DialogTitle>
                <DialogDescription>
                  Capture your engagement details and optional certificate file.
                </DialogDescription>
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
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Spinner className="mr-2" />
                      Saving...
                    </>
                  ) : selectedEngagement ? (
                    'Save Changes'
                  ) : (
                    'Add Engagement'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Engagements', value: stats.total, icon: Briefcase },
          { label: 'Active Projects', value: stats.active, icon: Globe },
          { label: 'Completed', value: stats.completed, icon: Award },
          { label: 'Partner Organizations', value: stats.partners, icon: Building2 },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or organization..."
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
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="border-border/50">
                <CardContent className="p-5">
                  <div className="h-24 rounded-xl bg-muted animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : engagementsQuery.isError && !engagementsQuery.data ? (
          <EmptyState
            icon={Briefcase}
            title="Unable to load engagements"
            description="Try refreshing the list. If the issue continues, check your connection and try again."
            action={{
              label: 'Retry',
              onClick: () => {
                void engagementsQuery.refetch()
              },
            }}
          />
        ) : filteredEngagements.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={searchQuery || selectedType !== 'all' || selectedStatus !== 'all' ? 'No engagements found' : 'No engagements yet'}
            description={
              searchQuery || selectedType !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your filters.'
                : 'Add your first engagement to start tracking extension work.'
            }
            action={{
              label: 'Add Engagement',
              onClick: () => handleOpenForm(),
            }}
          />
        ) : (
          <div className="space-y-4">
            {filteredEngagements.map((engagement) => {
              const Icon = engagementIcons[engagement.type as EngagementPayload['type']]

              return (
                <Card key={engagement.id} className="group border-border/50 transition-colors hover:border-primary/20">
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:flex">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-2 font-medium text-foreground transition-colors group-hover:text-primary">
                              {engagement.title || 'Untitled engagement'}
                            </h3>
                            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                              <Building2 className="h-3.5 w-3.5" />
                              <span className="line-clamp-1">{engagement.organization || 'Organization not set'}</span>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenForm(engagement)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {engagement.certificate_path ? (
                                <DropdownMenuItem onClick={() => void openEngagementCertificate(engagement)}>
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Open Certificate
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedEngagement(engagement)
                                  setIsDeleteOpen(true)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <Badge variant="secondary" className="text-xs">
                          {ENGAGEMENT_TYPES.find((type) => type.value === engagement.type)?.label ?? engagement.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getEngagementStatusLabel(engagement.status)}
                        </Badge>
                        {isIncompleteEngagement(engagement) ? (
                          <Badge variant="outline" className="text-xs">Needs completion</Badge>
                        ) : null}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatStoredDate(engagement.startDate)}
                          {engagement.endDate ? ` - ${formatStoredDate(engagement.endDate)}` : ''}
                        </div>
                        {hasEngagementCertificate(engagement) && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Paperclip className="h-3 w-3" />
                            Certificate
                          </Badge>
                        )}
                      </div>

                      {engagement.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                          {engagement.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Engagement</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the engagement from your portfolio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  )
}
