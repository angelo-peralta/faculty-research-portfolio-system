'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Search, UserPlus, Users, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import {
  DEPARTMENTS,
  INDEXING_TYPES,
  PUBLICATION_FACULTY_ROLES,
  PUBLICATION_QUARTILES,
  PUBLICATION_STATUSES,
  PUBLICATION_TYPES,
  SDG_OPTIONS,
} from '@/lib/constants'
import { NON_INDEXED_PUBLICATION_VALUE } from '@/lib/publication-utils'
import { PublicationLookupError, PublicationLookupService } from '@/lib/services/publication-lookup-service'
import { ProfileService } from '@/lib/services/profile-service'
import type {
  FacultySearchResult,
  PublicationDoiLookupResult,
  PublicationFacultyRole,
  PublicationCoAuthor,
  PublicationPayload,
  PublicationQuartile,
  PublicationStatus,
  PublicationType,
} from '@/lib/types'

interface PublicationFormFieldsProps {
  formData: PublicationPayload
  setFormData: Dispatch<SetStateAction<PublicationPayload>>
  proofFile: File | null
  setProofFile: Dispatch<SetStateAction<File | null>>
  existingProofUrl: string | null
  hasExistingProof?: boolean
  onViewExistingProof?: (() => void) | null
  showDoiLookup?: boolean
  currentFacultyId?: string | null
  initialCoAuthors?: PublicationCoAuthor[]
}

const EMPTY_CO_AUTHORS: PublicationCoAuthor[] = []

function yesNoValue(value: boolean | null | undefined) {
  if (value === true) {
    return 'yes'
  }

  if (value === false) {
    return 'no'
  }

  return 'unset'
}

