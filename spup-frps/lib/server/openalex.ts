import { APP_DEVELOPER_EMAIL } from '@/lib/app-meta'
import { normalizePublicationReference } from '@/lib/publication-utils'
import type { PublicationDoiLookupResult, PublicationPayload, PublicationType } from '@/lib/types'

const DEFAULT_OPENALEX_API_BASE_URL = 'https://api.openalex.org'

interface OpenAlexWork {
  id?: string
  doi?: string | null
  display_name?: string | null
  title?: string | null
  publication_year?: number | null
  type?: string | null
  type_crossref?: string | null
  cited_by_count?: number | null
  authorships?: Array<{
    author?: {
      display_name?: string | null
    } | null
  }>
  biblio?: {
    volume?: string | null
    issue?: string | null
    first_page?: string | null
    last_page?: string | null
  } | null
  primary_location?: {
    source?: {
      display_name?: string | null
    } | null
    landing_page_url?: string | null
  } | null
  open_access?: {
    is_oa?: boolean | null
  } | null
  abstract_inverted_index?: Record<string, number[]> | null
}

function getOpenAlexApiBaseUrl() {
  const configured =
    process.env.OPENALEX_API_BASE_URL ??
    process.env.OPENALEX_API_URL ??
    process.env.OPENACCESS_API

  if (!configured) {
    return DEFAULT_OPENALEX_API_BASE_URL
  }

  try {
    const url = new URL(configured)
    return url.origin
  } catch {
    return DEFAULT_OPENALEX_API_BASE_URL
  }
}

function toPublicationType(work: OpenAlexWork): PublicationType {
  const value = `${work.type_crossref ?? ''} ${work.type ?? ''}`.toLowerCase()

  if (value.includes('book-chapter') || value.includes('book_chapter') || value.includes('chapter')) {
    return 'book_chapter'
  }

  if (value.includes('proceedings') || value.includes('conference')) {
    return 'conference_paper'
  }

  if (value.includes('review')) {
    return 'review_article'
  }

  if (value.includes('book') || value.includes('monograph')) {
    return 'book'
  }

  if (value.includes('patent')) {
    return 'patent'
  }

  if (value.includes('journal') || value.includes('article')) {
    return 'journal_article'
  }

  return 'other'
}

function getPageNumbers(work: OpenAlexWork) {
  const firstPage = work.biblio?.first_page?.trim()
  const lastPage = work.biblio?.last_page?.trim()

  if (firstPage && lastPage && firstPage !== lastPage) {
    return `${firstPage}-${lastPage}`
  }

  return firstPage ?? lastPage ?? ''
}

function getAbstract(work: OpenAlexWork) {
  const invertedIndex = work.abstract_inverted_index

  if (!invertedIndex) {
    return ''
  }

  const words: string[] = []

  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const position of positions) {
      words[position] = word
    }
  }

  return words.filter(Boolean).join(' ')
}

function toPayload(work: OpenAlexWork, requestedDoi: string): PublicationPayload {
  const authors =
    work.authorships
      ?.map((authorship) => authorship.author?.display_name?.trim())
      .filter((author): author is string => Boolean(author)) ?? []
  const doi = normalizePublicationReference(work.doi ?? requestedDoi)
  const year = work.publication_year ?? new Date().getFullYear()

  return {
    title: work.display_name?.trim() || work.title?.trim() || '',
    type: toPublicationType(work),
    authors,
    author_count: Math.max(authors.length, 1),
    year,
    venue: work.primary_location?.source?.display_name?.trim() ?? '',
    volume: work.biblio?.volume?.trim() ?? '',
    issue: work.biblio?.issue?.trim() ?? '',
    page_numbers: getPageNumbers(work),
    doi,
    abstract: getAbstract(work),
    status: 'published',
    indexing: [],
    quartile_ranking: 'na',
    open_access: work.open_access?.is_oa ?? null,
    faculty_role: 'co_author',
    is_lead_corresponding: null,
    institution_affiliated: true,
    sdgGoals: [],
    citations: work.cited_by_count ?? 0,
    external_url: null,
  }
}

export async function lookupOpenAlexPublicationByDoi(doi: string): Promise<PublicationDoiLookupResult | null> {
  const normalizedDoi = normalizePublicationReference(doi)

  if (!normalizedDoi) {
    throw new Error('Enter a DOI before looking up publication metadata.')
  }

  const encodedDoi = encodeURIComponent(normalizedDoi)
  const url = new URL(`/works/doi:${encodedDoi}`, getOpenAlexApiBaseUrl())
  url.searchParams.set('mailto', APP_DEVELOPER_EMAIL)

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': `SPUP-FRP/2.0 (${APP_DEVELOPER_EMAIL})`,
    },
    cache: 'no-store',
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`OpenAlex lookup failed with status ${response.status}.`)
  }

  const work = await response.json() as OpenAlexWork

  return {
    source: 'openalex',
    openalex_id: work.id ?? null,
    openalex_url: work.id ?? null,
    matched_doi: normalizePublicationReference(work.doi ?? normalizedDoi),
    publication: toPayload(work, normalizedDoi),
  }
}
