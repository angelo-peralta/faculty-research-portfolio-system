import { randomUUID } from 'node:crypto'
import {
  AccessStatus as DbAccessStatus,
  Department as DbDepartment,
  EmploymentStatus as DbEmploymentStatus,
  EngagementStatus as DbEngagementStatus,
  EngagementType as DbEngagementType,
  PublicationStatus as DbPublicationStatus,
  PublicationType as DbPublicationType,
  ResearchTitleStatus as DbResearchTitleStatus,
  UserRole as DbUserRole,
} from '@/lib/db/enums'
import { execute, jsonParam, parseJsonArray, queryOne, queryRows, transaction, type PoolConnection, type RowDataPacket } from '@/lib/db/mysql'
import { DEPARTMENTS } from '@/lib/constants'
import {
  isIncompleteEducationEntry,
  isIncompleteEngagement,
  isIncompletePublication,
  isIncompleteResearchTitle,
} from '@/lib/record-completeness'
import { normalizePublicationPayload } from '@/lib/publication-utils'
import { removeLocalFacultyAsset } from '@/lib/server/local-assets'
import type {
  Department,
  EducationEntry,
  EducationPayload,
  EmploymentStatus,
  Engagement,
  EngagementPayload,
  FacultySearchResult,
  Profile,
  ProfileCompletionStatus,
  ProfileUpdatePayload,
  Publication,
  PublicationCoAuthor,
  PublicationCoAuthorContribution,
  PublicationFacultyRole,
  PublicationPayload,
  ResearchStatus,
  ResearchTitle,
  ResearchTitlePayload,
  User,
} from '@/lib/types'

const APP_TO_DB_EMPLOYMENT: Record<EmploymentStatus, DbEmploymentStatus> = {
  'full-time': DbEmploymentStatus.full_time,
  'part-time': DbEmploymentStatus.part_time,
  contract: DbEmploymentStatus.contract,
  emeritus: DbEmploymentStatus.emeritus,
}

const DB_TO_APP_EMPLOYMENT: Record<DbEmploymentStatus, EmploymentStatus> = {
  full_time: 'full-time',
  part_time: 'part-time',
  contract: 'contract',
  emeritus: 'emeritus',
}

const APP_TO_DB_PUBLICATION_STATUS: Record<NonNullable<PublicationPayload['status']>, DbPublicationStatus> = {
  published: DbPublicationStatus.published,
  accepted: DbPublicationStatus.accepted,
  submitted: DbPublicationStatus.submitted,
  in_press: DbPublicationStatus.in_press,
}

const APP_TO_DB_PUBLICATION_TYPE: Record<PublicationPayload['type'], DbPublicationType> = {
  journal: DbPublicationType.journal,
  conference: DbPublicationType.conference,
  book: DbPublicationType.book,
  chapter: DbPublicationType.chapter,
  patent: DbPublicationType.patent,
  other: DbPublicationType.other,
  journal_article: DbPublicationType.journal_article,
  conference_paper: DbPublicationType.conference_paper,
  book_chapter: DbPublicationType.book_chapter,
  review_article: DbPublicationType.review_article,
  creative_work: DbPublicationType.creative_work,
}

const APP_TO_DB_ENGAGEMENT_TYPE: Record<EngagementPayload['type'], DbEngagementType> = {
  consulting: DbEngagementType.consulting,
  training: DbEngagementType.training,
  community_service: DbEngagementType.community_service,
  industry_partnership: DbEngagementType.industry_partnership,
  policy_advisory: DbEngagementType.policy_advisory,
  other: DbEngagementType.other,
}

const APP_TO_DB_ENGAGEMENT_STATUS: Record<EngagementPayload['status'], DbEngagementStatus> = {
  planned: DbEngagementStatus.planned,
  ongoing: DbEngagementStatus.ongoing,
  completed: DbEngagementStatus.completed,
}

const APP_TO_DB_RESEARCH_STATUS: Record<ResearchStatus, DbResearchTitleStatus> = {
  proposed: DbResearchTitleStatus.proposed,
  ongoing: DbResearchTitleStatus.ongoing,
  completed: DbResearchTitleStatus.completed,
  published: DbResearchTitleStatus.published,
}

interface UserProfileRow extends RowDataPacket {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  department: DbDepartment | null
  specialization: string | null
  employmentStatus: DbEmploymentStatus | null
  photoPath: string | null
  bannerPath: string | null
  profileCreatedAt: Date | string | null
  profileUpdatedAt: Date | string | null
  userCreatedAt: Date | string
  userUpdatedAt: Date | string
  lastLoginAt: Date | string | null
}

interface EducationRow extends RowDataPacket {
  id: string
  userId: string
  degree: string
  field: string
  institution: string
  year: number
  displayOrder: number
}

interface PublicationRow extends RowDataPacket {
  id: string
  userId: string
  title: string
  type: DbPublicationType
  authors: unknown
  authorCount: number
  year: number
  venue: string
  volume: string | null
  issue: string | null
  pageNumbers: string | null
  doi: string | null
  abstract: string | null
  status: DbPublicationStatus
  externalUrl: string | null
  indexing: unknown
  quartileRanking: string | null
  openAccess: number | boolean | null
  facultyRole: string | null
  isLeadCorresponding: number | boolean | null
  institutionAffiliated: number | boolean
  sdgGoals: unknown
  citations: number
  proofPath: string | null
  displayOrder: number
  ownerName: string | null
  ownerEmail: string | null
  ownerAvatarUrl: string | null
}

