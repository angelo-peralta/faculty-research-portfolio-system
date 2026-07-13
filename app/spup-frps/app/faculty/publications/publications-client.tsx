'use client'

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Filter,
  BookOpen,
  FileText,
  Users,
  Award,
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  Paperclip,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useFacultyPublicationsQuery } from '@/lib/query/faculty'
import { queryKeys } from '@/lib/query/query-keys'
import { PublicationFormFields } from '@/components/faculty/forms/publication-form-fields'
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
import { SDGBadgeGroup } from '@/components/shared/sdg-badge-group'
import { Spinner } from '@/components/ui/spinner'
import { PUBLICATION_TYPES } from '@/lib/constants'
import { emptyPublicationPayload, toPublicationPayload } from '@/lib/faculty-content'
import { formatStoredYear, isIncompletePublication, isPlaceholderYear } from '@/lib/record-completeness'
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
} from '@/lib/publication-utils'
import type { Publication, PublicationPayload, PublicationType } from '@/lib/types'
import { toast } from 'sonner'

const publicationIcons: Record<PublicationType, typeof BookOpen> = {
  journal: BookOpen,
  conference: Users,
  book: FileText,
  chapter: FileText,
  patent: Award,
  other: FileText,
  journal_article: BookOpen,
  conference_paper: Users,
  book_chapter: FileText,
  review_article: FileText,
  creative_work: Award,
}

