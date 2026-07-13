import type {
  EducationEntry,
  EducationPayload,
  Engagement,
  EngagementPayload,
  Publication,
  PublicationPayload,
  ResearchStatus,
  ResearchTitle,
  ResearchTitlePayload,
} from '@/lib/types'

export const emptyEducationPayload: EducationPayload = {
  degree: '',
  field: '',
  institution: '',
  year: new Date().getFullYear(),
}

export const emptyPublicationPayload: PublicationPayload = {
  title: '',
  type: 'journal_article',
  authors: [],
  co_author_user_ids: [],
  co_author_contributions: [],
  author_count: 1,
  year: new Date().getFullYear(),
  venue: '',
  volume: '',
  issue: '',
  page_numbers: '',
  doi: '',
  abstract: '',
  status: 'published',
  indexing: [],
  quartile_ranking: 'na',
  open_access: null,
  faculty_role: 'co_author',
  institution_affiliated: true,
  sdgGoals: [],
  external_url: '',
  proof_path: null,
}

export const emptyEngagementPayload: EngagementPayload = {
  title: '',
  type: 'consulting',
  organization: '',
  status: 'ongoing',
  startDate: '',
  endDate: '',
  description: '',
  beneficiaries: 0,
  certificate_path: null,
}

export const emptyResearchTitlePayload: ResearchTitlePayload = {
  title: '',
  status: 'proposed',
  researchers: [],
  startDate: '',
  endDate: '',
  fundingSource: '',
  fundingAmount: 0,
  description: '',
  progress: 0,
  sdgGoals: [],
  paper_path: null,
}

export function normalizeResearchStatus(status: ResearchTitle['status']): ResearchStatus {
  if (status === 'proposal') {
    return 'proposed'
  }

  if (status === 'on-going') {
    return 'ongoing'
  }

  return status
}

export function toEducationPayload(entry: EducationEntry): EducationPayload {
  return {
    id: entry.id,
    degree: entry.degree,
    field: entry.field,
    institution: entry.institution,
    year: entry.year,
    display_order: entry.display_order,
  }
}

export function toPublicationPayload(publication: Publication): PublicationPayload {
  return {
    id: publication.id,
    title: publication.title,
    type: publication.type,
    authors: publication.authors,
    co_author_user_ids: publication.co_author_user_ids ?? publication.co_authors?.map((coAuthor) => coAuthor.id) ?? [],
    co_author_contributions:
      publication.co_author_contributions ??
      publication.co_authors?.map((coAuthor) => ({
        user_id: coAuthor.id,
        faculty_role: coAuthor.faculty_role ?? 'co_author',
      })) ??
      [],
    author_count: publication.author_count,
    year: publication.year,
    venue: publication.venue,
    volume: publication.volume ?? '',
    issue: publication.issue ?? '',
    page_numbers: publication.page_numbers ?? '',
    doi: publication.doi ?? '',
    abstract: publication.abstract ?? '',
    status: publication.status ?? 'submitted',
    indexing: publication.indexing,
    quartile_ranking: publication.quartile_ranking ?? 'na',
    open_access: publication.open_access ?? null,
    faculty_role: publication.faculty_role ?? 'co_author',
    is_lead_corresponding: publication.is_lead_corresponding ?? null,
    institution_affiliated: publication.institution_affiliated,
    sdgGoals: publication.sdgGoals,
    citations: publication.citations,
    external_url: publication.external_url ?? '',
    proof_path: publication.proof_path ?? null,
    display_order: publication.display_order,
  }
}

export function toEngagementPayload(engagement: Engagement): EngagementPayload {
  return {
    id: engagement.id,
    title: engagement.title,
    type: engagement.type as EngagementPayload['type'],
    organization: engagement.organization,
    status: engagement.status,
    startDate: engagement.startDate,
    endDate: engagement.endDate,
    description: engagement.description,
    beneficiaries: engagement.beneficiaries,
    certificate_path: engagement.certificate_path ?? null,
    display_order: engagement.display_order,
  }
}

export function toResearchTitlePayload(researchTitle: ResearchTitle): ResearchTitlePayload {
  return {
    id: researchTitle.id,
    title: researchTitle.title,
    status: normalizeResearchStatus(researchTitle.status),
    researchers: researchTitle.researchers ?? [],
    startDate: researchTitle.startDate ?? '',
    endDate: researchTitle.endDate ?? '',
    fundingSource: researchTitle.fundingSource ?? '',
    fundingAmount: researchTitle.fundingAmount ?? 0,
    description: researchTitle.description ?? '',
    progress: researchTitle.progress ?? 0,
    sdgGoals: researchTitle.sdgGoals ?? [],
    paper_path: researchTitle.paper_path ?? null,
    display_order: researchTitle.display_order,
  }
}
