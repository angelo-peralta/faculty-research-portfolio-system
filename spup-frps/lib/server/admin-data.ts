import { randomUUID } from 'node:crypto'
import {
  AccessStatus as DbAccessStatus,
  EmploymentStatus as DbEmploymentStatus,
  FacultyInviteStatus as DbFacultyInviteStatus,
  UserRole as DbUserRole,
} from '@/lib/db/enums'
import { execute, parseJsonArray, queryOne, queryRows, transaction, type PoolConnection, type RowDataPacket } from '@/lib/db/mysql'
import { DEPARTMENTS } from '@/lib/constants'
import { FacultyDataService } from '@/lib/server/faculty-data'
import { DecisionSupportService } from '@/lib/server/decision-support'
import { toDbRole } from '@/lib/server/auth'
import { toCsv } from '@/lib/server/csv'
import type {
  AccessStatus,
  AdminAnalyticsSummary,
  AdminDashboardData,
  AdminDepartmentDetailQuery,
  AdminDepartmentDetailResponse,
  AdminDepartmentDetailStats,
  AdminDepartmentPerformanceItem,
  AdminEngagementItem,
  AdminEngagementListQuery,
  AdminEngagementListResponse,
  AdminFacultyDetail,
  AdminFacultyListItem,
  AdminFacultyListQuery,
  AdminFacultyListResponse,
  AdminFacultyListStats,
  AdminPaginationMeta,
  AdminPublicationItem,
  AdminPublicationListQuery,
  AdminPublicationListResponse,
  AdminResearchListQuery,
  AdminResearchListResponse,
  AdminResearchTitleItem,
  AdminUserListItem,
  Department,
  FacultyInvitePayload,
  FacultyInviteRecord,
  Profile,
  ProfileCompletionStatus,
  ProfileUpdatePayload,
  Publication,
  PublicationFacultyRole,
  User,
  UserRole,
} from '@/lib/types'

type AdminExportKind = 'faculty' | 'publications' | 'engagements' | 'research'

type ExportRow = Record<string, string | number | boolean | null>

const ROLE_FROM_DB: Record<DbUserRole, UserRole> = {
  faculty: 'faculty',
  secondary_admin: 'secondary-admin',
  main_admin: 'main-admin',
}

const DB_TO_APP_EMPLOYMENT: Record<DbEmploymentStatus, Profile['employment_status']> = {
  full_time: 'full-time',
  part_time: 'part-time',
  contract: 'contract',
  emeritus: 'emeritus',
}

function normalizeString(value: string | null | undefined) {
  const nextValue = value?.trim()
  return nextValue ? nextValue : null
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function mapDbRoles(roles: DbUserRole[]) {
  return roles.map((role) => ROLE_FROM_DB[role])
}

function normalizeRoleSet(roles: UserRole[] | undefined, fallback: UserRole[] = ['faculty']) {
  const nextRoles = new Set((roles?.length ? roles : fallback).filter(Boolean))

  if (nextRoles.has('main-admin')) {
    nextRoles.delete('secondary-admin')
  }

  if (nextRoles.size === 0) {
    nextRoles.add('faculty')
  }

  return Array.from(nextRoles)
}

function toAppEmploymentStatus(value: DbEmploymentStatus | string | null | undefined) {
  if (!value) {
    return null
  }

  return DB_TO_APP_EMPLOYMENT[value as DbEmploymentStatus] ?? null
}

function toDbEmploymentStatus(value: Profile['employment_status'] | null | undefined) {
  if (!value) {
    return null
  }

  const map: Record<NonNullable<Profile['employment_status']>, DbEmploymentStatus> = {
    'full-time': DbEmploymentStatus.full_time,
    'part-time': DbEmploymentStatus.part_time,
    contract: DbEmploymentStatus.contract,
    emeritus: DbEmploymentStatus.emeritus,
  }

  return map[value]
}

function toAppAccessStatus(value: DbAccessStatus | string): AccessStatus {
  return value === DbAccessStatus.inactive ? 'inactive' : 'active'
}

function buildPaginationMeta(total: number, page: number, pageSize: number): AdminPaginationMeta {
  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize)
  const nextPage = Math.min(Math.max(page, 1), totalPages)

  return {
    total,
    page: nextPage,
    page_size: pageSize,
    total_pages: totalPages,
  }
}

function iso(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null
}

function dateOnly(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}

function getDepartmentLabel(department: Department) {
  return DEPARTMENTS.find((item) => item.value === department)?.label ?? department
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

interface FacultyUserRow extends RowDataPacket {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  accessStatus: DbAccessStatus
  lastLoginAt: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
  department: Department | null
  specialization: string | null
  employmentStatus: DbEmploymentStatus | null
}

interface InviteRow extends RowDataPacket {
  id: string
  email: string
  name: string | null
  department: Department | null
  employmentStatus: DbEmploymentStatus | null
  inviteStatus: DbFacultyInviteStatus
  linkedUserId: string | null
  createdByUserId: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

interface RoleRow extends RowDataPacket {
  ownerId: string
  role: DbUserRole
}

function toAppUser(row: FacultyUserRow, roles: UserRole[]): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar_url: row.avatarUrl ?? null,
    roles,
  }
}

async function loadRolesForUsers(userIds: string[]) {
  const roleMap = new Map<string, DbUserRole[]>()

  if (userIds.length === 0) {
    return roleMap
  }

  const rows = await queryRows<RoleRow>(
    `
      SELECT user_id AS ownerId, role
      FROM user_role_assignments
      WHERE user_id IN (${userIds.map(() => '?').join(', ')})
    `,
    userIds
  )

  for (const row of rows) {
    const roles = roleMap.get(row.ownerId) ?? []
    roles.push(row.role)
    roleMap.set(row.ownerId, roles)
  }

  return roleMap
}

async function loadRolesForInvites(inviteIds: string[]) {
  const roleMap = new Map<string, DbUserRole[]>()

  if (inviteIds.length === 0) {
    return roleMap
  }

  const rows = await queryRows<RoleRow>(
    `
      SELECT invite_id AS ownerId, role
      FROM faculty_invite_roles
      WHERE invite_id IN (${inviteIds.map(() => '?').join(', ')})
    `,
    inviteIds
  )

  for (const row of rows) {
    const roles = roleMap.get(row.ownerId) ?? []
    roles.push(row.role)
    roleMap.set(row.ownerId, roles)
  }

  return roleMap
}

async function loadFacultyUsers(department?: Department) {
  const params: unknown[] = [DbUserRole.faculty]

  if (department) {
    params.push(department)
  }

  const users = await queryRows<FacultyUserRow>(
    `
      SELECT DISTINCT
        u.id,
        u.email,
        u.name,
        u.avatar_url AS avatarUrl,
        u.access_status AS accessStatus,
        u.last_login_at AS lastLoginAt,
        u.created_at AS createdAt,
        u.updated_at AS updatedAt,
        fp.department,
        fp.specialization,
        fp.employment_status AS employmentStatus
      FROM users AS u
      INNER JOIN user_role_assignments AS ura ON ura.user_id = u.id
      LEFT JOIN faculty_profiles AS fp ON fp.user_id = u.id
      WHERE ura.role = ?
        ${department ? 'AND fp.department = ?' : ''}
      ORDER BY u.name ASC
    `,
    params
  )
  const roles = await loadRolesForUsers(users.map((user) => user.id))

  return users.map((user) => ({
    ...user,
    roles: mapDbRoles(roles.get(user.id) ?? []),
  }))
}

