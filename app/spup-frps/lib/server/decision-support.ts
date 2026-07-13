import {
  AccessStatus as DbAccessStatus,
  UserRole as DbUserRole,
} from '@/lib/db/enums'
import { DEPARTMENTS } from '@/lib/constants'
import {
  DECISION_SUPPORT_CONFIG_KEY,
  DEFAULT_DECISION_SUPPORT_CONFIG,
  cloneDecisionSupportConfig,
} from '@/lib/decision-support'
import { execute, jsonParam, parseJsonArray, parseJsonObject, queryOne, queryRows, type RowDataPacket } from '@/lib/db/mysql'
import { isIncompleteEducationEntry, isIncompleteEngagement, isIncompletePublication, isIncompleteResearchTitle } from '@/lib/record-completeness'
import { decisionSupportConfigSchema } from '@/lib/validation/decision-support'
import type {
  AdminDepartmentComplianceAnalytics,
  AdminDecisionSupportDepartmentItem,
  AdminDecisionSupportFacultyItem,
  AdminDecisionSupportPageData,
  AdminDecisionSupportSummary,
  DecisionSupportConfig,
  Department,
} from '@/lib/types'

type FacultyIssueCode =
  | 'inactive_account'
  | 'incomplete_profile'
  | 'missing_education'
  | 'publication_target_gap'
  | 'indexed_publication_gap'
  | 'engagement_target_gap'
  | 'research_target_gap'
  | 'stale_login'

type FacultySnapshot = Awaited<ReturnType<typeof getFacultySnapshot>>[number]
type FacultyDecisionSupportItem = AdminDecisionSupportFacultyItem & {
  issueCodes: FacultyIssueCode[]
}
type DecisionSupportDataset = {
  config: DecisionSupportConfig
  facultyItems: FacultyDecisionSupportItem[]
  departmentItems: AdminDecisionSupportDepartmentItem[]
  summary: AdminDecisionSupportSummary
}

const ISSUE_LABELS: Record<FacultyIssueCode, string> = {
  inactive_account: 'Inactive account',
  incomplete_profile: 'Incomplete profile',
  missing_education: 'Missing complete education',
  publication_target_gap: 'Publication target not met',
  indexed_publication_gap: 'Indexed publication target not met',
  engagement_target_gap: 'Engagement target not met',
  research_target_gap: 'Research target not met',
  stale_login: 'Stale login',
}

const FACULTY_ACTION_LABELS: Record<FacultyIssueCode, string> = {
  inactive_account: 'Reactivate account',
  incomplete_profile: 'Complete faculty profile',
  missing_education: 'Add complete education record',
  publication_target_gap: 'Improve publication record',
  indexed_publication_gap: 'Improve indexed publication output',
  engagement_target_gap: 'Record engagement activity',
  research_target_gap: 'Record research activity',
  stale_login: 'Follow up on participation',
}

const DEPARTMENT_ACTION_LABELS: Record<FacultyIssueCode, string> = {
  inactive_account: 'Review inactive faculty',
  incomplete_profile: 'Complete faculty profiles',
  missing_education: 'Complete education records',
  publication_target_gap: 'Improve publication completion',
  indexed_publication_gap: 'Improve indexed output',
  engagement_target_gap: 'Review engagement tracking',
  research_target_gap: 'Review research tracking',
  stale_login: 'Re-engage faculty participation',
}

function toDateOnly(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : ''
}

function getDepartmentLabel(department: Department) {
  return DEPARTMENTS.find((item) => item.value === department)?.label ?? department
}

function ratioToPercent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0
  }

  return Math.max(0, Math.min(1, numerator / denominator))
}

function getOverallSeverity(readinessScore: number, riskScore: number, config: DecisionSupportConfig) {
  if (
    riskScore >= config.bands.risk.high ||
    readinessScore < config.bands.readiness.medium
  ) {
    return 'high' as const
  }

  if (
    riskScore >= config.bands.risk.medium ||
    readinessScore < config.bands.readiness.high
  ) {
    return 'medium' as const
  }

  return 'low' as const
}

