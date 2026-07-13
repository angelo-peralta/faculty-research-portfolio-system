'use client'

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Filter,
  Lightbulb,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Calendar,
  Users,
  MoreVertical,
  Edit2,
  Trash2,
  Paperclip,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useFacultyResearchQuery } from '@/lib/query/faculty'
import { queryKeys } from '@/lib/query/query-keys'
import { ResearchFormFields } from '@/components/faculty/forms/research-form-fields'
import { TopHeader } from '@/components/layout/top-header'
import { ProfileService } from '@/lib/services/profile-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
import { RESEARCH_STATUS } from '@/lib/constants'
import { emptyResearchTitlePayload, toResearchTitlePayload } from '@/lib/faculty-content'
import { formatStoredDate, isIncompleteResearchTitle } from '@/lib/record-completeness'
import type { ResearchStatus, ResearchTitle, ResearchTitlePayload } from '@/lib/types'
import { toast } from 'sonner'

const statusConfig: Record<ResearchStatus, { icon: typeof Lightbulb; className: string }> = {
  proposed: { icon: Lightbulb, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  ongoing: { icon: TrendingUp, className: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { icon: CheckCircle2, className: 'bg-green-50 text-green-700 border-green-200' },
  published: { icon: CheckCircle2, className: 'bg-primary/10 text-primary border-primary/20' },
}

export default function ResearchTitlesPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const researchQuery = useFacultyResearchQuery(Boolean(user?.id))
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedResearch, setSelectedResearch] = useState<ResearchTitle | null>(null)
  const [formData, setFormData] = useState<ResearchTitlePayload>(emptyResearchTitlePayload)
  const [paperFile, setPaperFile] = useState<File | null>(null)
  const researchTitles = useMemo(() => researchQuery.data ?? [], [researchQuery.data])
  const isLoading = researchQuery.isLoading && !researchQuery.data

  const filteredResearch = useMemo(() => {
    return researchTitles.filter((research) => {
      const matchesSearch =
        research.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (research.researchers ?? []).some((researcher) =>
          researcher.toLowerCase().includes(searchQuery.toLowerCase())
        )
      const matchesStatus = selectedStatus === 'all' || research.status === selectedStatus

      return matchesSearch && matchesStatus
    })
  }, [researchTitles, searchQuery, selectedStatus])

  const stats = useMemo(
    () => ({
      total: researchTitles.length,
      ongoing: researchTitles.filter((research) => research.status === 'ongoing').length,
      completed: researchTitles.filter((research) => research.status === 'completed' || research.status === 'published').length,
      totalFunding: researchTitles.reduce((sum, research) => sum + (research.fundingAmount ?? 0), 0),
    }),
    [researchTitles]
  )

  const handleOpenForm = (research?: ResearchTitle) => {
    if (research) {
      setSelectedResearch(research)
      setFormData(toResearchTitlePayload(research))
    } else {
      setSelectedResearch(null)
      setFormData(emptyResearchTitlePayload)
    }

    setPaperFile(null)
    setIsFormOpen(true)
  }

  const handleSave = async () => {
    if (!user) return
    if (!formData.title || formData.researchers.length === 0 || !formData.startDate) {
      toast.error('Title, at least one researcher, and start date are required')
      return
    }

    setIsSaving(true)

    try {
      const nextResearchTitle = await ProfileService.upsertResearchTitle(formData, paperFile)
      queryClient.setQueryData<ResearchTitle[]>(queryKeys.faculty.research(), (current = []) => {
        const exists = current.some((research) => research.id === nextResearchTitle.id)

        if (exists) {
          return current.map((research) =>
            research.id === nextResearchTitle.id ? nextResearchTitle : research
          )
        }

        return [nextResearchTitle, ...current]
      })
      setIsFormOpen(false)
      toast.success(selectedResearch ? 'Research updated' : 'Research added')
    } catch (error) {
      console.error('Failed to save research:', error)
      toast.error('Failed to save research')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !selectedResearch) return

    try {
      await ProfileService.deleteResearchTitle(selectedResearch.id)
      queryClient.setQueryData<ResearchTitle[]>(
        queryKeys.faculty.research(),
        (current = []) => current.filter((research) => research.id !== selectedResearch.id)
      )
      setSelectedResearch(null)
      setIsDeleteOpen(false)
      toast.success('Research deleted')
    } catch (error) {
      console.error('Failed to delete research:', error)
      toast.error('Failed to delete research')
    }
  }

  const openResearchPaper = async (research: ResearchTitle) => {
    try {
      const url =
        research.paper_url ??
        await ProfileService.getSignedAssetUrl('research-paper', research.id)

      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to open the research paper.')
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0,
    }).format(value)

  return (
    <div className="min-h-screen">
      <TopHeader
        title="Researches"
        subtitle="Manage your research pipeline, funding, progress, and supporting papers."
      />

      <div className="space-y-6 p-6">
        <div className="flex justify-end">
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => handleOpenForm()}>
                <Plus className="h-4 w-4" />
                Add Research
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedResearch ? 'Edit Research' : 'Add Research'}</DialogTitle>
                <DialogDescription>
                  Keep your research records current, including progress, funding, and paper upload.
                </DialogDescription>
              </DialogHeader>
              <ResearchFormFields
                formData={formData}
                setFormData={setFormData}
                paperFile={paperFile}
                setPaperFile={setPaperFile}
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
                <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Spinner className="mr-2" />
                      Saving...
                    </>
                  ) : selectedResearch ? (
                    'Save Changes'
                  ) : (
                    'Add Research'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Projects', value: stats.total, icon: Lightbulb },
          { label: 'Ongoing', value: stats.ongoing, icon: TrendingUp },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2 },
          { label: 'Total Funding', value: formatCurrency(stats.totalFunding), icon: DollarSign },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-semibold">{stat.value}</p>
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
                  placeholder="Search by title or researcher..."
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
        ) : filteredResearch.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title={searchQuery || selectedStatus !== 'all' ? 'No research found' : 'No researches yet'}
            description={
              searchQuery || selectedStatus !== 'all'
                ? 'Try adjusting your filters.'
                : 'Add your first research record to track your project pipeline.'
            }
            action={{
              label: 'Add Research',
              onClick: () => handleOpenForm(),
            }}
          />
        ) : (
          <div className="space-y-4">
            {filteredResearch.map((research) => {
              const normalizedStatus =
                research.status === 'on-going'
                  ? 'ongoing'
                  : research.status === 'proposal'
                    ? 'proposed'
                    : (research.status as ResearchStatus)
              const config = statusConfig[normalizedStatus]
              const StatusIcon = config.icon

              return (
                <Card key={research.id} className="group border-border/50 transition-colors hover:border-primary/20">
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      <div className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl border sm:flex ${config.className}`}>
                        <StatusIcon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-2 font-medium text-foreground transition-colors group-hover:text-primary">
                              {research.title || 'Untitled research'}
                            </h3>
                            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              <span className="line-clamp-1">
                                {(research.researchers ?? []).length > 0
                                  ? (research.researchers ?? []).join(', ')
                                  : 'Researchers not set'}
                              </span>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenForm(research)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {research.paper_path ? (
                                <DropdownMenuItem onClick={() => void openResearchPaper(research)}>
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Open Paper
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedResearch(research)
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
                        <Badge className={`text-xs border ${config.className}`}>
                          {RESEARCH_STATUS.find((status) => status.value === normalizedStatus)?.label ?? normalizedStatus}
                        </Badge>
                        {isIncompleteResearchTitle(research) ? (
                          <Badge variant="outline" className="text-xs">Needs completion</Badge>
                        ) : null}
                        {research.fundingSource && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <DollarSign className="h-3 w-3" />
                            {research.fundingSource}
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatStoredDate(research.startDate)}
                          {research.endDate ? ` - ${formatStoredDate(research.endDate)}` : ''}
                        </div>
                        {research.paper_path && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Paperclip className="h-3 w-3" />
                            Paper
                          </Badge>
                        )}
                      </div>

                      {typeof research.fundingAmount === 'number' && research.fundingAmount > 0 && (
                        <div className="mt-3 p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Funding</span>
                            <span className="font-medium">{formatCurrency(research.fundingAmount)}</span>
                          </div>
                        </div>
                      )}

                      {research.status === 'ongoing' && typeof research.progress === 'number' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{research.progress}%</span>
                          </div>
                          <Progress value={research.progress} className="h-2" />
                        </div>
                      )}

                      {research.description && (
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-3">
                          {research.description}
                        </p>
                      )}

                      {(research.sdgGoals ?? []).length > 0 && (
                        <div className="mt-3">
                          <SDGBadgeGroup goals={research.sdgGoals} size="sm" />
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
            <AlertDialogTitle>Delete Research</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the research record from your portfolio.
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