async function loadPendingInvites(department?: Department) {
  const params: unknown[] = [DbFacultyInviteStatus.pending]

  if (department) {
    params.push(department)
  }

  const invites = await queryRows<InviteRow>(
    `
      SELECT
        id,
        email,
        name,
        department,
        employment_status AS employmentStatus,
        invite_status AS inviteStatus,
        linked_user_id AS linkedUserId,
        created_by_user_id AS createdByUserId,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM faculty_invites
      WHERE invite_status = ?
        ${department ? 'AND department = ?' : ''}
      ORDER BY created_at DESC
    `,
    params
  )
  const roles = await loadRolesForInvites(invites.map((invite) => invite.id))

  return invites.map((invite) => ({
    ...invite,
    roles: mapDbRoles(roles.get(invite.id) ?? []),
  }))
}

async function getCountMap(table: string, userIds: string[]) {
  const map = new Map<string, number>()

  if (userIds.length === 0) {
    return map
  }

  const rows = await queryRows<RowDataPacket & { userId: string; count: number }>(
    `
      SELECT user_id AS userId, COUNT(*) AS count
      FROM ${table}
      WHERE user_id IN (${userIds.map(() => '?').join(', ')})
      GROUP BY user_id
    `,
    userIds
  )

  for (const row of rows) {
    map.set(row.userId, Number(row.count))
  }

  return map
}

async function getPublicationCountMaps(userIds: string[]) {
  const publicationCounts = new Map<string, number>()
  const indexedPublicationCounts = new Map<string, number>()

  if (userIds.length === 0) {
    return { publicationCounts, indexedPublicationCounts }
  }

  const rows = await queryRows<RowDataPacket & {
    userId: string
    count: number
    indexedCount: number
  }>(
    `
      SELECT
        user_id AS userId,
        COUNT(*) AS count,
        SUM(CASE WHEN JSON_LENGTH(indexing) > 0 THEN 1 ELSE 0 END) AS indexedCount
      FROM publications
      WHERE user_id IN (${userIds.map(() => '?').join(', ')})
      GROUP BY user_id
    `,
    userIds
  )

  for (const row of rows) {
    publicationCounts.set(row.userId, Number(row.count))
    indexedPublicationCounts.set(row.userId, Number(row.indexedCount ?? 0))
  }

  return { publicationCounts, indexedPublicationCounts }
}

function calculateCompletionStatus(args: {
  department: Department | null
  employment_status: Profile['employment_status']
  educationCount: number
  publicationsCount: number
  engagementsCount: number
  researchTitlesCount: number
}): ProfileCompletionStatus {
  const hasProfile = Boolean(args.department && args.employment_status)
  const hasEducation = args.educationCount > 0
  const hasPublications = args.publicationsCount > 0
  const hasEngagements = args.engagementsCount > 0
  const hasResearchTitles = args.researchTitlesCount > 0
  const sections = [hasProfile, hasEducation, hasPublications, hasEngagements, hasResearchTitles]

  return {
    hasProfile,
    hasEducation,
    hasPublications,
    hasEngagements,
    hasResearchTitles,
    score: Math.round((sections.filter(Boolean).length / sections.length) * 100),
    educationCount: args.educationCount,
    publicationsCount: args.publicationsCount,
    engagementsCount: args.engagementsCount,
    researchTitlesCount: args.researchTitlesCount,
  }
}

async function buildFacultyListItems(department?: Department) {
  const [users, pendingInvites] = await Promise.all([
    loadFacultyUsers(department),
    loadPendingInvites(department),
  ])
  const userIds = users.map((user) => user.id)
  const [educationCounts, engagementCounts, researchTitleCounts, publicationMaps] = await Promise.all([
    getCountMap('education_entries', userIds),
    getCountMap('engagements', userIds),
    getCountMap('research_titles', userIds),
    getPublicationCountMaps(userIds),
  ])

  const userItems: AdminFacultyListItem[] = users.map((user) => {
    const educationCount = educationCounts.get(user.id) ?? 0
    const publicationsCount = publicationMaps.publicationCounts.get(user.id) ?? 0
    const engagementsCount = engagementCounts.get(user.id) ?? 0
    const researchTitlesCount = researchTitleCounts.get(user.id) ?? 0
    const completion = calculateCompletionStatus({
      department: user.department,
      employment_status: toAppEmploymentStatus(user.employmentStatus),
      educationCount,
      publicationsCount,
      engagementsCount,
      researchTitlesCount,
    })

    return {
      id: user.id,
      recordType: 'user',
      email: user.email,
      name: user.name,
      department: user.department,
      specialization: user.specialization,
      employment_status: toAppEmploymentStatus(user.employmentStatus),
      roles: user.roles,
      access_status: toAppAccessStatus(user.accessStatus),
      invite_status: null,
      linked_user_id: null,
      photo_url: user.avatarUrl ?? null,
      completion_score: completion.score,
      education_count: educationCount,
      publications_count: publicationsCount,
      indexed_publications_count: publicationMaps.indexedPublicationCounts.get(user.id) ?? 0,
      engagements_count: engagementsCount,
      research_titles_count: researchTitlesCount,
      last_login_at: iso(user.lastLoginAt),
      created_at: iso(user.createdAt) ?? new Date().toISOString(),
      updated_at: iso(user.updatedAt) ?? new Date().toISOString(),
    }
  })

  const inviteItems: AdminFacultyListItem[] = pendingInvites.map((invite) => ({
    id: invite.id,
    recordType: 'invite',
    email: invite.email,
    name: invite.name,
    department: invite.department,
    specialization: null,
    employment_status: toAppEmploymentStatus(invite.employmentStatus),
    roles: invite.roles,
    access_status: null,
    invite_status: invite.inviteStatus,
    linked_user_id: invite.linkedUserId,
    photo_url: null,
    completion_score: null,
    education_count: 0,
    publications_count: 0,
    indexed_publications_count: 0,
    engagements_count: 0,
    research_titles_count: 0,
    last_login_at: null,
    created_at: iso(invite.createdAt) ?? new Date().toISOString(),
    updated_at: iso(invite.updatedAt) ?? new Date().toISOString(),
  }))

  return [...inviteItems, ...userItems]
}

function matchesFacultyQuery(item: AdminFacultyListItem, query: AdminFacultyListQuery) {
  if (query.department && query.department !== 'all' && item.department !== query.department) {
    return false
  }

  if (query.status === 'active' && item.access_status !== 'active') {
    return false
  }

  if (query.status === 'inactive' && item.access_status !== 'inactive') {
    return false
  }

  if (query.status === 'pending' && item.recordType !== 'invite') {
    return false
  }

  const search = normalizeString(query.search)?.toLowerCase()

  if (!search) {
    return true
  }

  return [
    item.name,
    item.email,
    item.department,
    item.specialization,
  ].some((value) => value?.toLowerCase().includes(search))
}

function calculateFacultyListStats(items: AdminFacultyListItem[]): AdminFacultyListStats {
  const users = items.filter((item) => item.recordType === 'user')
  const completionValues = users
    .map((item) => item.completion_score)
    .filter((value): value is number => typeof value === 'number')

  return {
    total: items.length,
    active: users.filter((item) => item.access_status === 'active').length,
    pending: items.filter((item) => item.recordType === 'invite').length,
    avgCompletion: completionValues.length
      ? Math.round(completionValues.reduce((sum, value) => sum + value, 0) / completionValues.length)
      : 0,
  }
}