interface ContributorRow extends RowDataPacket {
  publicationId: string
  id: string
  name: string
  email: string
  avatarUrl: string | null
  department: DbDepartment | null
  facultyRole: string | null
}

interface EngagementRow extends RowDataPacket {
  id: string
  userId: string
  title: string
  type: DbEngagementType
  organization: string
  status: DbEngagementStatus
  startDate: Date | string
  endDate: Date | string | null
  description: string | null
  beneficiaries: number
  certificatePath: string | null
  displayOrder: number
}

interface ResearchTitleRow extends RowDataPacket {
  id: string
  userId: string
  title: string
  status: DbResearchTitleStatus
  researchers: unknown
  startDate: Date | string
  endDate: Date | string | null
  fundingSource: string | null
  fundingAmount: number | null
  description: string | null
  progress: number | null
  sdgGoals: unknown
  paperPath: string | null
  displayOrder: number
}

function normalizeString(value: string | null | undefined) {
  const nextValue = value?.trim()
  return nextValue ? nextValue : null
}

function normalizeStringArray(value: string[] | undefined) {
  return (value ?? []).map((item) => item.trim()).filter(Boolean)
}

function toAppDepartment(value: DbDepartment | string | null | undefined): Department | null {
  return (value as Department | null | undefined) ?? null
}

function toDbDepartment(value: Department | null | undefined) {
  return value ?? null
}

function toAppEmploymentStatus(value: DbEmploymentStatus | string | null | undefined): EmploymentStatus | null {
  if (!value) {
    return null
  }

  return DB_TO_APP_EMPLOYMENT[value as DbEmploymentStatus]
}

function toDbEmploymentStatus(value: EmploymentStatus | null | undefined) {
  if (!value) {
    return null
  }

  return APP_TO_DB_EMPLOYMENT[value]
}

function toPublicationFacultyRole(value: string | null | undefined): PublicationFacultyRole {
  if (
    value === 'first_author' ||
    value === 'co_author' ||
    value === 'corresponding_author' ||
    value === 'sole_author'
  ) {
    return value
  }

  return 'co_author'
}

function asBool(value: number | boolean | null | undefined) {
  if (value === null || value === undefined) {
    return null
  }

  return Boolean(value)
}

function mapPublicationCoAuthor(user: {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  department?: DbDepartment | string | null
}, facultyRole: string | null | undefined = 'co_author'): PublicationCoAuthor {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    department: toAppDepartment(user.department),
    avatar_url: user.avatarUrl ?? null,
    faculty_role: toPublicationFacultyRole(facultyRole),
  }
}

async function resolvePublicationCoAuthorContributions(
  contributions: PublicationCoAuthorContribution[] | undefined,
  fallbackUserIds: string[] | undefined,
  ownerUserId: string
) {
  const contributionMap = new Map<string, PublicationFacultyRole>()

  for (const contribution of contributions ?? []) {
    const userId = contribution.user_id.trim()

    if (!userId || userId === ownerUserId || contributionMap.has(userId)) {
      continue
    }

    contributionMap.set(userId, toPublicationFacultyRole(contribution.faculty_role))
  }

  for (const userId of fallbackUserIds ?? []) {
    const normalizedUserId = userId.trim()

    if (!normalizedUserId || normalizedUserId === ownerUserId || contributionMap.has(normalizedUserId)) {
      continue
    }

    contributionMap.set(normalizedUserId, 'co_author')
  }

  const resolvedContributions = Array.from(contributionMap, ([userId, facultyRole]) => ({
    userId,
    facultyRole,
  }))
  const uniqueUserIds = resolvedContributions.map((contribution) => contribution.userId)

  if (uniqueUserIds.length === 0) {
    return []
  }

  const placeholders = uniqueUserIds.map(() => '?').join(', ')
  const users = await queryRows<RowDataPacket & { id: string }>(
    `
      SELECT DISTINCT u.id
      FROM users AS u
      INNER JOIN user_role_assignments AS ura ON ura.user_id = u.id
      WHERE u.id IN (${placeholders})
        AND u.access_status = ?
        AND ura.role = ?
    `,
    [...uniqueUserIds, DbAccessStatus.active, DbUserRole.faculty]
  )
  const registeredIds = new Set(users.map((user) => user.id))

  if (registeredIds.size !== uniqueUserIds.length) {
    throw new Error('One or more selected co-authors are not registered active faculty. Ask them to register before linking them to this publication.')
  }

  return resolvedContributions
}

function formatDateOnly(value: Date | string | null | undefined) {
  if (!value) {
    return ''
  }

  return new Date(value).toISOString().slice(0, 10)
}

function parseDateOnly(value: string | undefined, fallback: Date) {
  const normalizedValue = value?.trim()

  if (!normalizedValue) {
    return fallback
  }

  return new Date(`${normalizedValue}T00:00:00.000Z`)
}