function getDaysSince(value: Date | null | undefined) {
  if (!value) {
    return Number.POSITIVE_INFINITY
  }

  return Math.floor((Date.now() - value.getTime()) / (1000 * 60 * 60 * 24))
}

async function ensureDecisionSupportConfigRecord() {
  const existing = await queryOne<RowDataPacket & {
    key: string
    value: unknown
    updatedAt: Date | string
  }>(
    'SELECT `key`, value, updated_at AS updatedAt FROM admin_settings WHERE `key` = ? LIMIT 1',
    [DECISION_SUPPORT_CONFIG_KEY]
  )

  if (existing) {
    return existing
  }

  await execute(
    'INSERT INTO admin_settings (`key`, value) VALUES (?, ?)',
    [DECISION_SUPPORT_CONFIG_KEY, jsonParam(DEFAULT_DECISION_SUPPORT_CONFIG)]
  )

  const created = await queryOne<RowDataPacket & {
    key: string
    value: unknown
    updatedAt: Date | string
  }>(
    'SELECT `key`, value, updated_at AS updatedAt FROM admin_settings WHERE `key` = ? LIMIT 1',
    [DECISION_SUPPORT_CONFIG_KEY]
  )

  if (!created) {
    throw new Error('Unable to create decision support settings.')
  }

  return created
}

async function getDecisionSupportConfigRecord() {
  const record = await ensureDecisionSupportConfigRecord()
  const value = parseJsonObject(record.value, DEFAULT_DECISION_SUPPORT_CONFIG)
  const parsed = decisionSupportConfigSchema.safeParse(value)

  if (parsed.success) {
    return {
      config: parsed.data,
      updatedAt: new Date(record.updatedAt).toISOString(),
    }
  }

  await execute(
    'UPDATE admin_settings SET value = ?, updated_by_user_id = NULL WHERE `key` = ?',
    [jsonParam(DEFAULT_DECISION_SUPPORT_CONFIG), DECISION_SUPPORT_CONFIG_KEY]
  )
  const reset = await ensureDecisionSupportConfigRecord()

  return {
    config: cloneDecisionSupportConfig(DEFAULT_DECISION_SUPPORT_CONFIG),
    updatedAt: new Date(reset.updatedAt).toISOString(),
  }
}

async function getFacultySnapshot() {
  const users = await queryRows<RowDataPacket & {
    id: string
    name: string
    email: string
    avatarUrl: string | null
    accessStatus: DbAccessStatus
    lastLoginAt: Date | string | null
    department: Department | null
    employmentStatus: string | null
  }>(
    `
      SELECT DISTINCT
        u.id,
        u.name,
        u.email,
        u.avatar_url AS avatarUrl,
        u.access_status AS accessStatus,
        u.last_login_at AS lastLoginAt,
        fp.department,
        fp.employment_status AS employmentStatus
      FROM users AS u
      INNER JOIN user_role_assignments AS ura ON ura.user_id = u.id
      LEFT JOIN faculty_profiles AS fp ON fp.user_id = u.id
      WHERE ura.role = ?
      ORDER BY u.name ASC
    `,
    [DbUserRole.faculty]
  )
  const userIds = users.map((user) => user.id)

  if (userIds.length === 0) {
    return []
  }

  const placeholders = userIds.map(() => '?').join(', ')
  const [educationRows, publicationRows, engagementRows, researchRows] = await Promise.all([
    queryRows<RowDataPacket & {
      userId: string
      degree: string
      field: string
      institution: string
      year: number
    }>(
      `
        SELECT user_id AS userId, degree, field, institution, year
        FROM education_entries
        WHERE user_id IN (${placeholders})
      `,
      userIds
    ),
    queryRows<RowDataPacket & {
      userId: string
      title: string
      venue: string
      year: number
      authors: unknown
      indexing: unknown
    }>(
      `
        SELECT user_id AS userId, title, venue, year, authors, indexing
        FROM publications
        WHERE user_id IN (${placeholders})
      `,
      userIds
    ),
    queryRows<RowDataPacket & {
      userId: string
      title: string
      organization: string
      startDate: Date | string
    }>(
      `
        SELECT user_id AS userId, title, organization, start_date AS startDate
        FROM engagements
        WHERE user_id IN (${placeholders})
      `,
      userIds
    ),
    queryRows<RowDataPacket & {
      userId: string
      title: string
      startDate: Date | string
      researchers: unknown
    }>(
      `
        SELECT user_id AS userId, title, start_date AS startDate, researchers
        FROM research_titles
        WHERE user_id IN (${placeholders})
      `,
      userIds
    ),
  ])

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    accessStatus: user.accessStatus,
    lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
    facultyProfile: {
      department: user.department,
      employmentStatus: user.employmentStatus,
    },
    education: educationRows
      .filter((row) => row.userId === user.id)
      .map((row) => ({
        degree: row.degree,
        field: row.field,
        institution: row.institution,
        year: Number(row.year),
      })),
    publications: publicationRows
      .filter((row) => row.userId === user.id)
      .map((row) => ({
        title: row.title,
        venue: row.venue,
        year: Number(row.year),
        authors: parseJsonArray(row.authors),
        indexing: parseJsonArray(row.indexing),
      })),
    engagements: engagementRows
      .filter((row) => row.userId === user.id)
      .map((row) => ({
        title: row.title,
        organization: row.organization,
        startDate: new Date(row.startDate),
      })),
    researchTitles: researchRows
      .filter((row) => row.userId === user.id)
      .map((row) => ({
        title: row.title,
        startDate: new Date(row.startDate),
        researchers: parseJsonArray(row.researchers),
      })),
  }))
}

