import type {
  EducationEntry,
  EducationPayload,
  Engagement,
  Publication,
  ResearchTitle,
} from '@/lib/types'

export const PLACEHOLDER_YEAR = 1900
export const PLACEHOLDER_DATE = '1900-01-01'

function normalizeString(value: string | null | undefined) {
  const nextValue = value?.trim()
  return nextValue ? nextValue : ''
}

export function isPlaceholderYear(value: number | null | undefined) {
  return value === null || value === undefined || value === PLACEHOLDER_YEAR
}

export function isPlaceholderDate(value: string | null | undefined) {
  return !value || value === PLACEHOLDER_DATE
}

export function isIncompleteEducationEntry(entry: Pick<EducationEntry, 'degree' | 'field' | 'institution' | 'year'>) {
  return (
    !normalizeString(entry.degree) ||
    !normalizeString(entry.field) ||
    !normalizeString(entry.institution) ||
    isPlaceholderYear(entry.year)
  )
}

export function isIncompleteEducationPayload(entry: Pick<EducationPayload, 'degree' | 'field' | 'institution' | 'year'>) {
  return (
    !normalizeString(entry.degree) ||
    !normalizeString(entry.field) ||
    !normalizeString(entry.institution) ||
    isPlaceholderYear(entry.year)
  )
}

type PublicationCompletenessInput = Pick<Publication, 'title' | 'venue' | 'year'> & {
  author_count?: number | null
  authorCount?: number | null
  authors?: string[] | null
}

export function isIncompletePublication(publication: PublicationCompletenessInput) {
  const authorCount =
    publication.author_count ?? publication.authorCount ?? publication.authors?.length ?? 0

  return (
    !normalizeString(publication.title) ||
    !normalizeString(publication.venue) ||
    isPlaceholderYear(publication.year) ||
    authorCount <= 0
  )
}

export function isIncompleteEngagement(engagement: Pick<Engagement, 'title' | 'organization' | 'startDate'>) {
  return (
    !normalizeString(engagement.title) ||
    !normalizeString(engagement.organization) ||
    isPlaceholderDate(engagement.startDate)
  )
}

export function isIncompleteResearchTitle(research: Pick<ResearchTitle, 'title' | 'startDate' | 'researchers'>) {
  return (
    !normalizeString(research.title) ||
    isPlaceholderDate(research.startDate) ||
    (research.researchers ?? []).length === 0
  )
}

export function formatStoredYear(value: number | null | undefined) {
  return isPlaceholderYear(value) ? 'Not set' : String(value)
}

export function formatStoredDate(value: string | null | undefined) {
  return isPlaceholderDate(value) ? 'Not set' : value
}
