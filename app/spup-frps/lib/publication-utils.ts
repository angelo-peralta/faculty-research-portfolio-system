import {
  PUBLICATION_FACULTY_ROLES,
  PUBLICATION_QUARTILES,
  PUBLICATION_STATUSES,
  PUBLICATION_TYPES,
} from '@/lib/constants'
import type {
  Publication,
  PublicationFacultyRole,
  PublicationPayload,
  PublicationQuartile,
  PublicationStatus,
  PublicationType,
} from '@/lib/types'

export const NON_INDEXED_PUBLICATION_VALUE = 'non-indexed'

const DOI_URL_PATTERN = /^https?:\/\/(?:dx\.)?doi\.org\/(.+)$/i
const DOI_PREFIX_PATTERN = /^doi:\s*(.+)$/i

export function getPublicationTypeLabel(value: PublicationType) {
  return PUBLICATION_TYPES.find((type) => type.value === value)?.label ?? value
}

export function getPublicationStatusLabel(value: PublicationStatus | undefined | null) {
  if (!value) {
    return 'Not set'
  }

  return PUBLICATION_STATUSES.find((status) => status.value === value)?.label ?? value
}

export function getPublicationQuartileLabel(value: PublicationQuartile | undefined | null) {
  if (!value) {
    return 'Not set'
  }

  return PUBLICATION_QUARTILES.find((quartile) => quartile.value === value)?.label ?? value.toUpperCase()
}

export function getPublicationFacultyRoleLabel(value: PublicationFacultyRole | undefined | null) {
  if (!value) {
    return 'Not set'
  }

  return PUBLICATION_FACULTY_ROLES.find((role) => role.value === value)?.label ?? value
}

export function getPublicationLink(publication: Pick<Publication | PublicationPayload, 'doi' | 'external_url'>) {
  if (publication.doi) {
    return {
      href: `https://doi.org/${publication.doi}`,
      label: 'View DOI',
    }
  }

  if (publication.external_url) {
    return {
      href: publication.external_url,
      label: 'Open Link',
    }
  }

  return null
}

export function getPublicationIndexingStatus(indexing: string[] | undefined) {
  const normalized = indexing?.find(Boolean)

  return normalized ?? 'Non-indexed'
}

export function isPublicationIndexed(indexing: string[] | undefined) {
  return Boolean(indexing?.length)
}

export function normalizePublicationReference(value: string | null | undefined) {
  const trimmed = value?.trim()

  if (!trimmed) {
    return ''
  }

  const doiUrlMatch = trimmed.match(DOI_URL_PATTERN)

  if (doiUrlMatch) {
    return doiUrlMatch[1]?.trim() ?? ''
  }

  const doiPrefixMatch = trimmed.match(DOI_PREFIX_PATTERN)

  if (doiPrefixMatch) {
    return doiPrefixMatch[1]?.trim() ?? ''
  }

  return trimmed
}

export function normalizePublicationPayload(payload: PublicationPayload): PublicationPayload {
  const normalizedAuthors = (payload.authors ?? []).map((author) => author.trim()).filter(Boolean)
  const allowedFacultyRoles = new Set(PUBLICATION_FACULTY_ROLES.map((role) => role.value))
  const normalizedCoAuthorContributions = [
    ...(payload.co_author_contributions ?? []).map((contribution) => ({
      user_id: contribution.user_id.trim(),
      faculty_role: allowedFacultyRoles.has(contribution.faculty_role)
        ? contribution.faculty_role
        : 'co_author',
    })),
    ...(payload.co_author_user_ids ?? []).map((id) => ({
      user_id: id.trim(),
      faculty_role: 'co_author' as PublicationFacultyRole,
    })),
  ].reduce<NonNullable<PublicationPayload['co_author_contributions']>>((items, contribution) => {
    if (!contribution.user_id || items.some((item) => item.user_id === contribution.user_id)) {
      return items
    }

    return [...items, contribution]
  }, [])
  const normalizedCoAuthorUserIds = normalizedCoAuthorContributions.map((contribution) => contribution.user_id)
  const normalizedIndexing = (payload.indexing ?? []).map((value) => value.trim()).filter(Boolean)
  const normalizedSdgGoals = (payload.sdgGoals ?? []).map((value) => value.trim()).filter(Boolean)
  let normalizedDoi = normalizePublicationReference(payload.doi)
  let normalizedExternalUrl = payload.external_url?.trim() ?? ''

  if (normalizedExternalUrl) {
    const doiFromExternalUrl = normalizedExternalUrl.match(DOI_URL_PATTERN)?.[1]?.trim()

    if (doiFromExternalUrl) {
      normalizedDoi = doiFromExternalUrl
      normalizedExternalUrl = ''
    }
  }

  return {
    ...payload,
    title: payload.title.trim(),
    authors: normalizedAuthors,
    co_author_user_ids: normalizedCoAuthorUserIds,
    co_author_contributions: normalizedCoAuthorContributions,
    author_count: Math.max(Number(payload.author_count) || 1, 1),
    venue: payload.venue.trim(),
    volume: payload.volume?.trim() ?? '',
    issue: payload.issue?.trim() ?? '',
    page_numbers: payload.page_numbers?.trim() ?? '',
    doi: normalizedDoi,
    abstract: payload.abstract?.trim() ?? '',
    status: payload.status ?? 'published',
    indexing: normalizedIndexing,
    quartile_ranking: normalizedIndexing.length === 0 ? 'na' : payload.quartile_ranking ?? 'na',
    open_access: payload.open_access ?? null,
    faculty_role: payload.faculty_role ?? 'co_author',
    is_lead_corresponding:
      payload.faculty_role === 'corresponding_author'
        ? true
        : payload.is_lead_corresponding ?? null,
    institution_affiliated: payload.institution_affiliated ?? true,
    sdgGoals: normalizedSdgGoals,
    external_url: normalizedExternalUrl,
    proof_path:
      payload.proof_path === undefined
        ? undefined
        : payload.proof_path?.trim()
          ? payload.proof_path.trim()
          : null,
  }
}

export function getPublicationValidationError(payload: PublicationPayload, options: { hasProof: boolean }) {
  const currentYear = new Date().getFullYear() + 1

  if (!payload.title.trim()) {
    return 'Title is required.'
  }

  if (!Number.isInteger(payload.year) || payload.year < 1900 || payload.year > currentYear) {
    return 'Enter a valid publication year.'
  }

  if (!payload.type) {
    return 'Type of output is required.'
  }

  if (!payload.status) {
    return 'Publication status is required.'
  }

  if (!Array.isArray(payload.indexing)) {
    return 'Indexing status is required.'
  }

  if (!payload.venue.trim()) {
    return 'Journal, publisher, or proceedings title is required.'
  }

  if (!Number.isInteger(payload.author_count) || payload.author_count < 1) {
    return 'Enter a valid number of authors.'
  }

  if (payload.external_url && !/^https?:\/\/.+/i.test(payload.external_url)) {
    return 'Enter a valid URL.'
  }

  if (!options.hasProof) {
    return 'Upload proof before saving this publication.'
  }

  return null
}