function getFacultyMetrics(user: FacultySnapshot, config: DecisionSupportConfig) {
  const profileComplete = Boolean(
    user.facultyProfile?.department && user.facultyProfile?.employmentStatus
  )
  const completeEducationCount = user.education.filter((entry) => !isIncompleteEducationEntry(entry)).length
  const completePublicationCount = user.publications.filter((publication) => !isIncompletePublication(publication)).length
  const indexedPublicationCount = user.publications.filter(
    (publication) => !isIncompletePublication(publication) && publication.indexing.length > 0
  ).length
  const completeEngagementCount = user.engagements.filter(
    (engagement) =>
      !isIncompleteEngagement({
        title: engagement.title,
        organization: engagement.organization,
        startDate: toDateOnly(engagement.startDate),
      })
  ).length
  const completeResearchCount = user.researchTitles.filter(
    (researchTitle) =>
      !isIncompleteResearchTitle({
        title: researchTitle.title,
        startDate: toDateOnly(researchTitle.startDate),
        researchers: researchTitle.researchers,
      })
  ).length
  const isActive = user.accessStatus === DbAccessStatus.active
  const isStaleLogin = getDaysSince(user.lastLoginAt) >= config.thresholds.staleLoginDays
  const readinessWeightTotal = Object.values(config.readinessWeights).reduce(
    (sum, weight) => sum + weight,
    0
  )
  const riskWeightTotal = Object.values(config.riskWeights).reduce((sum, weight) => sum + weight, 0)

  const readinessEarned =
    (isActive ? config.readinessWeights.activeAccount : 0) +
    (profileComplete ? config.readinessWeights.profileComplete : 0) +
    (completeEducationCount > 0 ? config.readinessWeights.educationComplete : 0) +
    ratioToPercent(completePublicationCount, config.thresholds.publicationTarget) *
      config.readinessWeights.publicationTargetMet +
    ratioToPercent(indexedPublicationCount, config.thresholds.indexedPublicationTarget) *
      config.readinessWeights.indexedPublicationTargetMet +
    ratioToPercent(completeEngagementCount, config.thresholds.engagementTarget) *
      config.readinessWeights.engagementTargetMet +
    ratioToPercent(completeResearchCount, config.thresholds.researchTarget) *
      config.readinessWeights.researchTargetMet

  const riskTriggered = {
    inactive_account: !isActive,
    incomplete_profile: !profileComplete,
    missing_education: completeEducationCount === 0,
    publication_target_gap: completePublicationCount === 0,
    indexed_publication_gap: indexedPublicationCount === 0,
    engagement_target_gap: completeEngagementCount === 0,
    research_target_gap: completeResearchCount === 0,
    stale_login: isStaleLogin,
  } as const

  const riskEarned =
    (riskTriggered.inactive_account ? config.riskWeights.inactiveAccount : 0) +
    (riskTriggered.incomplete_profile ? config.riskWeights.incompleteProfile : 0) +
    (riskTriggered.publication_target_gap ? config.riskWeights.noPublications : 0) +
    (riskTriggered.indexed_publication_gap ? config.riskWeights.noIndexedPublications : 0) +
    (riskTriggered.engagement_target_gap ? config.riskWeights.noEngagements : 0) +
    (riskTriggered.research_target_gap ? config.riskWeights.noResearch : 0) +
    (riskTriggered.stale_login ? config.riskWeights.staleLogin : 0)

  const readinessScore = readinessWeightTotal > 0
    ? Math.round((readinessEarned / readinessWeightTotal) * 100)
    : 0
  const riskScore = riskWeightTotal > 0 ? Math.round((riskEarned / riskWeightTotal) * 100) : 0

  const issueCodes: FacultyIssueCode[] = []
  const reasons: string[] = []

  if (riskTriggered.inactive_account) {
    issueCodes.push('inactive_account')
    reasons.push('Account is inactive.')
  }

  if (riskTriggered.incomplete_profile) {
    issueCodes.push('incomplete_profile')
    reasons.push('Profile is incomplete.')
  }

  if (riskTriggered.missing_education) {
    issueCodes.push('missing_education')
    reasons.push('No complete education record is available.')
  }

  if (completePublicationCount < config.thresholds.publicationTarget) {
    issueCodes.push('publication_target_gap')
    reasons.push(
      completePublicationCount === 0
        ? 'No complete publications are recorded.'
        : `Publication target not met (${completePublicationCount}/${config.thresholds.publicationTarget}).`
    )
  }

  if (indexedPublicationCount < config.thresholds.indexedPublicationTarget) {
    issueCodes.push('indexed_publication_gap')
    reasons.push(
      indexedPublicationCount === 0
        ? 'No indexed publications are recorded.'
        : `Indexed publication target not met (${indexedPublicationCount}/${config.thresholds.indexedPublicationTarget}).`
    )
  }

  if (completeEngagementCount < config.thresholds.engagementTarget) {
    issueCodes.push('engagement_target_gap')
    reasons.push(
      completeEngagementCount === 0
        ? 'No complete engagements are recorded.'
        : `Engagement target not met (${completeEngagementCount}/${config.thresholds.engagementTarget}).`
    )
  }

  if (completeResearchCount < config.thresholds.researchTarget) {
    issueCodes.push('research_target_gap')
    reasons.push(
      completeResearchCount === 0
        ? 'No complete research titles are recorded.'
        : `Research target not met (${completeResearchCount}/${config.thresholds.researchTarget}).`
    )
  }

  if (riskTriggered.stale_login) {
    issueCodes.push('stale_login')
    reasons.push(`No sign-in has been recorded within ${config.thresholds.staleLoginDays} days.`)
  }

  if (reasons.length === 0) {
    reasons.push('All configured reporting targets are currently met.')
  }

  const priorityOrder: FacultyIssueCode[] = [
    'inactive_account',
    'incomplete_profile',
    'missing_education',
    'publication_target_gap',
    'indexed_publication_gap',
    'engagement_target_gap',
    'research_target_gap',
    'stale_login',
  ]

  const nextIssue = priorityOrder.find((code) => issueCodes.includes(code))
  const severity = getOverallSeverity(readinessScore, riskScore, config)

  return {
    issueCodes,
    reasons,
    readinessScore,
    riskScore,
    severity,
    nextActionLabel: nextIssue ? FACULTY_ACTION_LABELS[nextIssue] : 'Ready for reporting',
  }
}