export default function PublicationsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const publicationsQuery = useFacultyPublicationsQuery(Boolean(user?.id))
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null)
  const [formData, setFormData] = useState<PublicationPayload>(emptyPublicationPayload)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const publications = useMemo(() => publicationsQuery.data ?? [], [publicationsQuery.data])
  const isLoading = publicationsQuery.isLoading && !publicationsQuery.data
  const loadError = publicationsQuery.error instanceof Error
    ? publicationsQuery.error.message
    : 'Unable to load publications right now.'

  const years = useMemo(() => {
    const uniqueYears = [
      ...new Set(
        publications
          .map((publication) => publication.year)
          .filter((year) => !isPlaceholderYear(year))
      ),
    ]
    return uniqueYears.sort((a, b) => b - a)
  }, [publications])

  const filteredPublications = useMemo(() => {
    const normalizedSearch = searchQuery.toLowerCase()

    return publications.filter((publication) => {
      const matchesSearch =
        publication.title.toLowerCase().includes(normalizedSearch) ||
        publication.venue.toLowerCase().includes(normalizedSearch) ||
        getPublicationFacultyRoleLabel(publication.faculty_role).toLowerCase().includes(normalizedSearch) ||
        (publication.owner_name ?? '').toLowerCase().includes(normalizedSearch) ||
        (publication.co_authors ?? []).some((coAuthor) =>
          coAuthor.name.toLowerCase().includes(normalizedSearch) ||
          coAuthor.email.toLowerCase().includes(normalizedSearch)
        )
      const matchesType = selectedType === 'all' || publication.type === selectedType
      const matchesYear = selectedYear === 'all' || publication.year.toString() === selectedYear

      return matchesSearch && matchesType && matchesYear
    })
  }, [publications, searchQuery, selectedType, selectedYear])

  const stats = useMemo(
    () => ({
      total: publications.length,
      journals: publications.filter((publication) => publication.type === 'journal_article' || publication.type === 'journal').length,
      conferences: publications.filter((publication) => publication.type === 'conference_paper' || publication.type === 'conference').length,
      indexed: publications.filter((publication) => isPublicationIndexed(publication.indexing)).length,
    }),
    [publications]
  )

  const handleOpenForm = (publication?: Publication) => {
    if (publication) {
      if (publication.can_manage === false) {
        toast.info('Shared publications can only be edited by the faculty member who added them.')
        return
      }

      setSelectedPublication(publication)
      setFormData(toPublicationPayload(publication))
    } else {
      setSelectedPublication(null)
      setFormData(emptyPublicationPayload)
    }

    setProofFile(null)
    setIsFormOpen(true)
  }

  const handleSave = async () => {
    if (!user) return
    const normalizedFormData = normalizePublicationPayload(formData)
    const validationError = getPublicationValidationError(normalizedFormData, {
      hasProof: Boolean(proofFile || selectedPublication?.proof_path),
    })

    if (validationError) {
      toast.error(validationError)
      return
    }

    setIsSaving(true)

    try {
      const nextPublication = await ProfileService.upsertPublication(normalizedFormData, proofFile)
      queryClient.setQueryData<Publication[]>(queryKeys.faculty.publications(), (current = []) => {
        const exists = current.some((publication) => publication.id === nextPublication.id)

        if (exists) {
          return current.map((publication) =>
            publication.id === nextPublication.id ? nextPublication : publication
          )
        }

        return [nextPublication, ...current]
      })
      setIsFormOpen(false)
      setProofFile(null)
      toast.success(selectedPublication ? 'Publication updated' : 'Publication added')
    } catch (error) {
      console.error('Failed to save publication:', error)
      toast.error('Failed to save publication')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !selectedPublication) return

    if (selectedPublication.can_manage === false) {
      toast.info('Shared publications can only be removed by the faculty member who added them.')
      setIsDeleteOpen(false)
      return
    }

    try {
      await ProfileService.deletePublication(selectedPublication.id)
      queryClient.setQueryData<Publication[]>(
        queryKeys.faculty.publications(),
        (current = []) => current.filter((publication) => publication.id !== selectedPublication.id)
      )
      setSelectedPublication(null)
      setIsDeleteOpen(false)
      toast.success('Publication deleted')
    } catch (error) {
      console.error('Failed to delete publication:', error)
      toast.error('Failed to delete publication')
    }
  }

  const openPublicationProof = async (publication: Publication) => {
    try {
      const url =
        publication.proof_url ??
        await ProfileService.getSignedAssetUrl('publication-proof', publication.id)

      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to open the publication proof.')
    }
  }

  return (
    <div className="min-h-screen">
      <TopHeader
        title="Publications"
        subtitle="Manage your research publications and indexing metadata."
      />

      <div className="space-y-6 p-6">
        <div className="flex justify-end">
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => handleOpenForm()}>
                <Plus className="h-4 w-4" />
                Add Publication
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl xl:max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedPublication ? 'Edit Publication' : 'Add Publication'}</DialogTitle>
                <DialogDescription>
                  Capture the publication metadata required for institutional reporting and proof review.
                </DialogDescription>
              </DialogHeader>
              <PublicationFormFields
                key={selectedPublication?.id ?? 'new-publication'}
                formData={formData}
                setFormData={setFormData}
                proofFile={proofFile}
                setProofFile={setProofFile}
                existingProofUrl={selectedPublication?.proof_url ?? null}
                hasExistingProof={Boolean(selectedPublication?.proof_path)}
                showDoiLookup={!selectedPublication}
                currentFacultyId={user?.id ?? null}
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
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Spinner className="mr-2" />
                      Saving...
                    </>
                  ) : selectedPublication ? (
                    'Save Changes'
                  ) : (
                    'Add Publication'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Publications', value: stats.total, icon: FileText },
          { label: 'Journal Articles', value: stats.journals, icon: BookOpen },
          { label: 'Conference Papers', value: stats.conferences, icon: Users },
          { label: 'Indexed', value: stats.indexed, icon: Award },
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
                  placeholder="Search by title, venue, or faculty role..."
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
                    {PUBLICATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
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
        ) : publicationsQuery.isError && !publicationsQuery.data ? (
          <EmptyState
            icon={BookOpen}
            title="Unable to load publications"
            description={loadError}
            action={{
              label: 'Try Again',
              onClick: () => {
                void publicationsQuery.refetch()
              },
            }}
          />
        ) : filteredPublications.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={searchQuery || selectedType !== 'all' || selectedYear !== 'all' ? 'No publications found' : 'No publications yet'}
            description={
              searchQuery || selectedType !== 'all' || selectedYear !== 'all'
                ? 'Try adjusting your filters.'
                : 'Add your first publication to start building your portfolio.'
            }
            action={{
              label: 'Add Publication',
              onClick: () => handleOpenForm(),
            }}
          />
        ) : (
          <div className="space-y-4">
            {filteredPublications.map((publication) => {
              const Icon = publicationIcons[publication.type]
              const canManagePublication = publication.can_manage !== false

              return (
                <Card key={publication.id} className="group border-border/50 transition-colors hover:border-primary/20">
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:flex">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-2 font-medium text-foreground transition-colors group-hover:text-primary">
                              {publication.title || 'Untitled publication'}
                            </h3>
                            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                              {publication.venue || 'Venue not set'}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canManagePublication ? (
                                <DropdownMenuItem onClick={() => handleOpenForm(publication)}>
                                  <Edit2 className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              ) : null}
                              {getPublicationLink(publication) && (
                                <DropdownMenuItem asChild>
                                  <a
                                    href={getPublicationLink(publication)?.href ?? '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    {getPublicationLink(publication)?.label}
                                  </a>
                                </DropdownMenuItem>
                              )}
                              {publication.proof_path ? (
                                <DropdownMenuItem onClick={() => void openPublicationProof(publication)}>
                                  <Paperclip className="mr-2 h-4 w-4" />
                                  View Proof
                                </DropdownMenuItem>
                              ) : null}
                              {canManagePublication ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
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
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <Badge variant="secondary" className="text-xs">
                          {getPublicationTypeLabel(publication.type)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {formatStoredYear(publication.year)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getPublicationStatusLabel(publication.status)}
                        </Badge>
                        {isIncompletePublication(publication) ? (
                          <Badge variant="outline" className="text-xs">Needs completion</Badge>
                        ) : null}
                        {publication.is_shared ? (
                          <Badge variant="secondary" className="text-xs">
                            Shared by {publication.owner_name ?? 'faculty owner'}
                          </Badge>
                        ) : null}
                        <Badge className="text-xs bg-accent/20 text-accent-foreground hover:bg-accent/30">
                          {getPublicationIndexingStatus(publication.indexing)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {publication.author_count} {publication.author_count === 1 ? 'author' : 'authors'}
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

                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {publication.volume || publication.issue || publication.page_numbers
                          ? `Vol. ${publication.volume || '-'} | Issue ${publication.issue || '-'} | Pages ${publication.page_numbers || '-'}`
                          : 'Volume, issue, and page numbers not set'}
                      </p>

                      {(publication.co_authors ?? []).length > 0 ? (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          Linked co-authors: {(publication.co_authors ?? [])
                            .map((coAuthor) => `${coAuthor.name} (${getPublicationFacultyRoleLabel(coAuthor.faculty_role)})`)
                            .join(', ')}
                        </p>
                      ) : null}

                      {publication.sdgGoals.length > 0 && (
                        <div className="mt-3">
                          <SDGBadgeGroup goals={publication.sdgGoals} size="sm" />
                        </div>
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
            <AlertDialogTitle>Delete Publication</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the publication from your portfolio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  )
}
