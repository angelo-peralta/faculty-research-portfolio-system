import { z } from 'zod'

const nonNegativeIntegerSchema = z.coerce.number().int().min(0)
const positiveIntegerSchema = z.coerce.number().int().min(1)
const scoreBandSchema = z.object({
  medium: z.coerce.number().int().min(0).max(100),
  high: z.coerce.number().int().min(0).max(100),
})

export const decisionSupportConfigSchema = z
  .object({
    readinessWeights: z.object({
      activeAccount: nonNegativeIntegerSchema,
      profileComplete: nonNegativeIntegerSchema,
      educationComplete: nonNegativeIntegerSchema,
      publicationTargetMet: nonNegativeIntegerSchema,
      indexedPublicationTargetMet: nonNegativeIntegerSchema,
      engagementTargetMet: nonNegativeIntegerSchema,
      researchTargetMet: nonNegativeIntegerSchema,
    }),
    riskWeights: z.object({
      inactiveAccount: nonNegativeIntegerSchema,
      incompleteProfile: nonNegativeIntegerSchema,
      noPublications: nonNegativeIntegerSchema,
      noIndexedPublications: nonNegativeIntegerSchema,
      noEngagements: nonNegativeIntegerSchema,
      noResearch: nonNegativeIntegerSchema,
      staleLogin: nonNegativeIntegerSchema,
    }),
    thresholds: z.object({
      publicationTarget: positiveIntegerSchema,
      indexedPublicationTarget: positiveIntegerSchema,
      engagementTarget: positiveIntegerSchema,
      researchTarget: positiveIntegerSchema,
      staleLoginDays: positiveIntegerSchema,
    }),
    bands: z.object({
      readiness: scoreBandSchema,
      risk: scoreBandSchema,
    }),
    dashboard: z.object({
      facultyLimit: positiveIntegerSchema,
      departmentLimit: positiveIntegerSchema,
    }),
  })
  .superRefine((value, context) => {
    const readinessTotal = Object.values(value.readinessWeights).reduce((sum, weight) => sum + weight, 0)
    const riskTotal = Object.values(value.riskWeights).reduce((sum, weight) => sum + weight, 0)

    if (readinessTotal <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one compliance weight must be greater than zero.',
        path: ['readinessWeights'],
      })
    }

    if (riskTotal <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one priority weight must be greater than zero.',
        path: ['riskWeights'],
      })
    }

    if (value.bands.readiness.medium >= value.bands.readiness.high) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Compliance medium must be lower than compliance high.',
        path: ['bands', 'readiness', 'medium'],
      })
    }

    if (value.bands.risk.medium >= value.bands.risk.high) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Priority medium must be lower than priority high.',
        path: ['bands', 'risk', 'medium'],
      })
    }
  })
