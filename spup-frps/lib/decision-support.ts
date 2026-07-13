import type { DecisionSupportConfig } from '@/lib/types'

export const DECISION_SUPPORT_CONFIG_KEY = 'decision-support'

export const DEFAULT_DECISION_SUPPORT_CONFIG: DecisionSupportConfig = {
  readinessWeights: {
    activeAccount: 20,
    profileComplete: 20,
    educationComplete: 10,
    publicationTargetMet: 20,
    indexedPublicationTargetMet: 10,
    engagementTargetMet: 10,
    researchTargetMet: 10,
  },
  riskWeights: {
    inactiveAccount: 25,
    incompleteProfile: 20,
    noPublications: 20,
    noIndexedPublications: 10,
    noEngagements: 5,
    noResearch: 5,
    staleLogin: 15,
  },
  thresholds: {
    publicationTarget: 1,
    indexedPublicationTarget: 1,
    engagementTarget: 1,
    researchTarget: 1,
    staleLoginDays: 90,
  },
  bands: {
    readiness: {
      medium: 50,
      high: 80,
    },
    risk: {
      medium: 30,
      high: 60,
    },
  },
  dashboard: {
    facultyLimit: 5,
    departmentLimit: 3,
  },
}

export const DECISION_SUPPORT_READINESS_FIELDS: Array<{
  key: keyof DecisionSupportConfig['readinessWeights']
  label: string
}> = [
  { key: 'activeAccount', label: 'Active account' },
  { key: 'profileComplete', label: 'Profile complete' },
  { key: 'educationComplete', label: 'Education complete' },
  { key: 'publicationTargetMet', label: 'Publication target met' },
  { key: 'indexedPublicationTargetMet', label: 'Indexed publication target met' },
  { key: 'engagementTargetMet', label: 'Engagement target met' },
  { key: 'researchTargetMet', label: 'Research target met' },
]

export const DECISION_SUPPORT_RISK_FIELDS: Array<{
  key: keyof DecisionSupportConfig['riskWeights']
  label: string
}> = [
  { key: 'inactiveAccount', label: 'Inactive account' },
  { key: 'incompleteProfile', label: 'Incomplete profile' },
  { key: 'noPublications', label: 'No publications' },
  { key: 'noIndexedPublications', label: 'No indexed publications' },
  { key: 'noEngagements', label: 'No engagements' },
  { key: 'noResearch', label: 'No research' },
  { key: 'staleLogin', label: 'Stale login' },
]

export function cloneDecisionSupportConfig(config: DecisionSupportConfig): DecisionSupportConfig {
  return JSON.parse(JSON.stringify(config)) as DecisionSupportConfig
}