function getDepartmentLabel(value: PublicationCoAuthor['department']) {
  if (!value) {
    return 'No department'
  }

  return DEPARTMENTS.find((department) => department.value === value)?.label ?? value
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function haveSameIds(left: string[] | undefined, right: string[]) {
  const leftIds = left ?? []

  if (leftIds.length !== right.length) {
    return false
  }

  return leftIds.every((id, index) => id === right[index])
}

function getCoAuthorRole(coAuthor: PublicationCoAuthor): PublicationFacultyRole {
  return coAuthor.faculty_role ?? 'co_author'
}

function haveSameCoAuthorContributions(left: PublicationCoAuthor[], right: PublicationCoAuthor[]) {
  if (left.length !== right.length) {
    return false
  }

  return left.every((coAuthor, index) => {
    const nextCoAuthor = right[index]

    return nextCoAuthor?.id === coAuthor.id && getCoAuthorRole(nextCoAuthor) === getCoAuthorRole(coAuthor)
  })
}

export function PublicationFormFields({
  formData,
  setFormData,
  proofFile,
  setProofFile,
  existingProofUrl,
  hasExistingProof = false,
  onViewExistingProof = null,
  showDoiLookup = false,
  currentFacultyId = null,
  initialCoAuthors = EMPTY_CO_AUTHORS,
}: PublicationFormFieldsProps) {
  const referenceValue = formData.external_url?.trim() || formData.doi?.trim() || ''
  const indexingValue = formData.indexing?.[0] ?? NON_INDEXED_PUBLICATION_VALUE
  const isIndexedPublication = indexingValue !== NON_INDEXED_PUBLICATION_VALUE
  const [lookupDoi, setLookupDoi] = useState('')
  const [lookupResult, setLookupResult] = useState<PublicationDoiLookupResult | null>(null)
  const [lookupNotice, setLookupNotice] = useState<{
    kind: 'success' | 'not-found' | 'error'
    title: string
    message: string
  } | null>(null)
  const [isLookingUpDoi, setIsLookingUpDoi] = useState(false)
  const [coAuthorSearch, setCoAuthorSearch] = useState('')
  const [coAuthorResults, setCoAuthorResults] = useState<FacultySearchResult[]>([])
  const [selectedCoAuthors, setSelectedCoAuthors] = useState<PublicationCoAuthor[]>(initialCoAuthors)
  const [isSearchingCoAuthors, setIsSearchingCoAuthors] = useState(false)
  const [coAuthorSearchError, setCoAuthorSearchError] = useState<string | null>(null)

  useEffect(() => {
    setSelectedCoAuthors((current) =>
      haveSameCoAuthorContributions(current, initialCoAuthors)
        ? current
        : initialCoAuthors
    )
  }, [initialCoAuthors])

  useEffect(() => {
    const nextCoAuthorIds = selectedCoAuthors.map((coAuthor) => coAuthor.id)
    const nextCoAuthorContributions = selectedCoAuthors.map((coAuthor) => ({
      user_id: coAuthor.id,
      faculty_role: getCoAuthorRole(coAuthor),
    }))

    setFormData((current) => {
      const currentContributions = (current.co_author_contributions ?? []).map((contribution) => ({
        user_id: contribution.user_id,
        faculty_role: contribution.faculty_role,
      }))
      const hasSameContributions =
        currentContributions.length === nextCoAuthorContributions.length &&
        currentContributions.every((contribution, index) => {
          const nextContribution = nextCoAuthorContributions[index]

          return nextContribution?.user_id === contribution.user_id &&
            nextContribution.faculty_role === contribution.faculty_role
        })

      if (haveSameIds(current.co_author_user_ids, nextCoAuthorIds) && hasSameContributions) {
        return current
      }

      return {
        ...current,
        co_author_user_ids: nextCoAuthorIds,
        co_author_contributions: nextCoAuthorContributions,
      }
    })
  }, [selectedCoAuthors, setFormData])

  useEffect(() => {
    const search = coAuthorSearch.trim()

    if (search.length < 2) {
      setCoAuthorResults([])
      setIsSearchingCoAuthors(false)
      setCoAuthorSearchError(null)
      return
    }

    let isActive = true
    setIsSearchingCoAuthors(true)
    setCoAuthorSearchError(null)

    const timeoutId = window.setTimeout(() => {
      void ProfileService.searchFacultyCoAuthors(search, currentFacultyId)
        .then((results) => {
          if (!isActive) {
            return
          }

          const selectedIds = new Set(selectedCoAuthors.map((coAuthor) => coAuthor.id))
          setCoAuthorResults(results.filter((result) => !selectedIds.has(result.id)))
        })
        .catch((error) => {
          if (!isActive) {
            return
          }

          setCoAuthorResults([])
          setCoAuthorSearchError(error instanceof Error ? error.message : 'Unable to search faculty right now.')
        })
        .finally(() => {
          if (isActive) {
            setIsSearchingCoAuthors(false)
          }
        })
    }, 250)

    return () => {
      isActive = false
      window.clearTimeout(timeoutId)
    }
  }, [coAuthorSearch, currentFacultyId, selectedCoAuthors])

  const toggleSdg = (value: string) => {
    setFormData((current) => ({
      ...current,
      sdgGoals: current.sdgGoals?.includes(value)
        ? current.sdgGoals.filter((item) => item !== value)
        : [...(current.sdgGoals ?? []), value],
    }))
  }

  const handleReferenceChange = (value: string) => {
    const trimmed = value.trim()
    const looksLikeUrl = /^https?:\/\//i.test(trimmed)

    setFormData((current) => ({
      ...current,
      doi: looksLikeUrl ? '' : trimmed,
      external_url: looksLikeUrl ? trimmed : '',
    }))
  }

  const handleDoiLookup = async () => {
    const doi = lookupDoi.trim() || formData.doi?.trim() || ''

    if (!doi) {
      setLookupNotice({
        kind: 'error',
        title: 'DOI required',
        message: 'Enter a DOI first, or continue by filling the publication details manually.',
      })
      return
    }

    setIsLookingUpDoi(true)
    setLookupNotice(null)

    try {
      const result = await PublicationLookupService.lookupByDoi(doi)

      setFormData((current) => ({
        ...current,
        title: result.publication.title || current.title,
        type: result.publication.type,
        authors: result.publication.authors,
        author_count: result.publication.author_count,
        year: result.publication.year,
        venue: result.publication.venue || current.venue,
        volume: result.publication.volume ?? '',
        issue: result.publication.issue ?? '',
        page_numbers: result.publication.page_numbers ?? '',
        doi: result.publication.doi,
        abstract: result.publication.abstract ?? '',
        status: result.publication.status ?? current.status ?? 'published',
        open_access: result.publication.open_access ?? null,
        citations: result.publication.citations ?? 0,
        external_url: result.publication.external_url ?? null,
      }))
      setLookupDoi(result.matched_doi)
      setLookupResult(result)
      setLookupNotice({
        kind: 'success',
        title: 'OpenAlex record found',
        message: 'The publication fields were prefilled. Review the details below and edit anything that needs correction.',
      })
    } catch (error) {
      const isNotFound = error instanceof PublicationLookupError && error.status === 404

      setLookupResult(null)
      setLookupNotice({
        kind: isNotFound ? 'not-found' : 'error',
        title: isNotFound ? 'No record found' : 'Lookup failed',
        message: isNotFound
          ? 'OpenAlex does not have a record for that DOI. Try another DOI or enter the publication details manually.'
          : error instanceof Error
            ? error.message
            : 'Unable to look up that DOI right now.',
      })
    } finally {
      setIsLookingUpDoi(false)
    }
  }

  const handleAddCoAuthor = (coAuthor: FacultySearchResult) => {
    setSelectedCoAuthors((current) => {
      if (current.some((selected) => selected.id === coAuthor.id)) {
        return current
      }

      return [...current, { ...coAuthor, faculty_role: coAuthor.faculty_role ?? 'co_author' }]
    })
    setCoAuthorSearch('')
    setCoAuthorResults([])
  }

  const handleRemoveCoAuthor = (coAuthorId: string) => {
    setSelectedCoAuthors((current) => current.filter((coAuthor) => coAuthor.id !== coAuthorId))
  }

  const handleCoAuthorRoleChange = (coAuthorId: string, facultyRole: PublicationFacultyRole) => {
    setSelectedCoAuthors((current) =>
      current.map((coAuthor) =>
        coAuthor.id === coAuthorId
          ? { ...coAuthor, faculty_role: facultyRole }
          : coAuthor
      )
    )
  }

  return (
    <div className="space-y-5 py-2">
      {showDoiLookup ? (
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
          <div className="space-y-1">
            <Label htmlFor="doi-lookup">Start with DOI</Label>
            <p className="text-sm text-muted-foreground">
              Look up the DOI in OpenAlex to prefill the publication details, then verify and edit the fields below.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="doi-lookup"
              value={lookupDoi}
              onChange={(event) => setLookupDoi(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleDoiLookup()
                }
              }}
              placeholder="10.1234/example.doi"
            />
            <Button type="button" onClick={() => void handleDoiLookup()} disabled={isLookingUpDoi}>
              {isLookingUpDoi ? <Spinner className="mr-2 h-4 w-4" /> : <Search className="mr-2 h-4 w-4" />}
              Look Up
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setLookupNotice(null)
                setLookupResult(null)
              }}
              disabled={isLookingUpDoi}
            >
              Enter Manually
            </Button>
          </div>
          {lookupNotice ? (
            <Alert variant={lookupNotice.kind === 'error' ? 'destructive' : 'default'}>
              <AlertTitle>{lookupNotice.title}</AlertTitle>
              <AlertDescription>{lookupNotice.message}</AlertDescription>
            </Alert>
          ) : null}
          {lookupResult ? (
            <div className="rounded-md border border-border/60 bg-background p-3 text-sm">
              <p className="font-medium">{lookupResult.publication.title}</p>
              <p className="text-muted-foreground">
                {lookupResult.publication.venue || 'Venue not supplied by OpenAlex'} | {lookupResult.publication.year}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="title">Title of Publication</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
          placeholder="Enter the full publication title"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="year">Year of Publication</Label>
          <Input
            id="year"
            type="number"
            min={1900}
            max={new Date().getFullYear() + 1}
            value={formData.year}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                year: Number(event.target.value) || new Date().getFullYear(),
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Type of Output</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData((current) => ({ ...current, type: value as PublicationType }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PUBLICATION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Publication Status</Label>
          <Select
            value={formData.status ?? 'published'}
            onValueChange={(value) =>
              setFormData((current) => ({
                ...current,
                status: value as PublicationStatus,
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PUBLICATION_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Indexing Status</Label>
          <Select
            value={indexingValue}
            onValueChange={(value) =>
              setFormData((current) => ({
                ...current,
                indexing: value === NON_INDEXED_PUBLICATION_VALUE ? [] : [value],
                quartile_ranking:
                  value === NON_INDEXED_PUBLICATION_VALUE
                    ? 'na'
                    : current.quartile_ranking ?? 'na',
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NON_INDEXED_PUBLICATION_VALUE}>Non-indexed</SelectItem>
              {INDEXING_TYPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="venue">Journal / Publisher / Proceedings Title</Label>
        <Input
          id="venue"
          value={formData.venue}
          onChange={(event) => setFormData((current) => ({ ...current, venue: event.target.value }))}
          placeholder="Enter the journal, publisher, or proceedings title"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="volume">Volume</Label>
          <Input
            id="volume"
            value={formData.volume ?? ''}
            onChange={(event) => setFormData((current) => ({ ...current, volume: event.target.value }))}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="issue">Issue</Label>
          <Input
            id="issue"
            value={formData.issue ?? ''}
            onChange={(event) => setFormData((current) => ({ ...current, issue: event.target.value }))}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="pages">Page Numbers</Label>
          <Input
            id="pages"
            value={formData.page_numbers ?? ''}
            onChange={(event) => setFormData((current) => ({ ...current, page_numbers: event.target.value }))}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference">DOI / URL</Label>
        <Input
          id="reference"
          value={referenceValue}
          onChange={(event) => handleReferenceChange(event.target.value)}
          placeholder="Enter a DOI or a direct URL"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>Quartile Ranking</Label>
          <Select
            disabled={!isIndexedPublication}
            value={formData.quartile_ranking ?? 'na'}
            onValueChange={(value) =>
              setFormData((current) => ({
                ...current,
                quartile_ranking: value as PublicationQuartile,
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PUBLICATION_QUARTILES.map((quartile) => (
                <SelectItem key={quartile.value} value={quartile.value}>
                  {quartile.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isIndexedPublication ? (
            <p className="text-xs text-muted-foreground">Quartile ranking stays at N/A until an indexing status is selected.</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Open Access</Label>
          <Select
            value={yesNoValue(formData.open_access)}
            onValueChange={(value) =>
              setFormData((current) => ({
                ...current,
                open_access: value === 'unset' ? null : value === 'yes',
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select access" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">Not set</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Affiliated to Institution?</Label>
          <Select
            value={formData.institution_affiliated ? 'yes' : 'no'}
            onValueChange={(value) =>
              setFormData((current) => ({
                ...current,
                institution_affiliated: value === 'yes',
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="author-count">Number of Authors</Label>
          <Input
            id="author-count"
            type="number"
            min={1}
            value={formData.author_count}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                author_count: Math.max(Number(event.target.value) || 1, 1),
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Registering Faculty Contribution</Label>
          <Select
            value={formData.faculty_role ?? 'co_author'}
            onValueChange={(value) =>
              setFormData((current) => ({
                ...current,
                faculty_role: value as PublicationFacultyRole,
                is_lead_corresponding: value === 'corresponding_author' ? true : null,
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PUBLICATION_FACULTY_ROLES.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
        <div className="space-y-1">
          <Label htmlFor="co-author-search">Registered Faculty Co-authors</Label>
          <p className="text-sm text-muted-foreground">
            Link registered faculty so this same publication and proof file appears in their portfolio too.
          </p>
        </div>
        <Alert>
          <Users className="h-4 w-4" />
          <AlertTitle>Only registered faculty can be linked</AlertTitle>
          <AlertDescription>
            If a co-author does not appear in search, ask them to register or sign in first before adding them.
          </AlertDescription>
        </Alert>

        {selectedCoAuthors.length > 0 ? (
          <div className="space-y-2">
            {selectedCoAuthors.map((coAuthor) => (
              <div key={coAuthor.id} className="flex flex-col gap-3 rounded-md border border-border/60 bg-background p-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={coAuthor.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      {getInitials(coAuthor.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{coAuthor.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {coAuthor.email} | {getDepartmentLabel(coAuthor.department)}
                    </p>
                  </div>
                </div>
                <Select
                  value={getCoAuthorRole(coAuthor)}
                  onValueChange={(value) => handleCoAuthorRoleChange(coAuthor.id, value as PublicationFacultyRole)}
                >
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PUBLICATION_FACULTY_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveCoAuthor(coAuthor.id)}
                  aria-label={`Remove ${coAuthor.name}`}
                  className="h-8 w-8 self-end text-muted-foreground sm:self-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="co-author-search"
            value={coAuthorSearch}
            onChange={(event) => setCoAuthorSearch(event.target.value)}
            placeholder="Search faculty by name, email, or department"
            className="pl-9"
          />
          {isSearchingCoAuthors ? (
            <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          ) : null}
        </div>

        {coAuthorSearchError ? (
          <p className="text-sm text-destructive">{coAuthorSearchError}</p>
        ) : null}

        {coAuthorSearch.trim().length >= 2 && !isSearchingCoAuthors && coAuthorResults.length === 0 && !coAuthorSearchError ? (
          <p className="text-sm text-muted-foreground">No registered faculty found for that search.</p>
        ) : null}

        {coAuthorResults.length > 0 ? (
          <div className="overflow-hidden rounded-md border border-border/60 bg-background">
            {coAuthorResults.map((coAuthor) => (
              <button
                key={coAuthor.id}
                type="button"
                onClick={() => handleAddCoAuthor(coAuthor)}
                className="flex w-full items-center gap-3 border-b border-border/60 px-3 py-2 text-left transition last:border-b-0 hover:bg-muted/50"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={coAuthor.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {getInitials(coAuthor.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{coAuthor.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {coAuthor.email} | {getDepartmentLabel(coAuthor.department)}
                  </span>
                </span>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="proof">Upload Proof</Label>
        <Input
          id="proof"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
        />
        {proofFile ? <p className="text-xs text-muted-foreground">{proofFile.name}</p> : null}
        {!proofFile && existingProofUrl ? (
          <a
            href={existingProofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline"
          >
            View current proof
          </a>
        ) : null}
        {!proofFile && !existingProofUrl && onViewExistingProof ? (
          <button
            type="button"
            onClick={onViewExistingProof}
            className="text-left text-xs text-primary underline"
          >
            View current proof
          </button>
        ) : null}
        {!proofFile && !existingProofUrl && !onViewExistingProof && hasExistingProof ? (
          <p className="text-xs text-muted-foreground">A proof file is already stored, but its preview link is currently unavailable.</p>
        ) : null}
      </div>

      <div className="space-y-3">
        <Label>SDG Alignment</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {SDG_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-3 rounded-lg border p-3">
              <Checkbox
                checked={formData.sdgGoals?.includes(option.value)}
                onCheckedChange={() => toggleSdg(option.value)}
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