function mapInviteRecord(invite: InviteRow & { roles: UserRole[] }): FacultyInviteRecord {
  return {
    id: invite.id,
    email: invite.email,
    name: invite.name,
    department: invite.department,
    employment_status: toAppEmploymentStatus(invite.employmentStatus),
    invite_status: invite.inviteStatus,
    linked_user_id: invite.linkedUserId,
    created_by_user_id: invite.createdByUserId,
    roles: invite.roles,
    created_at: iso(invite.createdAt) ?? new Date().toISOString(),
    updated_at: iso(invite.updatedAt) ?? new Date().toISOString(),
  }
}

async function syncInviteRoles(inviteId: string, roles: UserRole[], executor?: PoolConnection) {
  await execute('DELETE FROM faculty_invite_roles WHERE invite_id = ?', [inviteId], executor)

  for (const role of roles) {
    await execute(
      'INSERT IGNORE INTO faculty_invite_roles (invite_id, role) VALUES (?, ?)',
      [inviteId, toDbRole(role)],
      executor
    )
  }
}

async function getUserByEmail(email: string, executor?: PoolConnection) {
  return queryOne<FacultyUserRow>(
    `
      SELECT
        u.id,
        u.email,
        u.name,
        u.avatar_url AS avatarUrl,
        u.access_status AS accessStatus,
        u.last_login_at AS lastLoginAt,
        u.created_at AS createdAt,
        u.updated_at AS updatedAt,
        fp.department,
        fp.specialization,
        fp.employment_status AS employmentStatus
      FROM users AS u
      LEFT JOIN faculty_profiles AS fp ON fp.user_id = u.id
      WHERE u.email = ?
      LIMIT 1
    `,
    [email],
    executor
  )
}

async function getUserById(userId: string, executor?: PoolConnection) {
  return queryOne<FacultyUserRow>(
    `
      SELECT
        u.id,
        u.email,
        u.name,
        u.avatar_url AS avatarUrl,
        u.access_status AS accessStatus,
        u.last_login_at AS lastLoginAt,
        u.created_at AS createdAt,
        u.updated_at AS updatedAt,
        fp.department,
        fp.specialization,
        fp.employment_status AS employmentStatus
      FROM users AS u
      LEFT JOIN faculty_profiles AS fp ON fp.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
    `,
    [userId],
    executor
  )
}

async function adminUserListItem(userId: string) {
  const user = await getUserById(userId)

  if (!user) {
    throw new Error('User not found.')
  }

  const roles = await loadRolesForUsers([user.id])

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: mapDbRoles(roles.get(user.id) ?? []),
    access_status: toAppAccessStatus(user.accessStatus),
    last_login_at: iso(user.lastLoginAt),
    created_at: iso(user.createdAt) ?? new Date().toISOString(),
    updated_at: iso(user.updatedAt) ?? new Date().toISOString(),
    photo_url: user.avatarUrl ?? null,
  } satisfies AdminUserListItem
}