async function mapProfile(user: User): Promise<Profile> {
  const row = await queryOne<UserProfileRow>(
    `
      SELECT
        u.id,
        u.email,
        u.name,
        u.avatar_url AS avatarUrl,
        fp.department,
        fp.specialization,
        fp.employment_status AS employmentStatus,
        fp.photo_path AS photoPath,
        fp.banner_path AS bannerPath,
        fp.created_at AS profileCreatedAt,
        fp.updated_at AS profileUpdatedAt,
        u.created_at AS userCreatedAt,
        u.updated_at AS userUpdatedAt,
        u.last_login_at AS lastLoginAt
      FROM users AS u
      LEFT JOIN faculty_profiles AS fp ON fp.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
    `,
    [user.id]
  )

  const createdAt = row?.profileCreatedAt ?? row?.userCreatedAt ?? new Date()
  const updatedAt = row?.profileUpdatedAt ?? row?.userUpdatedAt ?? createdAt

  return {
    id: user.id,
    email: row?.email ?? user.email,
    name: row?.name ?? user.name,
    department: toAppDepartment(row?.department),
    specialization: row?.specialization ?? null,
    employment_status: toAppEmploymentStatus(row?.employmentStatus),
    photo_path: row?.photoPath ?? null,
    banner_path: row?.bannerPath ?? null,
    photo_url: user.avatar_url,
    banner_url: null,
    created_at: new Date(createdAt).toISOString(),
    updated_at: new Date(updatedAt).toISOString(),
    last_login_at: row?.lastLoginAt ? new Date(row.lastLoginAt).toISOString() : null,
  }
}

function mapEducationEntry(entry: EducationRow): EducationEntry {
  return {
    id: entry.id,
    profile_id: entry.userId,
    degree: entry.degree,
    field: entry.field,
    institution: entry.institution,
    year: Number(entry.year),
    display_order: Number(entry.displayOrder),
  }
}

async function loadPublicationContributors(publicationIds: string[]) {
  if (publicationIds.length === 0) {
    return new Map<string, ContributorRow[]>()
  }

  const placeholders = publicationIds.map(() => '?').join(', ')
  const rows = await queryRows<ContributorRow>(
    `
      SELECT
        pc.publication_id AS publicationId,
        u.id,
        u.name,
        u.email,
        u.avatar_url AS avatarUrl,
        fp.department,
        pc.faculty_role AS facultyRole
      FROM publication_contributors AS pc
      INNER JOIN users AS u ON u.id = pc.user_id
      LEFT JOIN faculty_profiles AS fp ON fp.user_id = u.id
      WHERE pc.publication_id IN (${placeholders})
      ORDER BY pc.created_at ASC
    `,
    publicationIds
  )
  const map = new Map<string, ContributorRow[]>()

  for (const row of rows) {
    const entries = map.get(row.publicationId) ?? []
    entries.push(row)
    map.set(row.publicationId, entries)
  }

  return map
}

async function mapPublication(
  publication: PublicationRow,
  perspectiveUserId?: string,
  contributorsByPublication = new Map<string, ContributorRow[]>()
): Promise<Publication> {
  const link = publication.doi
    ? `https://doi.org/${publication.doi}`
    : publication.externalUrl
  const contributors = contributorsByPublication.get(publication.id) ?? []
  const coAuthors = contributors.map((contributor) =>
    mapPublicationCoAuthor(contributor, contributor.facultyRole)
  )
  const isShared = Boolean(perspectiveUserId && publication.userId !== perspectiveUserId)
  const perspectiveContributor = isShared
    ? contributors.find((contributor) => contributor.id === perspectiveUserId)
    : null
  const perspectiveFacultyRole = isShared
    ? toPublicationFacultyRole(perspectiveContributor?.facultyRole)
    : toPublicationFacultyRole(publication.facultyRole)

  return {
    id: publication.id,
    profile_id: publication.userId,
    title: publication.title,
    year: Number(publication.year),
    display_order: Number(publication.displayOrder),
    role: null,
    journal: publication.venue,
    link: link ?? null,
    status: publication.status,
    indexed: parseJsonArray(publication.indexing).join(', '),
    sdgs: parseJsonArray(publication.sdgGoals),
    type: publication.type,
    authors: parseJsonArray(publication.authors),
    author_count: Number(publication.authorCount),
    indexing: parseJsonArray(publication.indexing),
    sdgGoals: parseJsonArray(publication.sdgGoals),
    venue: publication.venue,
    volume: publication.volume,
    issue: publication.issue,
    page_numbers: publication.pageNumbers,
    doi: publication.doi ?? '',
    abstract: publication.abstract ?? '',
    external_url: publication.externalUrl,
    quartile_ranking: (publication.quartileRanking as Publication['quartile_ranking']) ?? null,
    open_access: asBool(publication.openAccess),
    faculty_role: perspectiveFacultyRole,
    is_lead_corresponding: perspectiveFacultyRole === 'corresponding_author'
      ? true
      : asBool(publication.isLeadCorresponding),
    institution_affiliated: Boolean(publication.institutionAffiliated),
    citations: Number(publication.citations),
    proof_path: publication.proofPath,
    proof_url: null,
    owner_id: publication.userId,
    owner_name: publication.ownerName ?? undefined,
    owner_email: publication.ownerEmail ?? undefined,
    owner_avatar_url: publication.ownerAvatarUrl ?? null,
    co_author_user_ids: coAuthors.map((coAuthor) => coAuthor.id),
    co_author_contributions: coAuthors.map((coAuthor) => ({
      user_id: coAuthor.id,
      faculty_role: coAuthor.faculty_role ?? 'co_author',
    })),
    co_authors: coAuthors,
    is_shared: isShared,
    can_manage: !perspectiveUserId || publication.userId === perspectiveUserId,
  }
}

