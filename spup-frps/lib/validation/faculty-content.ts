import { z } from 'zod'

const uuidSchema = z.string().uuid()
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format.')
const nonEmptyStringSchema = z.string().trim().min(1, 'This field is required.')
const optionalTrimmedStringSchema = z
  .string()
  .trim()
  .max(5000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
const optionalShortQueryStringSchema = z
  .string()
  .trim()
  .max(255)
  .optional()
  .or(z.literal(''))
  .transform((value) => (value && value.length > 0 ? value : undefined))
const optionalUrlSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine((value) => !value || /^https?:\/\/.+/i.test(value), 'Enter a valid URL.')
const pageQuerySchema = z.coerce.number().int().min(1).max(10_000).optional().default(1)
const pageSizeQuerySchema = z.coerce.number().int().min(1).max(100).optional().default(20)

const departmentValues = ['SASTE', 'SITE', 'SBHAM', 'SNAHS', 'SOM', 'BEU', 'CF', 'KIRN', 'GUIDANCE'] as const
const employmentStatusValues = ['full-time', 'part-time', 'contract', 'emeritus'] as const
const publicationTypeValues = [
  'journal',
  'conference',
  'book',
  'chapter',
  'patent',
  'other',
  'journal_article',
  'conference_paper',
  'book_chapter',
  'review_article',
  'creative_work',
] as const
const publicationStatusValues = ['published', 'accepted', 'submitted', 'in_press'] as const
const publicationQuartileValues = ['q1', 'q2', 'q3', 'q4', 'na'] as const
const publicationFacultyRoleValues = [
  'first_author',
  'co_author',
  'corresponding_author',
  'sole_author',
] as const
const userRoleValues = ['faculty', 'secondary-admin', 'main-admin'] as const
const adminRoleValues = ['secondary-admin', 'main-admin'] as const
const engagementTypeValues = [
  'consulting',
  'training',
  'community_service',
  'industry_partnership',
  'policy_advisory',
  'other',
] as const
const engagementStatusValues = ['ongoing', 'completed', 'planned'] as const
const researchStatusValues = ['proposed', 'ongoing', 'completed', 'published'] as const
const accessStatusValues = ['active', 'inactive'] as const
const adminFacultyStatusValues = ['active', 'pending', 'inactive', 'all'] as const
const indexingValues = [
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
] as const
const sdgValues = [
  'SDG1',
  'SDG2',
  'SDG3',
  'SDG4',
  'SDG5',
  'SDG6',
  'SDG7',
  'SDG8',
  'SDG9',
  'SDG10',
  'SDG11',
  'SDG12',
  'SDG13',
  'SDG14',
  'SDG15',
  'SDG16',
  'SDG17',
] as const

const engagementDateSchema = dateOnlySchema.refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`)

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}, 'Enter a valid date.')

const optionalNonNegativeIntegerSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') {
    return undefined
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim()

    if (!normalizedValue) {
      return undefined
    }

    const parsedValue = Number(normalizedValue)
    return Number.isFinite(parsedValue) ? parsedValue : value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  return value
}, z.number().int().min(0).optional())

export const adminProfilePatchSchema = z.object({
  name: nonEmptyStringSchema.max(255).optional(),
  department: z.enum(departmentValues).nullable().optional(),
  specialization: optionalTrimmedStringSchema.nullable().optional(),
  employment_status: z.enum(employmentStatusValues).nullable().optional(),
  photo_path: z.string().trim().max(1000).nullable().optional(),
  banner_path: z.string().trim().max(1000).nullable().optional(),
})

export const profileUpdatePayloadSchema = adminProfilePatchSchema

export const facultyInvitePayloadSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  name: optionalTrimmedStringSchema.nullable().optional(),
  department: z.enum(departmentValues).nullable().optional(),
  employment_status: z.enum(employmentStatusValues).nullable().optional(),
  roles: z.array(z.enum(userRoleValues)).optional(),
})

export const adminUserCreatePayloadSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  role: z.enum(adminRoleValues),
  includeFaculty: z.boolean().optional().default(false),
})

export const adminUserUpdatePayloadSchema = z.object({
  role: z.enum(adminRoleValues),
  includeFaculty: z.boolean().optional(),
})

export const accessStatusPatchSchema = z.object({
  access_status: z.enum(accessStatusValues),
})

export const userPreferencesPatchSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  deadlineReminders: z.boolean().optional(),
  systemUpdates: z.boolean().optional(),
  markInitialPromptSeen: z.boolean().optional(),
})

export const pushSubscriptionPayloadSchema = z.object({
  endpoint: z.string().trim().url('Enter a valid push subscription endpoint.'),
  keys: z.object({
    p256dh: nonEmptyStringSchema.max(1000),
    auth: nonEmptyStringSchema.max(1000),
  }),
  userAgent: optionalTrimmedStringSchema.nullable().optional(),
})

export const pushSubscriptionDeleteSchema = z.object({
  endpoint: z.string().trim().url('Enter a valid push subscription endpoint.'),
})

export const adminBroadcastPayloadSchema = z.object({
  title: nonEmptyStringSchema.max(120),
  message: nonEmptyStringSchema.max(500),
})

export const notificationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  unread_only: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
})

export const notificationReadPayloadSchema = z
  .object({
    ids: z.array(uuidSchema).optional().default([]),
    markAll: z.boolean().optional().default(false),
  })
  .refine((value) => value.markAll || value.ids.length > 0, {
    message: 'Select at least one notification to update.',
    path: ['ids'],
  })

export const adminFacultyListQuerySchema = z.object({
  search: optionalShortQueryStringSchema,
  department: z.enum([...departmentValues, 'all']).optional().default('all'),
  status: z.enum(adminFacultyStatusValues).optional().default('all'),
  page: pageQuerySchema,
  page_size: pageSizeQuerySchema,
})

export const adminPublicationListQuerySchema = z.object({
  search: optionalShortQueryStringSchema,
  type: z.enum([...publicationTypeValues, 'all']).optional().default('all'),
  year: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Use a four-digit year.')
    .optional()
    .or(z.literal('all'))
    .or(z.literal(''))
    .transform((value) => (value && value !== 'all' ? value : 'all')),
  indexing: z.enum([...indexingValues, 'all', 'non-indexed']).optional().default('all'),
  page: pageQuerySchema,
  page_size: pageSizeQuerySchema,
})

export const adminEngagementListQuerySchema = z.object({
  search: optionalShortQueryStringSchema,
  type: z.enum([...engagementTypeValues, 'all']).optional().default('all'),
  status: z.enum([...engagementStatusValues, 'all']).optional().default('all'),
  page: pageQuerySchema,
  page_size: pageSizeQuerySchema,
})

export const adminResearchListQuerySchema = z.object({
  search: optionalShortQueryStringSchema,
  status: z.enum([...researchStatusValues, 'all']).optional().default('all'),
  page: pageQuerySchema,
  page_size: pageSizeQuerySchema,
})

export const adminDepartmentDetailQuerySchema = z.object({
  search: optionalShortQueryStringSchema,
  status: z.enum(adminFacultyStatusValues).optional().default('all'),
  page: pageQuerySchema,
  page_size: pageSizeQuerySchema,
})

export const educationPayloadSchema = z.object({
  id: uuidSchema.optional(),
  degree: nonEmptyStringSchema.max(255),
  field: nonEmptyStringSchema.max(255),
  institution: nonEmptyStringSchema.max(255),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  display_order: z.number().int().min(0).optional(),
})

export const publicationPayloadSchema = z
  .object({
    id: uuidSchema.optional(),
    title: nonEmptyStringSchema.max(500),
    type: z.enum(publicationTypeValues),
    authors: z.array(nonEmptyStringSchema.max(255)).optional().default([]),
    co_author_user_ids: z.array(uuidSchema).optional().default([]),
    co_author_contributions: z
      .array(z.object({
        user_id: uuidSchema,
        faculty_role: z.enum(publicationFacultyRoleValues).default('co_author'),
      }))
      .optional()
      .default([]),
    author_count: z.number().int().min(1).max(1000),
    year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
    venue: nonEmptyStringSchema.max(500),
    volume: optionalShortQueryStringSchema,
    issue: optionalShortQueryStringSchema,
    page_numbers: optionalShortQueryStringSchema,
    doi: optionalTrimmedStringSchema,
    abstract: optionalTrimmedStringSchema,
    status: z.enum(publicationStatusValues).default('published'),
    indexing: z.array(z.enum(indexingValues)).max(1, 'Select one indexing status.').default([]),
    quartile_ranking: z.enum(publicationQuartileValues).nullable().optional().default('na'),
    open_access: z.boolean().nullable().optional(),
    faculty_role: z.enum(publicationFacultyRoleValues).nullable().optional(),
    is_lead_corresponding: z.boolean().nullable().optional(),
    institution_affiliated: z.boolean().default(true),
    sdgGoals: z.array(z.enum(sdgValues)).optional().default([]),
    citations: z.number().int().min(0).optional(),
    external_url: optionalUrlSchema.nullable().optional(),
    proof_path: z.string().trim().max(1000).nullable().optional(),
    display_order: z.number().int().min(0).optional(),
  })
  .superRefine((value, context) => {
    if ((value.indexing?.length ?? 0) === 0 && value.quartile_ranking && value.quartile_ranking !== 'na') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Quartile ranking must be N/A for non-indexed publications.',
        path: ['quartile_ranking'],
      })
    }
  })

export const engagementPayloadSchema = z
  .object({
    id: uuidSchema.optional(),
    title: nonEmptyStringSchema.max(500),
    type: z.enum(engagementTypeValues),
    organization: nonEmptyStringSchema.max(500),
    status: z.enum(engagementStatusValues),
    startDate: engagementDateSchema,
    endDate: engagementDateSchema.optional().or(z.literal('')).transform((value) => value || undefined),
    description: optionalTrimmedStringSchema,
    beneficiaries: optionalNonNegativeIntegerSchema,
    certificate_path: z.string().trim().max(1000).nullable().optional(),
    display_order: z.number().int().min(0).optional(),
  })
  .superRefine((value, context) => {
    if (value.endDate && value.endDate < value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be on or after the start date.',
        path: ['endDate'],
      })
    }
  })

export const researchTitlePayloadSchema = z
  .object({
    id: uuidSchema.optional(),
    title: nonEmptyStringSchema.max(500),
    status: z.enum(researchStatusValues),
    researchers: z.array(nonEmptyStringSchema.max(255)).min(1, 'Add at least one researcher.'),
    startDate: dateOnlySchema,
    endDate: dateOnlySchema.optional().or(z.literal('')).transform((value) => value || undefined),
    fundingSource: optionalTrimmedStringSchema,
    fundingAmount: z.number().min(0).optional(),
    description: optionalTrimmedStringSchema,
    progress: z.number().min(0).max(100).optional(),
    sdgGoals: z.array(z.enum(sdgValues)).optional(),
    paper_path: z.string().trim().max(1000).nullable().optional(),
    display_order: z.number().int().min(0).optional(),
  })
  .superRefine((value, context) => {
    if (value.endDate && value.endDate < value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be on or after the start date.',
        path: ['endDate'],
      })
    }
  })