function sortFacultyItems(
  left: Pick<AdminDecisionSupportFacultyItem, 'riskScore' | 'readinessScore' | 'name'>,
  right: Pick<AdminDecisionSupportFacultyItem, 'riskScore' | 'readinessScore' | 'name'>
) {
  return (
    right.riskScore - left.riskScore ||
    left.readinessScore - right.readinessScore ||
    left.name.localeCompare(right.name)
  )
}

function sortDepartmentItems(
  left: Pick<AdminDecisionSupportDepartmentItem, 'riskScore' | 'readinessScore' | 'label'>,
  right: Pick<AdminDecisionSupportDepartmentItem, 'riskScore' | 'readinessScore' | 'label'>
) {
  return (
    right.riskScore - left.riskScore ||
    left.readinessScore - right.readinessScore ||
    left.label.localeCompare(right.label)
  )
}

function buildDepartmentItems(
  facultyItems: FacultyDecisionSupportItem[],
  config: DecisionSupportConfig
) {
  const itemsByDepartment = new Map<Department, FacultyDecisionSupportItem[]>()

  for (const item of facultyItems) {
    if (!item.department) {
      continue
    }

    const rows = itemsByDepartment.get(item.department) ?? []
    rows.push(item)
    itemsByDepartment.set(item.department, rows)
  }

  return Array.from(itemsByDepartment.entries())
    .map(([department, items]) => {
      const blockerCounts = new Map<FacultyIssueCode, number>()

      for (const item of items) {
        const uniqueCodes = new Set(item.issueCodes)
        for (const code of uniqueCodes) {
          blockerCounts.set(code, (blockerCounts.get(code) ?? 0) + 1)
        }
      }

      const topIssueEntries = Array.from(blockerCounts.entries()).sort(
        (left, right) => right[1] - left[1] || ISSUE_LABELS[left[0]].localeCompare(ISSUE_LABELS[right[0]])
      )
      const topIssueCode = topIssueEntries[0]?.[0]
      const readinessScore = Math.round(
        items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length
      )
      const riskScore = Math.round(items.reduce((sum, item) => sum + item.riskScore, 0) / items.length)

      return {
        department,
        label: getDepartmentLabel(department),
        facultyCount: items.length,
        readinessScore,
        riskScore,
        severity: getOverallSeverity(readinessScore, riskScore, config),
        topBlockers: topIssueEntries.slice(0, 3).map(([code, count]) => `${ISSUE_LABELS[code]} (${count})`),
        nextActionLabel: topIssueCode ? DEPARTMENT_ACTION_LABELS[topIssueCode] : 'Open department workspace',
        href: `/admin/departments/${department}`,
      } satisfies AdminDecisionSupportDepartmentItem
    })
    .sort(sortDepartmentItems)
}