async function mapEngagement(engagement: EngagementRow): Promise<Engagement> {
  return {
    id: engagement.id,
    profile_id: engagement.userId,
    title: engagement.title,
    role: null,
    type: engagement.type,
    host: engagement.organization,
    location: null,
    year: Number(formatDateOnly(engagement.startDate).slice(0, 4)) || null,
    certificate_path: engagement.certificatePath,
    certificate_url: null,
    display_order: Number(engagement.displayOrder),
    organization: engagement.organization,
    status: engagement.status,
    description: engagement.description ?? '',
    startDate: formatDateOnly(engagement.startDate),
    endDate: formatDateOnly(engagement.endDate),
    beneficiaries: Number(engagement.beneficiaries),
  }
}

async function mapResearchTitle(researchTitle: ResearchTitleRow): Promise<ResearchTitle> {
  return {
    id: researchTitle.id,
    profile_id: researchTitle.userId,
    title: researchTitle.title,
    role: null,
    year: Number(formatDateOnly(researchTitle.startDate).slice(0, 4)) || null,
    funding_type: null,
    funding_agency: researchTitle.fundingSource,
    status: researchTitle.status,
    sdgs: parseJsonArray(researchTitle.sdgGoals),
    paper_path: researchTitle.paperPath,
    paper_url: null,
    display_order: Number(researchTitle.displayOrder),
    researchers: parseJsonArray(researchTitle.researchers),
    fundingSource: researchTitle.fundingSource ?? '',
    fundingAmount: researchTitle.fundingAmount ?? 0,
    description: researchTitle.description ?? '',
    progress: researchTitle.progress ?? 0,
    startDate: formatDateOnly(researchTitle.startDate),
    endDate: formatDateOnly(researchTitle.endDate),
    sdgGoals: parseJsonArray(researchTitle.sdgGoals),
  }
}

async function getNextDisplayOrder(
  table: 'education_entries' | 'publications' | 'engagements' | 'research_titles',
  userId: string,
  executor?: PoolConnection
) {
  const latest = await queryOne<RowDataPacket & { displayOrder: number }>(
    `SELECT MAX(display_order) AS displayOrder FROM ${table} WHERE user_id = ?`,
    [userId],
    executor
  )

  return Number(latest?.displayOrder ?? 0) + 1
}

async function getPublicationById(publicationId: string, executor?: PoolConnection) {
  return queryOne<PublicationRow>(
    `
      SELECT
        p.id,
        p.user_id AS userId,
        p.title,
        p.type,
        p.authors,
        p.author_count AS authorCount,
        p.year,
        p.venue,
        p.volume,
        p.issue,
        p.page_numbers AS pageNumbers,
        p.doi,
        p.abstract,
        p.status,
        p.external_url AS externalUrl,
        p.indexing,
        p.quartile_ranking AS quartileRanking,
        p.open_access AS openAccess,
        p.faculty_role AS facultyRole,
        p.is_lead_corresponding AS isLeadCorresponding,
        p.institution_affiliated AS institutionAffiliated,
        p.sdg_goals AS sdgGoals,
        p.citations,
        p.proof_path AS proofPath,
        p.display_order AS displayOrder,
        u.name AS ownerName,
        u.email AS ownerEmail,
        u.avatar_url AS ownerAvatarUrl
      FROM publications AS p
      INNER JOIN users AS u ON u.id = p.user_id
      WHERE p.id = ?
      LIMIT 1
    `,
    [publicationId],
    executor
  )
}

