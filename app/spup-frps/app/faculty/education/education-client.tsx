'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth-context'
import { useFacultyEducationQuery } from '@/lib/query/faculty'
import { queryKeys } from '@/lib/query/query-keys'
import { ProfileService } from '@/lib/services/profile-service'
import { TopHeader } from '@/components/layout/top-header'
import { EmptyState } from '@/components/shared/empty-state'
import { EducationFormFields } from '@/components/faculty/forms/education-form-fields'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import {
  GraduationCap,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Building,
  Calendar,
  Save,
  X,
  LayoutGrid,
  List,
} from 'lucide-react'
import { toast } from 'sonner'
import { emptyEducationPayload, toEducationPayload } from '@/lib/faculty-content'
import { formatStoredYear, isIncompleteEducationEntry } from '@/lib/record-completeness'
import type { EducationEntry, EducationPayload } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function FacultyEducationPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const educationQuery = useFacultyEducationQuery(Boolean(user?.id))
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  
  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<EducationEntry | null>(null)
  const [formData, setFormData] = useState<EducationPayload>(emptyEducationPayload)
  const [isSaving, setIsSaving] = useState(false)
  const entries = educationQuery.data ?? []
  const isLoading = educationQuery.isLoading && !educationQuery.data

  const handleOpenForm = (entry?: EducationEntry) => {
    if (entry) {
      setSelectedEntry(entry)
      setFormData(toEducationPayload(entry))
    } else {
      setSelectedEntry(null)
      setFormData(emptyEducationPayload)
    }
    setIsFormOpen(true)
  }

  const handleSave = async () => {
    if (!user) return
    if (!formData.degree || !formData.field || !formData.institution) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSaving(true)
    try {
      const nextEntry = await ProfileService.upsertEducation(formData)
      queryClient.setQueryData<EducationEntry[]>(queryKeys.faculty.education(), (current = []) => {
        const exists = current.some((entry) => entry.id === nextEntry.id)

        if (exists) {
          return current.map((entry) => (entry.id === nextEntry.id ? nextEntry : entry))
        }

        return [nextEntry, ...current]
      })
      setIsFormOpen(false)
      toast.success(selectedEntry ? 'Education updated' : 'Education added')
    } catch (error) {
      console.error('Failed to save education:', error)
      toast.error('Failed to save education')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !selectedEntry) return
    try {
      await ProfileService.deleteEducation(selectedEntry.id)
      queryClient.setQueryData<EducationEntry[]>(
        queryKeys.faculty.education(),
        (current = []) => current.filter((entry) => entry.id !== selectedEntry.id)
      )
      setIsDeleteOpen(false)
      setSelectedEntry(null)
      toast.success('Education entry deleted')
    } catch (error) {
      console.error('Failed to delete education:', error)
      toast.error('Failed to delete education')
    }
  }

  const filteredEntries = entries.filter(
    (entry) =>
      entry.degree.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.field.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.institution.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen">
      <TopHeader 
        title="Education" 
        subtitle="Manage your educational background"
      />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search education entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode('card')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            <Button onClick={() => handleOpenForm()} className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Education
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className={cn(
            'gap-4',
            viewMode === 'card' ? 'grid md:grid-cols-2 lg:grid-cols-3' : 'space-y-3'
          )}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title={searchQuery ? 'No results found' : 'No education entries yet'}
            description={
              searchQuery
                ? 'Try adjusting your search query'
                : 'Add your educational background to complete your profile'
            }
            action={
              !searchQuery
                ? { label: 'Add Education', onClick: () => handleOpenForm() }
                : undefined
            }
          />
        ) : viewMode === 'card' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEntries.map((entry) => (
              <Card key={entry.id} className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenForm(entry)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setSelectedEntry(entry)
                            setIsDeleteOpen(true)
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground line-clamp-2">{entry.degree || 'Untitled education record'}</h3>
                      {isIncompleteEducationEntry(entry) ? (
                        <Badge variant="outline" className="text-xs">Needs completion</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.field || 'Field not set'}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building className="w-4 h-4" />
                      <span className="truncate">{entry.institution || 'Institution not set'}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatStoredYear(entry.year)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <Card key={entry.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{entry.degree || 'Untitled education record'}</h3>
                      {isIncompleteEducationEntry(entry) ? (
                        <Badge variant="outline" className="text-xs">Needs completion</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.field || 'Field not set'}</p>
                    <p className="text-sm text-muted-foreground truncate">{entry.institution || 'Institution not set'}</p>
                  </div>
                  <Badge variant="secondary">{formatStoredYear(entry.year)}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenForm(entry)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setSelectedEntry(entry)
                          setIsDeleteOpen(true)
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {selectedEntry ? 'Edit Education' : 'Add Education'}
              </DialogTitle>
              <DialogDescription>
                {selectedEntry
                  ? 'Update the details of your educational entry'
                  : 'Add a new degree or certification to your profile'}
              </DialogDescription>
            </DialogHeader>

              <EducationFormFields value={formData} onChange={setFormData} />

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
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
                    {selectedEntry ? 'Update' : 'Add'} Education
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Education Entry</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this education entry? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