function buildSummary(
  facultyItems: AdminDecisionSupportFacultyItem[],
  departmentItems: AdminDecisionSupportDepartmentItem[],
  config: DecisionSupportConfig
): AdminDecisionSupportSummary {
  return {
    highRiskFacultyCount: facultyItems.filter(
      (item) => item.riskScore >= config.bands.risk.high
    ).length,
    lowReadinessFacultyCount: facultyItems.filter(
      (item) => item.readinessScore < config.bands.readiness.medium
    ).length,
    departmentsNeedingIntervention: departmentItems.filter((item) => item.severity !== 'low').length,
    averageReadinessScore: facultyItems.length
      ? Math.round(facultyItems.reduce((sum, item) => sum + item.readinessScore, 0) / facultyItems.length)
      : 0,
    topFaculty: [...facultyItems].sort(sortFacultyItems).slice(0, config.dashboard.facultyLimit),
    topDepartments: [...departmentItems]
      .sort(sortDepartmentItems)
      .slice(0, config.dashboard.departmentLimit),
  }
}

function buildFacultyItems(users: FacultySnapshot[], config: DecisionSupportConfig): FacultyDecisionSupportItem[] {
  return users
    .map((user) => {
      const metrics = getFacultyMetrics(user, config)

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.facultyProfile?.department ?? null,
        avatarUrl: user.avatarUrl ?? null,
        accessStatus: user.accessStatus,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        readinessScore: metrics.readinessScore,
        riskScore: metrics.riskScore,
        severity: metrics.severity,
        reasons: metrics.reasons,
        nextActionLabel: metrics.nextActionLabel,
        href: `/admin/faculty/${user.id}`,
        issueCodes: metrics.issueCodes,
      }
    })
    .sort(sortFacultyItems)
}