export const FacultyDataService = {
  async getMyProfile(user: User): Promise<Profile> {
    return mapProfile(user)
  },

  async updateMyProfile(user: User, payload: ProfileUpdatePayload): Promise<Profile> {
    const existingProfile = await queryOne<RowDataPacket & { photoPath: string | null; bannerPath: string | null }>(
      'SELECT photo_path AS photoPath, banner_path AS bannerPath FROM faculty_profiles WHERE user_id = ? LIMIT 1',
      [user.id]
    )
    const nextName = normalizeString(payload.name) ?? user.name

    await transaction(async (connection) => {
      await execute(
        'UPDATE users SET name = ? WHERE id = ?',
        [nextName, user.id],
        connection
      )
      await execute(
        `
          INSERT INTO faculty_profiles (
            user_id,
            department,
            specialization,
            employment_status,
            photo_path,
            banner_path
          )
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            department = IF(? = 1, VALUES(department), department),
            specialization = IF(? = 1, VALUES(specialization), specialization),
            employment_status = IF(? = 1, VALUES(employment_status), employment_status),
            photo_path = IF(? = 1, VALUES(photo_path), photo_path),
            banner_path = IF(? = 1, VALUES(banner_path), banner_path)
        `,
        [
          user.id,
          toDbDepartment(payload.department),
          normalizeString(payload.specialization),
          toDbEmploymentStatus(payload.employment_status),
          payload.photo_path ?? null,
          payload.banner_path ?? null,
          payload.department !== undefined ? 1 : 0,
          payload.specialization !== undefined ? 1 : 0,
          payload.employment_status !== undefined ? 1 : 0,
          payload.photo_path !== undefined ? 1 : 0,
          payload.banner_path !== undefined ? 1 : 0,
        ],
        connection
      )
    })

    if (existingProfile?.photoPath && payload.photo_path !== undefined && existingProfile.photoPath !== payload.photo_path) {
      await removeLocalFacultyAsset(existingProfile.photoPath)
    }

    if (existingProfile?.bannerPath && payload.banner_path !== undefined && existingProfile.bannerPath !== payload.banner_path) {
      await removeLocalFacultyAsset(existingProfile.bannerPath)
    }

    return this.getMyProfile({
      ...user,
      name: nextName,
    })
  },

  async getProfileCompletion(userId: string): Promise<ProfileCompletionStatus> {
    const [profile, educationEntries, publications, engagements, researchTitles] = await Promise.all([
      queryOne<RowDataPacket & { department: string | null; employmentStatus: string | null }>(
        'SELECT department, employment_status AS employmentStatus FROM faculty_profiles WHERE user_id = ? LIMIT 1',
        [userId]
      ),
      queryRows<EducationRow>(
        `
          SELECT id, user_id AS userId, degree, field, institution, year, display_order AS displayOrder
          FROM education_entries
          WHERE user_id = ?
        `,
        [userId]
      ),
      queryRows<RowDataPacket & { title: string; venue: string; year: number; authorCount: number }>(
        `
          SELECT DISTINCT p.title, p.venue, p.year, p.author_count AS authorCount
          FROM publications AS p
          LEFT JOIN publication_contributors AS pc ON pc.publication_id = p.id
          WHERE p.user_id = ? OR pc.user_id = ?
        `,
        [userId, userId]
      ),
      queryRows<EngagementRow>(
        `
          SELECT
            id,
            user_id AS userId,
            title,
            type,
            organization,
            status,
            start_date AS startDate,
            end_date AS endDate,
            description,
            beneficiaries,
            certificate_path AS certificatePath,
            display_order AS displayOrder
          FROM engagements
          WHERE user_id = ?
        `,
        [userId]
      ),
      queryRows<ResearchTitleRow>(
        `
          SELECT
            id,
            user_id AS userId,
            title,
            status,
            researchers,
            start_date AS startDate,
            end_date AS endDate,
            funding_source AS fundingSource,
            funding_amount AS fundingAmount,
            description,
            progress,
            sdg_goals AS sdgGoals,
            paper_path AS paperPath,
            display_order AS displayOrder
          FROM research_titles
          WHERE user_id = ?
        `,
        [userId]
      ),
    ])

    const educationCount = educationEntries.length
    const publicationCount = publications.length
    const engagementCount = engagements.length
    const researchTitleCount = researchTitles.length
    const hasProfile = Boolean(profile?.department && profile?.employmentStatus)
    const hasEducation = educationEntries.some((entry) => !isIncompleteEducationEntry(entry))
    const hasPublications = publications.some((publication) => !isIncompletePublication(publication))
    const hasEngagements = engagements.some((engagement) => !isIncompleteEngagement({
      ...engagement,
      startDate: formatDateOnly(engagement.startDate),
    }))
    const hasResearchTitles = researchTitles.some((researchTitle) => !isIncompleteResearchTitle({
      ...researchTitle,
      startDate: formatDateOnly(researchTitle.startDate),
      researchers: parseJsonArray(researchTitle.researchers),
    }))

    const sections = [
      hasProfile,
      hasEducation,
      hasPublications,
      hasEngagements,
      hasResearchTitles,
    ]

    return {
      hasProfile,
      hasEducation,
      hasPublications,
      hasEngagements,
      hasResearchTitles,
      score: Math.round((sections.filter(Boolean).length / sections.length) * 100),
      educationCount,
      publicationsCount: publicationCount,
      engagementsCount: engagementCount,
      researchTitlesCount: researchTitleCount,
    }
  },

  async listMyEducation(userId: string): Promise<EducationEntry[]> {
    const entries = await queryRows<EducationRow>(
      `
        SELECT
          id,
          user_id AS userId,
          degree,
          field,
          institution,
          year,
          display_order AS displayOrder
        FROM education_entries
        WHERE user_id = ?
        ORDER BY display_order ASC
      `,
      [userId]
    )

    return entries.map(mapEducationEntry)
  },

  async upsertEducation(userId: string, payload: EducationPayload): Promise<EducationEntry> {
    const displayOrder = payload.display_order ?? await getNextDisplayOrder('education_entries', userId)
    const entryId = payload.id ?? randomUUID()

    if (payload.id) {
      const existing = await queryOne<RowDataPacket & { id: string }>(
        'SELECT id FROM education_entries WHERE id = ? AND user_id = ? LIMIT 1',
        [payload.id, userId]
      )

      if (!existing) {
        throw new Error('Education entry not found.')
      }
    }

    await execute(
      `
        INSERT INTO education_entries (
          id,
          user_id,
          degree,
          field,
          institution,
          year,
          display_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          degree = VALUES(degree),
          field = VALUES(field),
          institution = VALUES(institution),
          year = VALUES(year),
          display_order = VALUES(display_order)
      `,
      [
        entryId,
        userId,
        payload.degree.trim(),
        payload.field.trim(),
        payload.institution.trim(),
        payload.year,
        displayOrder,
      ]
    )

    const entry = await queryOne<EducationRow>(
      `
        SELECT
          id,
          user_id AS userId,
          degree,
          field,
          institution,
          year,
          display_order AS displayOrder
        FROM education_entries
        WHERE id = ?
        LIMIT 1
      `,
      [entryId]
    )

    if (!entry) {
      throw new Error('Education entry was not saved.')
    }

    return mapEducationEntry(entry)
  },

  async deleteEducation(userId: string, entryId: string): Promise<boolean> {
    const result = await execute(
      'DELETE FROM education_entries WHERE id = ? AND user_id = ?',
      [entryId, userId]
    )

    return result.affectedRows > 0
  },

  async listMyPublications(userId: string): Promise<Publication[]> {
    const publications = await queryRows<PublicationRow>(
      `
        SELECT DISTINCT
          p.id,
          p.user_id AS userId,
          p.title,
          p.type,
          p.authors,
          p.author_count AS authorCount,
          p.year,
          p.venue,
          p.volume,
          p.issue,
          p.page_numbers AS pageNumbers,
          p.doi,
          p.abstract,
          p.status,
          p.external_url AS externalUrl,
          p.indexing,
          p.quartile_ranking AS quartileRanking,
          p.open_access AS openAccess,
          p.faculty_role AS facultyRole,
          p.is_lead_corresponding AS isLeadCorresponding,
          p.institution_affiliated AS institutionAffiliated,
          p.sdg_goals AS sdgGoals,
          p.citations,
          p.proof_path AS proofPath,
          p.display_order AS displayOrder,
          u.name AS ownerName,
          u.email AS ownerEmail,
          u.avatar_url AS ownerAvatarUrl
        FROM publications AS p
        INNER JOIN users AS u ON u.id = p.user_id
        LEFT JOIN publication_contributors AS pc ON pc.publication_id = p.id
        WHERE p.user_id = ? OR pc.user_id = ?
        ORDER BY p.display_order ASC
      `,
      [userId, userId]
    )
    const contributors = await loadPublicationContributors(publications.map((publication) => publication.id))

    return Promise.all(publications.map((publication) => mapPublication(publication, userId, contributors)))
  },

  async upsertPublication(userId: string, payload: PublicationPayload): Promise<Publication> {
    const normalizedPayload = normalizePublicationPayload(payload)
    const coAuthorContributions = await resolvePublicationCoAuthorContributions(
      normalizedPayload.co_author_contributions,
      normalizedPayload.co_author_user_ids,
      userId
    )
    const displayOrder = normalizedPayload.display_order ?? await getNextDisplayOrder('publications', userId)
    const normalizedAuthors = normalizeStringArray(normalizedPayload.authors)
    const authorCount = Math.max(normalizedPayload.author_count ?? normalizedAuthors.length, normalizedAuthors.length, 1)
    let previousProofPath: string | null = null
    const publicationId = normalizedPayload.id ?? randomUUID()

    if (normalizedPayload.id) {
      const existing = await queryOne<RowDataPacket & { proofPath: string | null }>(
        'SELECT proof_path AS proofPath FROM publications WHERE id = ? AND user_id = ? LIMIT 1',
        [normalizedPayload.id, userId]
      )

      if (!existing) {
        throw new Error('Publication not found.')
      }

      previousProofPath = existing.proofPath ?? null
    }

    await transaction(async (connection) => {
      await execute(
        `
          INSERT INTO publications (
            id,
            user_id,
            title,
            type,
            authors,
            author_count,
            year,
            venue,
            volume,
            issue,
            page_numbers,
            doi,
            abstract,
            status,
            external_url,
            indexing,
            quartile_ranking,
            open_access,
            faculty_role,
            is_lead_corresponding,
            institution_affiliated,
            sdg_goals,
            citations,
            proof_path,
            display_order
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            type = VALUES(type),
            authors = VALUES(authors),
            author_count = VALUES(author_count),
            year = VALUES(year),
            venue = VALUES(venue),
            volume = VALUES(volume),
            issue = VALUES(issue),
            page_numbers = VALUES(page_numbers),
            doi = VALUES(doi),
            abstract = VALUES(abstract),
            status = VALUES(status),
            external_url = VALUES(external_url),
            indexing = VALUES(indexing),
            quartile_ranking = VALUES(quartile_ranking),
            open_access = VALUES(open_access),
            faculty_role = VALUES(faculty_role),
            is_lead_corresponding = VALUES(is_lead_corresponding),
            institution_affiliated = VALUES(institution_affiliated),
            sdg_goals = VALUES(sdg_goals),
            citations = VALUES(citations),
            proof_path = VALUES(proof_path),
            display_order = VALUES(display_order)
        `,
        [
          publicationId,
          userId,
          normalizedPayload.title,
          APP_TO_DB_PUBLICATION_TYPE[normalizedPayload.type],
          jsonParam(normalizedAuthors),
          authorCount,
          normalizedPayload.year,
          normalizedPayload.venue,
          normalizeString(normalizedPayload.volume),
          normalizeString(normalizedPayload.issue),
          normalizeString(normalizedPayload.page_numbers),
          normalizeString(normalizedPayload.doi),
          normalizeString(normalizedPayload.abstract),
          APP_TO_DB_PUBLICATION_STATUS[normalizedPayload.status ?? 'published'],
          normalizeString(normalizedPayload.external_url),
          jsonParam(normalizeStringArray(normalizedPayload.indexing)),
          normalizeString(normalizedPayload.quartile_ranking),
          normalizedPayload.open_access ?? null,
          normalizeString(normalizedPayload.faculty_role),
          normalizedPayload.is_lead_corresponding ?? null,
          normalizedPayload.institution_affiliated,
          jsonParam(normalizeStringArray(normalizedPayload.sdgGoals)),
          normalizedPayload.citations ?? 0,
          normalizedPayload.proof_path ?? previousProofPath,
          displayOrder,
        ],
        connection
      )

      await execute(
        'DELETE FROM publication_contributors WHERE publication_id = ?',
        [publicationId],
        connection
      )

      for (const contribution of coAuthorContributions) {
        await execute(
          `
            INSERT INTO publication_contributors (publication_id, user_id, faculty_role)
            VALUES (?, ?, ?)
          `,
          [publicationId, contribution.userId, contribution.facultyRole],
          connection
        )
      }
    })

    if (
      previousProofPath &&
      normalizedPayload.proof_path !== undefined &&
      previousProofPath !== normalizedPayload.proof_path
    ) {
      await removeLocalFacultyAsset(previousProofPath)
    }

    const publication = await getPublicationById(publicationId)

    if (!publication) {
      throw new Error('Publication was not saved.')
    }

    const contributors = await loadPublicationContributors([publication.id])
    return mapPublication(publication, userId, contributors)
  },

  async deletePublication(userId: string, publicationId: string): Promise<boolean> {
    const existing = await queryOne<RowDataPacket & { proofPath: string | null }>(
      'SELECT proof_path AS proofPath FROM publications WHERE id = ? AND user_id = ? LIMIT 1',
      [publicationId, userId]
    )

    if (!existing) {
      return false
    }

    await execute('DELETE FROM publications WHERE id = ?', [publicationId])
    await removeLocalFacultyAsset(existing.proofPath)
    return true
  },

  async searchFacultyCoAuthors(query: string, excludeUserId?: string | null): Promise<FacultySearchResult[]> {
    const search = query.trim()

    if (search.length < 2) {
      return []
    }

    const normalizedSearch = search.toLowerCase()
    const matchingDepartments = DEPARTMENTS
      .filter((department) =>
        department.value.toLowerCase().includes(normalizedSearch) ||
        department.label.toLowerCase().includes(normalizedSearch)
      )
      .map((department) => department.value as DbDepartment)

    const params: unknown[] = [DbAccessStatus.active, DbUserRole.faculty, `%${search}%`, `%${search}%`]
    let departmentClause = ''

    if (matchingDepartments.length > 0) {
      departmentClause = `OR fp.department IN (${matchingDepartments.map(() => '?').join(', ')})`
      params.push(...matchingDepartments)
    }

    if (excludeUserId) {
      params.push(excludeUserId)
    }

    const users = await queryRows<RowDataPacket & {
      id: string
      name: string
      email: string
      avatarUrl: string | null
      department: DbDepartment | null
    }>(
      `
        SELECT DISTINCT
          u.id,
          u.name,
          u.email,
          u.avatar_url AS avatarUrl,
          fp.department
        FROM users AS u
        INNER JOIN user_role_assignments AS ura ON ura.user_id = u.id
        LEFT JOIN faculty_profiles AS fp ON fp.user_id = u.id
        WHERE u.access_status = ?
          AND ura.role = ?
          AND (
            u.name LIKE ?
            OR u.email LIKE ?
            ${departmentClause}
          )
          ${excludeUserId ? 'AND u.id <> ?' : ''}
        ORDER BY u.name ASC
        LIMIT 8
      `,
      params
    )

    return users.map((user) => mapPublicationCoAuthor(user))
  },

  async listMyEngagements(userId: string): Promise<Engagement[]> {
    const engagements = await queryRows<EngagementRow>(
      `
        SELECT
          id,
          user_id AS userId,
          title,
          type,
          organization,
          status,
          start_date AS startDate,
          end_date AS endDate,
          description,
          beneficiaries,
          certificate_path AS certificatePath,
          display_order AS displayOrder
        FROM engagements
        WHERE user_id = ?
        ORDER BY display_order ASC
      `,
      [userId]
    )

    return Promise.all(engagements.map((engagement) => mapEngagement(engagement)))
  },

  async upsertEngagement(userId: string, payload: EngagementPayload): Promise<Engagement> {
    const displayOrder = payload.display_order ?? await getNextDisplayOrder('engagements', userId)
    const nextStartDate = parseDateOnly(payload.startDate, new Date())
    const nextEndDate = parseDateOnly(payload.endDate, nextStartDate)
    const engagementId = payload.id ?? randomUUID()
    let previousCertificatePath: string | null = null

    if (payload.id) {
      const existing = await queryOne<RowDataPacket & { certificatePath: string | null }>(
        'SELECT certificate_path AS certificatePath FROM engagements WHERE id = ? AND user_id = ? LIMIT 1',
        [payload.id, userId]
      )
      if (!existing) {
        throw new Error('Engagement not found.')
      }
      previousCertificatePath = existing.certificatePath ?? null
    }

    await execute(
      `
        INSERT INTO engagements (
          id,
          user_id,
          title,
          type,
          organization,
          status,
          start_date,
          end_date,
          description,
          beneficiaries,
          sdg_goals,
          certificate_path,
          display_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          type = VALUES(type),
          organization = VALUES(organization),
          status = VALUES(status),
          start_date = VALUES(start_date),
          end_date = VALUES(end_date),
          description = VALUES(description),
          beneficiaries = VALUES(beneficiaries),
          certificate_path = VALUES(certificate_path),
          display_order = VALUES(display_order)
      `,
      [
        engagementId,
        userId,
        payload.title.trim(),
        APP_TO_DB_ENGAGEMENT_TYPE[payload.type],
        payload.organization.trim(),
        APP_TO_DB_ENGAGEMENT_STATUS[payload.status],
        nextStartDate,
        payload.endDate?.trim() ? nextEndDate : null,
        normalizeString(payload.description),
        payload.beneficiaries ?? 0,
        jsonParam([]),
        payload.certificate_path ?? previousCertificatePath,
        displayOrder,
      ]
    )

    if (
      previousCertificatePath &&
      payload.certificate_path !== undefined &&
      previousCertificatePath !== payload.certificate_path
    ) {
      await removeLocalFacultyAsset(previousCertificatePath)
    }

    const engagement = await queryOne<EngagementRow>(
      `
        SELECT
          id,
          user_id AS userId,
          title,
          type,
          organization,
          status,
          start_date AS startDate,
          end_date AS endDate,
          description,
          beneficiaries,
          certificate_path AS certificatePath,
          display_order AS displayOrder
        FROM engagements
        WHERE id = ?
        LIMIT 1
      `,
      [engagementId]
    )

    if (!engagement) {
      throw new Error('Engagement was not saved.')
    }

    return mapEngagement(engagement)
  },

  async deleteEngagement(userId: string, engagementId: string): Promise<boolean> {
    const existing = await queryOne<RowDataPacket & { certificatePath: string | null }>(
      'SELECT certificate_path AS certificatePath FROM engagements WHERE id = ? AND user_id = ? LIMIT 1',
      [engagementId, userId]
    )

    if (!existing) {
      return false
    }

    await execute('DELETE FROM engagements WHERE id = ?', [engagementId])
    await removeLocalFacultyAsset(existing.certificatePath)
    return true
  },

  async listMyResearchTitles(userId: string): Promise<ResearchTitle[]> {
    const researchTitles = await queryRows<ResearchTitleRow>(
      `
        SELECT
          id,
          user_id AS userId,
          title,
          status,
          researchers,
          start_date AS startDate,
          end_date AS endDate,
          funding_source AS fundingSource,
          funding_amount AS fundingAmount,
          description,
          progress,
          sdg_goals AS sdgGoals,
          paper_path AS paperPath,
          display_order AS displayOrder
        FROM research_titles
        WHERE user_id = ?
        ORDER BY display_order ASC
      `,
      [userId]
    )

    return Promise.all(researchTitles.map((researchTitle) => mapResearchTitle(researchTitle)))
  },

  async upsertResearchTitle(userId: string, payload: ResearchTitlePayload): Promise<ResearchTitle> {
    const displayOrder = payload.display_order ?? await getNextDisplayOrder('research_titles', userId)
    const nextStartDate = parseDateOnly(payload.startDate, new Date())
    const nextEndDate = parseDateOnly(payload.endDate, nextStartDate)
    const researchTitleId = payload.id ?? randomUUID()
    let previousPaperPath: string | null = null

    if (payload.id) {
      const existing = await queryOne<RowDataPacket & { paperPath: string | null }>(
        'SELECT paper_path AS paperPath FROM research_titles WHERE id = ? AND user_id = ? LIMIT 1',
        [payload.id, userId]
      )
      if (!existing) {
        throw new Error('Research title not found.')
      }
      previousPaperPath = existing.paperPath ?? null
    }

    await execute(
      `
        INSERT INTO research_titles (
          id,
          user_id,
          title,
          status,
          researchers,
          start_date,
          end_date,
          funding_source,
          funding_amount,
          description,
          progress,
          sdg_goals,
          paper_path,
          display_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          status = VALUES(status),
          researchers = VALUES(researchers),
          start_date = VALUES(start_date),
          end_date = VALUES(end_date),
          funding_source = VALUES(funding_source),
          funding_amount = VALUES(funding_amount),
          description = VALUES(description),
          progress = VALUES(progress),
          sdg_goals = VALUES(sdg_goals),
          paper_path = VALUES(paper_path),
          display_order = VALUES(display_order)
      `,
      [
        researchTitleId,
        userId,
        payload.title.trim(),
        APP_TO_DB_RESEARCH_STATUS[payload.status],
        jsonParam(normalizeStringArray(payload.researchers)),
        nextStartDate,
        payload.endDate?.trim() ? nextEndDate : null,
        normalizeString(payload.fundingSource),
        payload.fundingAmount ?? null,
        normalizeString(payload.description),
        payload.progress ?? null,
        jsonParam(normalizeStringArray(payload.sdgGoals)),
        payload.paper_path ?? previousPaperPath,
        displayOrder,
      ]
    )

    if (previousPaperPath && payload.paper_path !== undefined && previousPaperPath !== payload.paper_path) {
      await removeLocalFacultyAsset(previousPaperPath)
    }

    const researchTitle = await queryOne<ResearchTitleRow>(
      `
        SELECT
          id,
          user_id AS userId,
          title,
          status,
          researchers,
          start_date AS startDate,
          end_date AS endDate,
          funding_source AS fundingSource,
          funding_amount AS fundingAmount,
          description,
          progress,
          sdg_goals AS sdgGoals,
          paper_path AS paperPath,
          display_order AS displayOrder
        FROM research_titles
        WHERE id = ?
        LIMIT 1
      `,
      [researchTitleId]
    )

    if (!researchTitle) {
      throw new Error('Research title was not saved.')
    }

    return mapResearchTitle(researchTitle)
  },

  async deleteResearchTitle(userId: string, researchTitleId: string): Promise<boolean> {
    const existing = await queryOne<RowDataPacket & { paperPath: string | null }>(
      'SELECT paper_path AS paperPath FROM research_titles WHERE id = ? AND user_id = ? LIMIT 1',
      [researchTitleId, userId]
    )

    if (!existing) {
      return false
    }

    await execute('DELETE FROM research_titles WHERE id = ?', [researchTitleId])
    await removeLocalFacultyAsset(existing.paperPath)
    return true
  },
}