async function assertNotLastMainAdmin(userId: string) {
  const target = await queryOne<RowDataPacket & { count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM user_role_assignments
      WHERE role = ?
    `,
    [DbUserRole.main_admin]
  )
  const hasMainRole = await queryOne<RowDataPacket & { id: string }>(
    `
      SELECT user_id AS id
      FROM user_role_assignments
      WHERE user_id = ?
        AND role = ?
      LIMIT 1
    `,
    [userId, DbUserRole.main_admin]
  )

  if (hasMainRole && Number(target?.count ?? 0) <= 1) {
    throw new Error('At least one main administrator must remain.')
  }
}

async function seedOrLinkInvite(args: {
  createdByUserId: string
  payload: FacultyInvitePayload
}) {
  const email = normalizeEmail(args.payload.email)
  const roles = normalizeRoleSet(args.payload.roles, ['faculty'])
  const existingUser = await getUserByEmail(email)

  if (existingUser) {
    await transaction(async (connection) => {
      for (const role of roles) {
        await execute(
          'INSERT IGNORE INTO user_role_assignments (user_id, role) VALUES (?, ?)',
          [existingUser.id, toDbRole(role)],
          connection
        )
      }

      await execute(
        `
          INSERT INTO faculty_profiles (
            user_id,
            department,
            employment_status
          )
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            department = COALESCE(department, VALUES(department)),
            employment_status = COALESCE(employment_status, VALUES(employment_status))
        `,
        [
          existingUser.id,
          args.payload.department ?? null,
          toDbEmploymentStatus(args.payload.employment_status),
        ],
        connection
      )
    })

    return adminUserListItem(existingUser.id)
  }

  const inviteId = randomUUID()

  await transaction(async (connection) => {
    await execute(
      `
        INSERT INTO faculty_invites (
          id,
          email,
          name,
          department,
          employment_status,
          invite_status,
          created_by_user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          department = VALUES(department),
          employment_status = VALUES(employment_status),
          invite_status = 'pending',
          created_by_user_id = VALUES(created_by_user_id)
      `,
      [
        inviteId,
        email,
        normalizeString(args.payload.name),
        args.payload.department ?? null,
        toDbEmploymentStatus(args.payload.employment_status),
        DbFacultyInviteStatus.pending,
        args.createdByUserId,
      ],
      connection
    )

    const invite = await queryOne<RowDataPacket & { id: string }>(
      'SELECT id FROM faculty_invites WHERE email = ? LIMIT 1',
      [email],
      connection
    )

    await syncInviteRoles(invite?.id ?? inviteId, roles, connection)
  })

  const invites = await loadPendingInvites()
  const savedInvite = invites.find((invite) => invite.email === email)

  if (!savedInvite) {
    throw new Error('Invite was not saved.')
  }

  return mapInviteRecord(savedInvite)
}

async function getDepartmentPerformanceItems() {
  const items = await buildFacultyListItems()

  return DEPARTMENTS.map(({ value, label }) => {
    const departmentItems = items.filter((item) => item.recordType === 'user' && item.department === value)
    const activeFacultyCount = departmentItems.filter((item) => item.access_status === 'active').length
    const avgCompletionScore = departmentItems.length
      ? Math.round(departmentItems.reduce((sum, item) => sum + (item.completion_score ?? 0), 0) / departmentItems.length)
      : 0

    return {
      department: value,
      label,
      facultyCount: departmentItems.length,
      activeFacultyCount,
      publicationsCount: departmentItems.reduce((sum, item) => sum + item.publications_count, 0),
      indexedPublicationsCount: departmentItems.reduce((sum, item) => sum + item.indexed_publications_count, 0),
      engagementsCount: departmentItems.reduce((sum, item) => sum + item.engagements_count, 0),
      researchTitlesCount: departmentItems.reduce((sum, item) => sum + item.research_titles_count, 0),
      avgCompletionScore,
    } satisfies AdminDepartmentPerformanceItem
  })
}

async function countRows(sql: string, params: unknown[] = []) {
  const row = await queryOne<RowDataPacket & { count: number }>(sql, params)
  return Number(row?.count ?? 0)
}

function publicationLikeClause(search: string | undefined, params: unknown[]) {
  const normalized = normalizeString(search)

  if (!normalized) {
    return ''
  }

  const pattern = `%${normalized}%`
  params.push(pattern, pattern, pattern, pattern)
  return 'AND (p.title LIKE ? OR p.venue LIKE ? OR u.name LIKE ? OR u.email LIKE ?)'
}

function mapPublicationRow(row: RowDataPacket & Record<string, unknown>): AdminPublicationItem {
  const publication: Publication = {
    id: String(row.id),
    profile_id: String(row.userId),
    title: String(row.title),
    role: null,
    journal: String(row.venue ?? ''),
    year: Number(row.year),
    link: row.doi ? `https://doi.org/${row.doi}` : (row.externalUrl as string | null) ?? null,
    status: row.status as Publication['status'],
    indexed: parseJsonArray(row.indexing).join(', '),
    sdgs: parseJsonArray(row.sdgGoals),
    display_order: Number(row.displayOrder ?? 1),
    type: row.type as Publication['type'],
    authors: parseJsonArray(row.authors),
    author_count: Number(row.authorCount ?? 1),
    indexing: parseJsonArray(row.indexing),
    sdgGoals: parseJsonArray(row.sdgGoals),
    venue: String(row.venue ?? ''),
    volume: (row.volume as string | null) ?? null,
    issue: (row.issue as string | null) ?? null,
    page_numbers: (row.pageNumbers as string | null) ?? null,
    doi: (row.doi as string | null) ?? '',
    abstract: (row.abstract as string | null) ?? '',
    external_url: (row.externalUrl as string | null) ?? null,
    quartile_ranking: row.quartileRanking as Publication['quartile_ranking'],
    open_access: row.openAccess === null ? null : Boolean(row.openAccess),
    faculty_role: toPublicationFacultyRole(row.facultyRole as string | null),
    is_lead_corresponding: row.isLeadCorresponding === null ? null : Boolean(row.isLeadCorresponding),
    institution_affiliated: Boolean(row.institutionAffiliated),
    citations: Number(row.citations ?? 0),
    proof_path: (row.proofPath as string | null) ?? null,
    proof_url: null,
    owner_id: String(row.userId),
    owner_name: String(row.facultyName ?? ''),
    owner_email: String(row.facultyEmail ?? ''),
    owner_avatar_url: (row.facultyAvatarUrl as string | null) ?? null,
    co_author_user_ids: [],
    co_author_contributions: [],
    co_authors: [],
    can_manage: true,
    is_shared: false,
  }

  return {
    ...publication,
    faculty_id: String(row.userId),
    faculty_name: String(row.facultyName ?? ''),
    faculty_email: String(row.facultyEmail ?? ''),
    faculty_avatar_url: (row.facultyAvatarUrl as string | null) ?? null,
    department: (row.department as Department | null) ?? null,
  }
}

async function queryPublicationRows(query: AdminPublicationListQuery = {}, paginated = true) {
  const page = Math.max(query.page ?? 1, 1)
  const pageSize = query.page_size ?? 20
  const params: unknown[] = []
  let where = 'WHERE 1 = 1 '

  where += publicationLikeClause(query.search, params)

  if (query.type && query.type !== 'all') {
    where += ' AND p.type = ?'
    params.push(query.type)
  }

  if (query.year && query.year !== 'all') {
    where += ' AND p.year = ?'
    params.push(Number(query.year))
  }

  if (query.indexing && query.indexing !== 'all') {
    if (query.indexing === 'non-indexed') {
      where += ' AND JSON_LENGTH(p.indexing) = 0'
    } else {
      where += ' AND JSON_CONTAINS(p.indexing, JSON_QUOTE(?))'
      params.push(query.indexing)
    }
  }

  const limitClause = paginated ? 'LIMIT ? OFFSET ?' : ''
  const rows = await queryRows<RowDataPacket & Record<string, unknown>>(
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
        u.name AS facultyName,
        u.email AS facultyEmail,
        u.avatar_url AS facultyAvatarUrl,
        fp.department
      FROM publications AS p
      INNER JOIN users AS u ON u.id = p.user_id
      LEFT JOIN faculty_profiles AS fp ON fp.user_id = u.id
      ${where}
      ORDER BY p.year DESC, p.created_at DESC
      ${limitClause}
    `,
    paginated ? [...params, pageSize, (page - 1) * pageSize] : params
  )
  const total = await countRows(
    `
      SELECT COUNT(*) AS count
      FROM publications AS p
      INNER JOIN users AS u ON u.id = p.user_id
      LEFT JOIN faculty_profiles AS fp ON fp.user_id = u.id
      ${where}
    `,
    params
  )

  return {
    rows,
    total,
  }
}

function engagementLikeClause(search: string | undefined, params: unknown[]) {
  const normalized = normalizeString(search)

  if (!normalized) {
    return ''
  }

  const pattern = `%${normalized}%`
  params.push(pattern, pattern, pattern, pattern)
  return 'AND (e.title LIKE ? OR e.organization LIKE ? OR u.name LIKE ? OR u.email LIKE ?)'
}

function mapEngagementRow(row: RowDataPacket & Record<string, unknown>): AdminEngagementItem {
  return {
    id: String(row.id),
    profile_id: String(row.userId),
    title: String(row.title),
    role: null,
    type: row.type as AdminEngagementItem['type'],
    host: String(row.organization ?? ''),
    location: null,
    year: Number(dateOnly(row.startDate as Date | string).slice(0, 4)) || null,
    certificate_path: (row.certificatePath as string | null) ?? null,
    certificate_url: null,
    display_order: Number(row.displayOrder ?? 1),
    organization: String(row.organization ?? ''),
    status: row.status as AdminEngagementItem['status'],
    description: String(row.description ?? ''),
    startDate: dateOnly(row.startDate as Date | string),
    endDate: dateOnly(row.endDate as Date | string | null),
    beneficiaries: Number(row.beneficiaries ?? 0),
    faculty_id: String(row.userId),
    faculty_name: String(row.facultyName ?? ''),
    faculty_email: String(row.facultyEmail ?? ''),
    faculty_avatar_url: (row.facultyAvatarUrl as string | null) ?? null,
    department: (row.department as Department | null) ?? null,
  }
}

async function queryEngagementRows(query: AdminEngagementListQuery = {}, paginated = true) {
  const page = Math.max(query.page ?? 1, 1)
  const pageSize = query.page_size ?? 20
  const params: unknown[] = []
  let where = 'WHERE 1 = 1 '

  where += engagementLikeClause(query.search, params)

  if (query.type && query.type !== 'all') {
    where += ' AND e.type = ?'
    params.push(query.type)
  }

  if (query.status && query.status !== 'all') {
    where += ' AND e.status = ?'
    params.push(query.status)
  }

  const limitClause = paginated ? 'LIMIT ? OFFSET ?' : ''
  const rows = await queryRows<RowDataPacket & Record<string, unknown>>(
    `
      SELECT
        e.id,
        e.user_id AS userId,
        e.title,
        e.type,
        e.organization,
        e.status,
        e.start_date AS startDate,
        e.end_date AS endDate,
        e.description,
        e.beneficiaries,
        e.certificate_path AS certificatePath,
        e.display_order AS displayOrder,
        u.name AS facultyName,
        u.email AS facultyEmail,
        u.avatar_url AS facultyAvatarUrl,
        fp.department
      FROM engagements AS e
      INNER JOIN users AS u ON u.id = e.user_id
      LEFT JOIN faculty_profiles AS fp ON fp.user_id = u.id
      ${where}
      ORDER BY e.start_date DESC, e.created_at DESC
      ${limitClause}
    `,
    paginated ? [...params, pageSize, (page - 1) * pageSize] : params
  )
  const total = await countRows(
    `
      SELECT COUNT(*) AS count
      FROM engagements AS e
      INNER JOIN users AS u ON u.id = e.user_id
      LEFT JOIN faculty_profiles AS fp ON fp.user_id = u.id
      ${where}
    `,
    params
  )

  return { rows, total }
}

function researchLikeClause(search: string | undefined, params: unknown[]) {
  const normalized = normalizeString(search)

  if (!normalized) {
    return ''
  }

  const pattern = `%${normalized}%`
  params.push(pattern, pattern)
  return 'AND (r.title LIKE ? OR u.name LIKE ?)'
}

function mapResearchRow(row: RowDataPacket & Record<string, unknown>): AdminResearchTitleItem {
  return {
    id: String(row.id),
    profile_id: String(row.userId),
    title: String(row.title),
    role: null,
    year: Number(dateOnly(row.startDate as Date | string).slice(0, 4)) || null,
    funding_type: null,
    funding_agency: (row.fundingSource as string | null) ?? null,
    status: row.status as AdminResearchTitleItem['status'],
    sdgs: parseJsonArray(row.sdgGoals),
    paper_path: (row.paperPath as string | null) ?? null,
    paper_url: null,
    display_order: Number(row.displayOrder ?? 1),
    researchers: parseJsonArray(row.researchers),
    fundingSource: (row.fundingSource as string | null) ?? '',
    fundingAmount: Number(row.fundingAmount ?? 0),
    description: String(row.description ?? ''),
    progress: Number(row.progress ?? 0),
    startDate: dateOnly(row.startDate as Date | string),
    endDate: dateOnly(row.endDate as Date | string | null),
    sdgGoals: parseJsonArray(row.sdgGoals),
    faculty_id: String(row.userId),
    faculty_name: String(row.facultyName ?? ''),
    faculty_email: String(row.facultyEmail ?? ''),
    faculty_avatar_url: (row.facultyAvatarUrl as string | null) ?? null,
    department: (row.department as Department | null) ?? null,
  }
}

async function queryResearchRows(query: AdminResearchListQuery = {}, paginated = true) {
  const page = Math.max(query.page ?? 1, 1)
  const pageSize = query.page_size ?? 20
  const params: unknown[] = []
  let where = 'WHERE 1 = 1 '

  where += researchLikeClause(query.search, params)

  if (query.status && query.status !== 'all') {
    where += ' AND r.status = ?'
    params.push(query.status)
  }

  const limitClause = paginated ? 'LIMIT ? OFFSET ?' : ''
  const rows = await queryRows<RowDataPacket & Record<string, unknown>>(
    `
      SELECT
        r.id,
        r.user_id AS userId,
        r.title,
        r.status,
        r.researchers,
        r.start_date AS startDate,
        r.end_date AS endDate,
        r.funding_source AS fundingSource,
        r.funding_amount AS fundingAmount,
        r.description,
        r.progress,
        r.sdg_goals AS sdgGoals,
        r.paper_path AS paperPath,
        r.display_order AS displayOrder,
        u.name AS facultyName,
        u.email AS facultyEmail,
        u.avatar_url AS facultyAvatarUrl,
        fp.department
      FROM research_titles AS r
      INNER JOIN users AS u ON u.id = r.user_id
      LEFT JOIN faculty_profiles AS fp ON fp.user_id = u.id
      ${where}
      ORDER BY r.start_date DESC, r.created_at DESC
      ${limitClause}
    `,
    paginated ? [...params, pageSize, (page - 1) * pageSize] : params
  )
  const total = await countRows(
    `
      SELECT COUNT(*) AS count
      FROM research_titles AS r
      INNER JOIN users AS u ON u.id = r.user_id
      LEFT JOIN faculty_profiles AS fp ON fp.user_id = u.id
      ${where}
    `,
    params
  )

  return { rows, total }
}

export const AdminDataService = {
  async getDashboardData(
    department?: Department
  ): Promise<Omit<AdminDashboardData, 'decisionSupportSummary'>> {
    const items = await buildFacultyListItems(department)
    const users = items.filter((item) => item.recordType === 'user')
    const completionValues = users
      .map((item) => item.completion_score)
      .filter((value): value is number => typeof value === 'number')
    const params = department ? [department] : []
    const departmentWhere = department ? 'AND fp.department = ?' : ''
    const [
      pendingInvites,
      totalPublications,
      indexedPublications,
      totalEngagements,
      activeEngagements,
      totalResearchTitles,
      ongoingResearchTitles,
      recentPublications,
      recentEngagements,
      recentResearch,
    ] = await Promise.all([
      countRows(
        `SELECT COUNT(*) AS count FROM faculty_invites WHERE invite_status = 'pending' ${department ? 'AND department = ?' : ''}`,
        params
      ),
      countRows(
        `
          SELECT COUNT(*) AS count
          FROM publications AS p
          INNER JOIN faculty_profiles AS fp ON fp.user_id = p.user_id
          WHERE 1 = 1 ${departmentWhere}
        `,
        params
      ),
      countRows(
        `
          SELECT COUNT(*) AS count
          FROM publications AS p
          INNER JOIN faculty_profiles AS fp ON fp.user_id = p.user_id
          WHERE JSON_LENGTH(p.indexing) > 0 ${departmentWhere}
        `,
        params
      ),
      countRows(
        `
          SELECT COUNT(*) AS count
          FROM engagements AS e
          INNER JOIN faculty_profiles AS fp ON fp.user_id = e.user_id
          WHERE 1 = 1 ${departmentWhere}
        `,
        params
      ),
      countRows(
        `
          SELECT COUNT(*) AS count
          FROM engagements AS e
          INNER JOIN faculty_profiles AS fp ON fp.user_id = e.user_id
          WHERE e.status = 'ongoing' ${departmentWhere}
        `,
        params
      ),
      countRows(
        `
          SELECT COUNT(*) AS count
          FROM research_titles AS r
          INNER JOIN faculty_profiles AS fp ON fp.user_id = r.user_id
          WHERE 1 = 1 ${departmentWhere}
        `,
        params
      ),
      countRows(
        `
          SELECT COUNT(*) AS count
          FROM research_titles AS r
          INNER JOIN faculty_profiles AS fp ON fp.user_id = r.user_id
          WHERE r.status = 'ongoing' ${departmentWhere}
        `,
        params
      ),
      queryRows<RowDataPacket & Record<string, unknown>>(
        `
          SELECT p.id, p.title, p.user_id AS userId, u.name AS userName, u.avatar_url AS userAvatarUrl, p.created_at AS createdAt
          FROM publications AS p
          INNER JOIN users AS u ON u.id = p.user_id
          LEFT JOIN faculty_profiles AS fp ON fp.user_id = p.user_id
          WHERE 1 = 1 ${departmentWhere}
          ORDER BY p.created_at DESC
          LIMIT 5
        `,
        params
      ),
      queryRows<RowDataPacket & Record<string, unknown>>(
        `
          SELECT e.id, e.title, e.user_id AS userId, u.name AS userName, u.avatar_url AS userAvatarUrl, e.created_at AS createdAt
          FROM engagements AS e
          INNER JOIN users AS u ON u.id = e.user_id
          LEFT JOIN faculty_profiles AS fp ON fp.user_id = e.user_id
          WHERE 1 = 1 ${departmentWhere}
          ORDER BY e.created_at DESC
          LIMIT 5
        `,
        params
      ),
      queryRows<RowDataPacket & Record<string, unknown>>(
        `
          SELECT r.id, r.title, r.user_id AS userId, u.name AS userName, u.avatar_url AS userAvatarUrl, r.created_at AS createdAt
          FROM research_titles AS r
          INNER JOIN users AS u ON u.id = r.user_id
          LEFT JOIN faculty_profiles AS fp ON fp.user_id = r.user_id
          WHERE 1 = 1 ${departmentWhere}
          ORDER BY r.created_at DESC
          LIMIT 5
        `,
        params
      ),
    ])
    const recentActivity = [
      ...recentPublications.map((row) => ({ row, type: 'publication' as const })),
      ...recentEngagements.map((row) => ({ row, type: 'engagement' as const })),
      ...recentResearch.map((row) => ({ row, type: 'research' as const })),
    ]
      .sort((left, right) => String(right.row.createdAt).localeCompare(String(left.row.createdAt)))
      .slice(0, 10)
      .map(({ row, type }) => ({
        id: String(row.id),
        type,
        title: String(row.title),
        user_id: String(row.userId),
        user_name: String(row.userName),
        user_avatar_url: (row.userAvatarUrl as string | null) ?? null,
        created_at: iso(row.createdAt as Date | string) ?? new Date().toISOString(),
      }))
    const pendingActions = items
      .filter((item) => item.recordType === 'invite' || (item.completion_score ?? 100) < 100 || item.access_status === 'inactive')
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        recordType: item.recordType,
        title: item.name ?? item.email,
        subtitle: item.email,
        issue: item.recordType === 'invite'
          ? 'Pending invite'
          : item.access_status === 'inactive'
            ? 'Inactive account'
            : 'Incomplete profile',
        href: item.recordType === 'user' ? `/admin/faculty/${item.id}` : null,
        created_at: item.created_at,
      }))

    return {
      totalFaculty: users.length,
      activeFaculty: users.filter((user) => user.access_status === 'active').length,
      inactiveFaculty: users.filter((user) => user.access_status === 'inactive').length,
      pendingInvites,
      totalPublications,
      indexedPublications,
      totalEngagements,
      activeEngagements,
      totalResearchTitles,
      ongoingResearchTitles,
      avgCompletionScore: completionValues.length
        ? Math.round(completionValues.reduce((sum, value) => sum + value, 0) / completionValues.length)
        : 0,
      departmentPerformance: (await getDepartmentPerformanceItems()).sort(
        (left, right) => right.publicationsCount - left.publicationsCount
      ),
      recentActivity,
      pendingActions,
    }
  },

  async listFaculty(): Promise<AdminFacultyListItem[]> {
    return buildFacultyListItems()
  },

  async getFacultyListPage(query: AdminFacultyListQuery = {}): Promise<AdminFacultyListResponse> {
    const requestedPage = query.page ?? 1
    const pageSize = query.page_size ?? 20
    const allItems = await buildFacultyListItems(
      query.department && query.department !== 'all' ? query.department : undefined
    )
    const filteredItems = allItems.filter((item) => matchesFacultyQuery(item, query))
    const pagination = buildPaginationMeta(filteredItems.length, requestedPage, pageSize)
    const start = (pagination.page - 1) * pageSize

    return {
      ...pagination,
      items: filteredItems.slice(start, start + pageSize),
      stats: calculateFacultyListStats(filteredItems),
    }
  },

  async getFacultyDetail(userId: string): Promise<AdminFacultyDetail | null> {
    const target = await getUserById(userId)

    if (!target) {
      return null
    }

    const roleMap = await loadRolesForUsers([userId])
    const roles = mapDbRoles(roleMap.get(userId) ?? [])

    if (!roles.includes('faculty')) {
      return null
    }

    const user = toAppUser(target, roles)
    const [profile, completion, education, publications, engagements, researchTitles] = await Promise.all([
      FacultyDataService.getMyProfile(user),
      FacultyDataService.getProfileCompletion(userId),
      FacultyDataService.listMyEducation(userId),
      FacultyDataService.listMyPublications(userId),
      FacultyDataService.listMyEngagements(userId),
      FacultyDataService.listMyResearchTitles(userId),
    ])

    return {
      profile,
      roles,
      access_status: toAppAccessStatus(target.accessStatus),
      completion,
      education,
      publications,
      engagements,
      researchTitles,
    }
  },

  async updateFacultyProfile(userId: string, payload: ProfileUpdatePayload) {
    const target = await getUserById(userId)

    if (!target) {
      throw new Error('Faculty user not found.')
    }

    const roleMap = await loadRolesForUsers([userId])
    return FacultyDataService.updateMyProfile(toAppUser(target, mapDbRoles(roleMap.get(userId) ?? [])), payload)
  },

  async setFacultyAccessStatus(actorUserId: string, userId: string, accessStatus: AccessStatus) {
    if (actorUserId === userId && accessStatus === 'inactive') {
      throw new Error('You cannot deactivate your own account.')
    }

    if (accessStatus === 'inactive') {
      await assertNotLastMainAdmin(userId)
    }

    await execute(
      'UPDATE users SET access_status = ? WHERE id = ?',
      [accessStatus === 'active' ? DbAccessStatus.active : DbAccessStatus.inactive, userId]
    )

    return adminUserListItem(userId)
  },

  async listInvites(): Promise<FacultyInviteRecord[]> {
    return (await loadPendingInvites()).map(mapInviteRecord)
  },

  async createFacultyInvite(createdByUserId: string, payload: FacultyInvitePayload) {
    return seedOrLinkInvite({
      createdByUserId,
      payload: {
        ...payload,
        roles: normalizeRoleSet(payload.roles, ['faculty']),
      },
    })
  },

  async updateInvite(inviteId: string, createdByUserId: string, payload: FacultyInvitePayload) {
    const existing = await queryOne<InviteRow>(
      `
        SELECT
          id,
          email,
          name,
          department,
          employment_status AS employmentStatus,
          invite_status AS inviteStatus,
          linked_user_id AS linkedUserId,
          created_by_user_id AS createdByUserId,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM faculty_invites
        WHERE id = ?
        LIMIT 1
      `,
      [inviteId]
    )

    if (!existing || existing.inviteStatus !== DbFacultyInviteStatus.pending) {
      throw new Error('Pending invite not found.')
    }

    await transaction(async (connection) => {
      await execute(
        `
          UPDATE faculty_invites
          SET email = ?,
            name = ?,
            department = ?,
            employment_status = ?,
            created_by_user_id = ?
          WHERE id = ?
        `,
        [
          payload.email ? normalizeEmail(payload.email) : existing.email,
          payload.name !== undefined ? normalizeString(payload.name) : existing.name,
          payload.department !== undefined ? payload.department : existing.department,
          payload.employment_status === undefined
            ? existing.employmentStatus
            : toDbEmploymentStatus(payload.employment_status),
          createdByUserId,
          inviteId,
        ],
        connection
      )
      await syncInviteRoles(inviteId, normalizeRoleSet(payload.roles, ['faculty']), connection)
    })

    const updated = (await loadPendingInvites()).find((invite) => invite.id === inviteId)

    if (!updated) {
      throw new Error('Invite was not saved.')
    }

    return mapInviteRecord(updated)
  },

  async cancelInvite(inviteId: string) {
    const result = await execute(
      `
        UPDATE faculty_invites
        SET invite_status = ?
        WHERE id = ?
          AND invite_status = ?
      `,
      [DbFacultyInviteStatus.cancelled, inviteId, DbFacultyInviteStatus.pending]
    )

    return result.affectedRows > 0
  },

  async listAdminUsers(): Promise<AdminUserListItem[]> {
    const rows = await queryRows<RowDataPacket & { id: string; name: string }>(
      `
        SELECT DISTINCT
          u.id,
          u.name
        FROM users AS u
        INNER JOIN user_role_assignments AS ura ON ura.user_id = u.id
        WHERE ura.role IN (?, ?)
        ORDER BY u.name ASC
      `,
      [DbUserRole.main_admin, DbUserRole.secondary_admin]
    )

    return Promise.all(rows.map((row) => adminUserListItem(row.id)))
  },

  async upsertAdminUser(args: {
    createdByUserId: string
    email: string
    role: Extract<UserRole, 'main-admin' | 'secondary-admin'>
    includeFaculty?: boolean
  }) {
    const email = normalizeEmail(args.email)
    const existingUser = await getUserByEmail(email)

    if (!existingUser) {
      return seedOrLinkInvite({
        createdByUserId: args.createdByUserId,
        payload: {
          email,
          roles: args.includeFaculty ? ['faculty', args.role] : [args.role],
        },
      })
    }

    return this.updateAdminRole({
      actorUserId: args.createdByUserId,
      userId: existingUser.id,
      role: args.role,
      includeFaculty: args.includeFaculty,
    })
  },

  async updateAdminRole(args: {
    actorUserId: string
    userId: string
    role: Extract<UserRole, 'main-admin' | 'secondary-admin'>
    includeFaculty?: boolean
  }) {
    if (args.userId === args.actorUserId && args.role !== 'main-admin') {
      await assertNotLastMainAdmin(args.userId)
    }

    const roleMap = await loadRolesForUsers([args.userId])
    const existingRoles = mapDbRoles(roleMap.get(args.userId) ?? [])
    const hasFaculty = existingRoles.includes('faculty')
    const nextRoles = normalizeRoleSet(
      args.includeFaculty === true
        ? ['faculty', args.role]
        : args.includeFaculty === false
          ? [args.role]
          : hasFaculty
            ? ['faculty', args.role]
            : [args.role]
    )

    if (existingRoles.includes('main-admin') && args.role !== 'main-admin') {
      await assertNotLastMainAdmin(args.userId)
    }

    await transaction(async (connection) => {
      await execute(
        `
          DELETE FROM user_role_assignments
          WHERE user_id = ?
            AND role IN (?, ?, ?)
        `,
        [args.userId, DbUserRole.main_admin, DbUserRole.secondary_admin, DbUserRole.faculty],
        connection
      )

      for (const role of nextRoles) {
        await execute(
          'INSERT IGNORE INTO user_role_assignments (user_id, role) VALUES (?, ?)',
          [args.userId, toDbRole(role)],
          connection
        )
      }
    })

    return adminUserListItem(args.userId)
  },

  async revokeAdminRoles(actorUserId: string, userId: string) {
    if (actorUserId === userId) {
      await assertNotLastMainAdmin(userId)
    }

    await assertNotLastMainAdmin(userId)
    await execute(
      `
        DELETE FROM user_role_assignments
        WHERE user_id = ?
          AND role IN (?, ?)
      `,
      [userId, DbUserRole.main_admin, DbUserRole.secondary_admin]
    )

    return adminUserListItem(userId)
  },

  async listPublications(): Promise<AdminPublicationItem[]> {
    const { rows } = await queryPublicationRows({}, false)
    return rows.map(mapPublicationRow)
  },

  async listEngagements(): Promise<AdminEngagementItem[]> {
    const { rows } = await queryEngagementRows({}, false)
    return rows.map(mapEngagementRow)
  },

  async listResearchTitles(): Promise<AdminResearchTitleItem[]> {
    const { rows } = await queryResearchRows({}, false)
    return rows.map(mapResearchRow)
  },

  async getPublicationListPage(
    query: AdminPublicationListQuery = {}
  ): Promise<AdminPublicationListResponse> {
    const page = query.page ?? 1
    const pageSize = query.page_size ?? 20
    const [{ rows, total }, statsRows, yearRows] = await Promise.all([
      queryPublicationRows(query, true),
      queryOne<RowDataPacket & { total: number; indexed: number; thisYear: number; totalCitations: number }>(
        `
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN JSON_LENGTH(indexing) > 0 THEN 1 ELSE 0 END) AS indexed,
            SUM(CASE WHEN year = YEAR(CURRENT_DATE()) THEN 1 ELSE 0 END) AS thisYear,
            COALESCE(SUM(citations), 0) AS totalCitations
          FROM publications
        `
      ),
      queryRows<RowDataPacket & { year: number }>('SELECT DISTINCT year FROM publications ORDER BY year DESC'),
    ])

    return {
      ...buildPaginationMeta(total, page, pageSize),
      items: rows.map(mapPublicationRow),
      stats: {
        total: Number(statsRows?.total ?? 0),
        indexed: Number(statsRows?.indexed ?? 0),
        thisYear: Number(statsRows?.thisYear ?? 0),
        totalCitations: Number(statsRows?.totalCitations ?? 0),
      },
      available_years: yearRows.map((row) => Number(row.year)),
    }
  },

  async getEngagementListPage(
    query: AdminEngagementListQuery = {}
  ): Promise<AdminEngagementListResponse> {
    const page = query.page ?? 1
    const pageSize = query.page_size ?? 20
    const [{ rows, total }, stats] = await Promise.all([
      queryEngagementRows(query, true),
      queryOne<RowDataPacket & { total: number; ongoing: number; completed: number; beneficiaries: number }>(
        `
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'ongoing' THEN 1 ELSE 0 END) AS ongoing,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
            COALESCE(SUM(beneficiaries), 0) AS beneficiaries
          FROM engagements
        `
      ),
    ])

    return {
      ...buildPaginationMeta(total, page, pageSize),
      items: rows.map(mapEngagementRow),
      stats: {
        total: Number(stats?.total ?? 0),
        ongoing: Number(stats?.ongoing ?? 0),
        completed: Number(stats?.completed ?? 0),
        beneficiaries: Number(stats?.beneficiaries ?? 0),
      },
    }
  },

  async getResearchListPage(
    query: AdminResearchListQuery = {}
  ): Promise<AdminResearchListResponse> {
    const page = query.page ?? 1
    const pageSize = query.page_size ?? 20
    const [{ rows, total }, stats] = await Promise.all([
      queryResearchRows(query, true),
      queryOne<RowDataPacket & { total: number; ongoing: number; completed: number; totalFunding: number }>(
        `
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'ongoing' THEN 1 ELSE 0 END) AS ongoing,
            SUM(CASE WHEN status IN ('completed', 'published') THEN 1 ELSE 0 END) AS completed,
            COALESCE(SUM(funding_amount), 0) AS totalFunding
          FROM research_titles
        `
      ),
    ])

    return {
      ...buildPaginationMeta(total, page, pageSize),
      items: rows.map(mapResearchRow),
      stats: {
        total: Number(stats?.total ?? 0),
        ongoing: Number(stats?.ongoing ?? 0),
        completed: Number(stats?.completed ?? 0),
        totalFunding: Number(stats?.totalFunding ?? 0),
      },
    }
  },

  async getDepartmentsSummary(): Promise<AdminDepartmentPerformanceItem[]> {
    return getDepartmentPerformanceItems()
  },

  async getDepartmentDetail(
    query: AdminDepartmentDetailQuery
  ): Promise<AdminDepartmentDetailResponse> {
    const [summary, roster, complianceAnalytics] = await Promise.all([
      getDepartmentPerformanceItems().then((items) =>
        items.find((item) => item.department === query.department) ?? {
          department: query.department,
          label: getDepartmentLabel(query.department),
          facultyCount: 0,
          activeFacultyCount: 0,
          publicationsCount: 0,
          indexedPublicationsCount: 0,
          engagementsCount: 0,
          researchTitlesCount: 0,
          avgCompletionScore: 0,
        }
      ),
      this.getFacultyListPage({
        search: query.search,
        department: query.department,
        status: query.status,
        page: query.page,
        page_size: query.page_size,
      }),
      DecisionSupportService.getDepartmentAnalytics(query.department),
    ])
    const users = roster.items.filter((item) => item.recordType === 'user')
    const stats: AdminDepartmentDetailStats = {
      faculty: users.length,
      activeFaculty: users.filter((item) => item.access_status === 'active').length,
      inactiveFaculty: users.filter((item) => item.access_status === 'inactive').length,
      pendingInvites: roster.items.filter((item) => item.recordType === 'invite').length,
      incompleteProfiles: users.filter((item) => (item.completion_score ?? 0) < 100).length,
      facultyNeedingAction: users.filter((item) => item.access_status === 'inactive' || (item.completion_score ?? 0) < 100).length,
      facultyWithoutPublications: users.filter((item) => item.publications_count === 0).length,
      avgCompletion: summary.avgCompletionScore,
      readyForReporting: users.filter((item) => item.access_status === 'active' && (item.completion_score ?? 0) >= 100).length,
    }

    return {
      summary,
      roster,
      stats,
      complianceAnalytics,
    }
  },

  async getAnalyticsSummary(): Promise<AdminAnalyticsSummary> {
    const [publicationStats, researchCount, byYear, byType, departments, sdgRows, indexingRows] = await Promise.all([
      queryOne<RowDataPacket & { total: number; indexed: number }>(
        `
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN JSON_LENGTH(indexing) > 0 THEN 1 ELSE 0 END) AS indexed
          FROM publications
        `
      ),
      countRows('SELECT COUNT(*) AS count FROM research_titles'),
      queryRows<RowDataPacket & { year: number; count: number }>(
        'SELECT year, COUNT(*) AS count FROM publications GROUP BY year ORDER BY year DESC'
      ),
      queryRows<RowDataPacket & { type: string; count: number }>(
        'SELECT type, COUNT(*) AS count FROM publications GROUP BY type ORDER BY count DESC'
      ),
      getDepartmentPerformanceItems(),
      queryRows<RowDataPacket & { goal: string; count: number }>(
        `
          SELECT goals.goal, COUNT(*) AS count
          FROM publications AS p,
          JSON_TABLE(p.sdg_goals, '$[*]' COLUMNS(goal VARCHAR(32) PATH '$')) AS goals
          GROUP BY goals.goal
          ORDER BY count DESC
        `
      ).catch(() => []),
      queryRows<RowDataPacket & { name: string; count: number }>(
        `
          SELECT idx.name, COUNT(*) AS count
          FROM publications AS p,
          JSON_TABLE(p.indexing, '$[*]' COLUMNS(name VARCHAR(128) PATH '$')) AS idx
          GROUP BY idx.name
          ORDER BY count DESC
        `
      ).catch(() => []),
    ])
    const facultyCount = departments.reduce((sum, item) => sum + item.facultyCount, 0)

    return {
      totalPublications: Number(publicationStats?.total ?? 0),
      indexedPublications: Number(publicationStats?.indexed ?? 0),
      avgPublicationsPerFaculty: facultyCount
        ? Number(((Number(publicationStats?.total ?? 0) / facultyCount)).toFixed(1))
        : 0,
      totalResearchTitles: researchCount,
      publicationsByYear: byYear.map((row) => ({
        year: Number(row.year),
        publications: Number(row.count),
      })),
      publicationsByType: byType.map((row) => ({
        name: row.type,
        value: Number(row.count),
      })),
      departmentPerformance: departments,
      sdgDistribution: sdgRows.map((row) => ({
        goal: row.goal,
        count: Number(row.count),
      })),
      indexingDistribution: indexingRows.map((row) => ({
        name: row.name,
        count: Number(row.count),
      })),
    }
  },

  async getProfilePreview(userId: string) {
    return this.getFacultyDetail(userId)
  },

  async getExportRows(kind: AdminExportKind, options: { department?: Department | null } = {}) {
    const department = options.department ?? null
    const items = department ? await buildFacultyListItems(department) : await buildFacultyListItems()

    if (kind === 'faculty') {
      return items
        .filter((item) => item.recordType === 'user')
        .map((item) => ({
          faculty_name: item.name ?? '',
          email: item.email,
          department: item.department ?? '',
          specialization: item.specialization ?? '',
          employment_status: item.employment_status ?? '',
          access_status: item.access_status ?? '',
          roles: item.roles.join('; '),
          completion_score: item.completion_score ?? 0,
          education_count: item.education_count,
          publications_count: item.publications_count,
          indexed_publications_count: item.indexed_publications_count,
          engagements_count: item.engagements_count,
          research_titles_count: item.research_titles_count,
          last_login_at: item.last_login_at ?? '',
        } satisfies ExportRow))
    }

    if (kind === 'publications') {
      return (await this.listPublications())
        .filter((item) => !department || item.department === department)
        .map((item) => ({
          title: item.title,
          faculty_name: item.faculty_name,
          faculty_email: item.faculty_email,
          department: item.department ?? '',
          type: item.type,
          year: item.year,
          venue: item.venue,
          status: item.status ?? '',
          indexing: item.indexing.join('; '),
          sdg_goals: item.sdgGoals.join('; '),
          citations: item.citations,
          doi: item.doi,
          external_url: item.external_url ?? '',
          proof_path: item.proof_path ?? '',
        } satisfies ExportRow))
    }

    if (kind === 'engagements') {
      return (await this.listEngagements())
        .filter((item) => !department || item.department === department)
        .map((item) => ({
          title: item.title,
          faculty_name: item.faculty_name,
          faculty_email: item.faculty_email,
          department: item.department ?? '',
          organization: item.organization,
          type: item.type,
          status: item.status,
          start_date: item.startDate,
          end_date: item.endDate,
          beneficiaries: item.beneficiaries,
        } satisfies ExportRow))
    }

    return (await this.listResearchTitles())
      .filter((item) => !department || item.department === department)
      .map((item) => ({
        title: item.title,
        faculty_name: item.faculty_name,
        faculty_email: item.faculty_email,
        department: item.department ?? '',
        status: item.status,
        researchers: (item.researchers ?? []).join('; '),
        start_date: item.startDate ?? '',
        end_date: item.endDate ?? '',
        funding_source: item.fundingSource ?? '',
        funding_amount: item.fundingAmount ?? 0,
        progress: item.progress ?? 0,
        sdg_goals: (item.sdgGoals ?? []).join('; '),
      } satisfies ExportRow))
  },

  toCsv(rows: ExportRow[]) {
    return toCsv(rows)
  },
}