function toPageFacultyItems(facultyItems: FacultyDecisionSupportItem[]): AdminDecisionSupportFacultyItem[] {
  return facultyItems.map((item) => ({
    id: item.id,
    name: item.name,
    email: item.email,
    department: item.department,
    avatarUrl: item.avatarUrl,
    accessStatus: item.accessStatus,
    lastLoginAt: item.lastLoginAt,
    readinessScore: item.readinessScore,
    riskScore: item.riskScore,
    severity: item.severity,
    reasons: item.reasons,
    nextActionLabel: item.nextActionLabel,
    href: item.href,
  }))
}

function buildDepartmentComplianceAnalytics(
  department: Department,
  dataset: DecisionSupportDataset
): AdminDepartmentComplianceAnalytics {
  const departmentSummary = dataset.departmentItems.find((item) => item.department === department)
  const faculty = dataset.facultyItems.filter((item) => item.department === department)

  return {
    summary: {
      complianceScore: departmentSummary?.readinessScore ?? 0,
      priorityScore: departmentSummary?.riskScore ?? 0,
      severity: departmentSummary?.severity ?? 'low',
      highPriorityFacultyCount: faculty.filter(
        (item) => item.riskScore >= dataset.config.bands.risk.high
      ).length,
      lowComplianceFacultyCount: faculty.filter(
        (item) => item.readinessScore < dataset.config.bands.readiness.medium
      ).length,
    },
    faculty: faculty.slice(0, 5).map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      avatarUrl: item.avatarUrl,
      accessStatus: item.accessStatus,
      lastLoginAt: item.lastLoginAt,
      complianceScore: item.readinessScore,
      priorityScore: item.riskScore,
      severity: item.severity,
      href: item.href,
    })),
  }
}

async function getDecisionSupportDataset(): Promise<DecisionSupportDataset> {
  const [{ config }, users] = await Promise.all([
    getDecisionSupportConfigRecord(),
    getFacultySnapshot(),
  ])

  const facultyItems = buildFacultyItems(users, config)
  const departmentItems = buildDepartmentItems(facultyItems, config)

  return {
    config,
    facultyItems,
    departmentItems,
    summary: buildSummary(facultyItems, departmentItems, config),
  }
}

function buildScopedSummary(
  dataset: DecisionSupportDataset,
  department?: Department
): AdminDecisionSupportSummary {
  if (!department) {
    return dataset.summary
  }

  const facultyItems = dataset.facultyItems.filter((item) => item.department === department)
  const departmentItems = dataset.departmentItems.filter((item) => item.department === department)

  return buildSummary(facultyItems, departmentItems, dataset.config)
}

export const DecisionSupportService = {
  getDefaultConfig() {
    return cloneDecisionSupportConfig(DEFAULT_DECISION_SUPPORT_CONFIG)
  },

  async getConfig(): Promise<DecisionSupportConfig> {
    const { config } = await getDecisionSupportConfigRecord()
    return config
  },

  async updateConfig(updatedByUserId: string, payload: DecisionSupportConfig): Promise<DecisionSupportConfig> {
    const config = decisionSupportConfigSchema.parse(payload)

    await execute(
      `
        INSERT INTO admin_settings (\`key\`, value, updated_by_user_id)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          value = VALUES(value),
          updated_by_user_id = VALUES(updated_by_user_id)
      `,
      [DECISION_SUPPORT_CONFIG_KEY, jsonParam(config), updatedByUserId]
    )

    return config
  },

  async getPageData(): Promise<AdminDecisionSupportPageData> {
    const dataset = await getDecisionSupportDataset()

    return {
      summary: dataset.summary,
      faculty: toPageFacultyItems(dataset.facultyItems),
      departments: dataset.departmentItems,
      config: dataset.config,
    }
  },

  async getDepartmentAnalytics(department: Department): Promise<AdminDepartmentComplianceAnalytics> {
    const dataset = await getDecisionSupportDataset()
    return buildDepartmentComplianceAnalytics(department, dataset)
  },

  async getSummary(department?: Department): Promise<AdminDecisionSupportSummary> {
    const dataset = await getDecisionSupportDataset()
    return buildScopedSummary(dataset, department)
  },
}
