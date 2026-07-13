import type {
  Department,
  EmploymentStatus,
  FundingType,
  PublicationFacultyRole,
  PublicationQuartile,
  PublicationStatus,
  ResearchRole,
  ResearchTitleStatus,
} from '@/lib/types'

export const DEPARTMENTS: { value: Department; label: string }[] = [
  { value: 'SASTE', label: 'SASTE - School of Arts, Sciences, and Teacher Education' },
  { value: 'SITE', label: 'SITE - School of Information Technology and Engineering' },
  { value: 'SBHAM', label: 'SBHAM - School of Business, Hospitality, and Accountancy Management' },
  { value: 'SNAHS', label: 'SNAHS - School of Nursing and Allied Health Sciences' },
  { value: 'SOM', label: 'SOM - School of Medicine' },
  { value: 'BEU', label: 'BEU - Basic Education Unit' },
  { value: 'CF', label: 'CF - College Foundation' },
  { value: 'KIRN', label: 'KIRN' },
  { value: 'GUIDANCE', label: 'GUIDANCE' },
]

export const EMPLOYMENT_STATUSES: { value: EmploymentStatus; label: string }[] = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'emeritus', label: 'Emeritus' },
]

export const RESEARCH_ROLES: { value: ResearchRole; label: string }[] = [
  { value: 'lead-researcher', label: 'Lead Researcher' },
  { value: 'co-researcher', label: 'Co-Researcher' },
  { value: 'corresponding-author', label: 'Corresponding Author' },
]

export const PUBLICATION_STATUSES: { value: PublicationStatus; label: string }[] = [
  { value: 'published', label: 'Published' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'in_press', label: 'In Press' },
  { value: 'submitted', label: 'Submitted' },
]

export const RESEARCH_TITLE_STATUSES: { value: ResearchTitleStatus; label: string }[] = [
  { value: 'on-going', label: 'On-going' },
  { value: 'completed', label: 'Completed' },
  { value: 'proposal', label: 'Proposal' },
]

export const FUNDING_TYPES: { value: FundingType; label: string }[] = [
  { value: 'self-funded', label: 'Self-funded' },
  { value: 'institutional', label: 'Institutional' },
  { value: 'external', label: 'External' },
]

export const ENGAGEMENT_TYPES = [
  { value: 'consulting', label: 'Consulting' },
  { value: 'training', label: 'Training' },
  { value: 'community_service', label: 'Community Service' },
  { value: 'industry_partnership', label: 'Industry Partnership' },
  { value: 'policy_advisory', label: 'Policy Advisory' },
  { value: 'other', label: 'Other' },
]

export const ACADEMIC_RANKS = [
  { value: 'instructor', label: 'Instructor' },
  { value: 'assistant-professor', label: 'Assistant Professor' },
  { value: 'associate-professor', label: 'Associate Professor' },
  { value: 'professor', label: 'Professor' },
]

export const PUBLICATION_TYPES = [
  { value: 'journal_article', label: 'Journal Article' },
  { value: 'book', label: 'Book' },
  { value: 'book_chapter', label: 'Book Chapter' },
  { value: 'conference_paper', label: 'Conference Paper' },
  { value: 'review_article', label: 'Review Article' },
  { value: 'creative_work', label: 'Creative Work' },
  { value: 'journal', label: 'Journal' },
  { value: 'conference', label: 'Conference' },
  { value: 'chapter', label: 'Chapter' },
  { value: 'patent', label: 'Patent' },
  { value: 'other', label: 'Other' },
]

export const PUBLICATION_QUARTILES: { value: PublicationQuartile; label: string }[] = [
  { value: 'q1', label: 'Q1' },
  { value: 'q2', label: 'Q2' },
  { value: 'q3', label: 'Q3' },
  { value: 'q4', label: 'Q4' },
  { value: 'na', label: 'N/A' },
]

export const PUBLICATION_FACULTY_ROLES: { value: PublicationFacultyRole; label: string }[] = [
  { value: 'first_author', label: 'First / Lead Author' },
  { value: 'co_author', label: 'Co-author' },
  { value: 'corresponding_author', label: 'Corresponding Author' },
  { value: 'sole_author', label: 'Sole Author' },
]

export const RESEARCH_STATUS = [
  { value: 'proposed', label: 'Proposed' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'published', label: 'Published' },
]

export const INDEXING_OPTIONS = [
  'Scopus',
  'WoS',
  'ACI',
  'PubMed',
  'CHED-recognized',
  'Peer-reviewed Local',
  'Web of Science',
  'ASEAN Citation Index',
  'Google Scholar',
  'DOAJ',
  'Philippine E-Journals',
]

export const SDG_OPTIONS = [
  { value: 'SDG1', label: 'SDG 1 - No Poverty' },
  { value: 'SDG2', label: 'SDG 2 - Zero Hunger' },
  { value: 'SDG3', label: 'SDG 3 - Good Health and Well-being' },
  { value: 'SDG4', label: 'SDG 4 - Quality Education' },
  { value: 'SDG5', label: 'SDG 5 - Gender Equality' },
  { value: 'SDG6', label: 'SDG 6 - Clean Water and Sanitation' },
  { value: 'SDG7', label: 'SDG 7 - Affordable and Clean Energy' },
  { value: 'SDG8', label: 'SDG 8 - Decent Work and Economic Growth' },
  { value: 'SDG9', label: 'SDG 9 - Industry, Innovation and Infrastructure' },
  { value: 'SDG10', label: 'SDG 10 - Reduced Inequalities' },
  { value: 'SDG11', label: 'SDG 11 - Sustainable Cities and Communities' },
  { value: 'SDG12', label: 'SDG 12 - Responsible Consumption and Production' },
  { value: 'SDG13', label: 'SDG 13 - Climate Action' },
  { value: 'SDG14', label: 'SDG 14 - Life Below Water' },
  { value: 'SDG15', label: 'SDG 15 - Life on Land' },
  { value: 'SDG16', label: 'SDG 16 - Peace, Justice and Strong Institutions' },
  { value: 'SDG17', label: 'SDG 17 - Partnerships for the Goals' },
]

export const INDEXING_TYPES = INDEXING_OPTIONS.map((value) => ({
  value,
  label: value,
}))

export const SDG_GOALS = SDG_OPTIONS.map((option) => ({
  number: Number(option.value.replace('SDG', '')),
  title: option.label,
}))

export const DEGREE_SUGGESTIONS = [
  'Doctor of Philosophy (Ph.D.)',
  'Doctor of Education (Ed.D.)',
  'Doctor of Medicine (M.D.)',
  'Master of Science (M.S.)',
  'Master of Arts (M.A.)',
  'Master of Business Administration (MBA)',
  'Master of Education (M.Ed.)',
  'Bachelor of Science (B.S.)',
  'Bachelor of Arts (B.A.)',
  'Bachelor of Science in Nursing (BSN)',
]

export const YEARS = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i)
